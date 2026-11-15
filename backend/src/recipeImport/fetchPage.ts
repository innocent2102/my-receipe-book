import { lookup } from 'dns/promises';
import { isIP } from 'net';

/** Raised for any user-visible import failure; `status` becomes the HTTP status. */
export class ImportError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

function ipv4IsPrivate(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function ipv6IsPrivate(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === '::' || addr === '::1') return true;
  if (addr.startsWith('fe80') || addr.startsWith('fc') || addr.startsWith('fd')) return true;
  // IPv4-mapped addresses such as ::ffff:127.0.0.1
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4IsPrivate(mapped[1]);
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4IsPrivate(ip);
  if (version === 6) return ipv6IsPrivate(ip);
  return true;
}

/**
 * SSRF guard. Users submit arbitrary URLs, so every hop must be an http(s) URL that
 * resolves exclusively to public addresses before we are willing to request it.
 */
async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ImportError('Only http and https links are supported', 400, 'unsupported_protocol');
  }

  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(literal)) {
    if (isPrivateAddress(literal)) {
      throw new ImportError('That address is not reachable', 400, 'blocked_address');
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    throw new ImportError('Could not resolve that address', 400, 'dns_failed');
  }

  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new ImportError('That address is not reachable', 400, 'blocked_address');
  }
}

/** Reads at most MAX_BYTES so a huge or endless response cannot exhaust memory. */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new ImportError('That page is too large to import', 413, 'too_large');
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export type FetchedPage = {
  html: string;
  /** Final URL after redirects, used as the recipe source. */
  url: string;
};

/** Downloads a page, validating the target before every redirect hop. */
export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new ImportError('That does not look like a valid link', 400, 'invalid_url');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicUrl(url);

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          // Identify ourselves honestly; some sites block unknown clients.
          'User-Agent':
            'MyRecipeBook/1.0 (+recipe import; https://github.com/innocent2102/my-receipe-book)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en,pl;q=0.9',
        },
      });
    } catch {
      throw new ImportError('Could not open that page', 502, 'fetch_failed');
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        throw new ImportError('Could not open that page', 502, 'fetch_failed');
      }
      url = new URL(location, url);
      continue;
    }

    if (!res.ok) {
      throw new ImportError(
        res.status === 404 ? 'That page was not found' : 'Could not open that page',
        res.status === 404 ? 404 : 502,
        'fetch_failed'
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType && !/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
      throw new ImportError('That link is not a web page', 415, 'unsupported_content');
    }

    return { html: await readCapped(res), url: url.toString() };
  }

  throw new ImportError('That page redirects too many times', 502, 'too_many_redirects');
}
