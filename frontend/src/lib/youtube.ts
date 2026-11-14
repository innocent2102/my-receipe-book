/** Helpers for storing a YouTube link on a recipe and embedding it safely. */

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
]);

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

/** Returns the 11-character video id for any common YouTube URL shape, else null. */
export function extractYouTubeId(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const candidate =
    host === 'youtu.be'
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get('v') ??
        parsed.pathname.replace(/^\/(embed|v|shorts|live)\//, '');

  const id = candidate?.split('/')[0] ?? '';
  return VIDEO_ID_PATTERN.test(id) ? id : null;
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

export function youTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
