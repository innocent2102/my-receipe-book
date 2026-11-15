import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { recipesBackendBaseUrl, recipesProxyHeaders } from '@/lib/recipesBackend';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Uploads a recipe photo as raw bytes and returns the address to store on the recipe. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { success: false, error: 'Unsupported image type', code: 'unsupported_type' },
      { status: 415 }
    );
  }

  const body = await req.arrayBuffer();
  if (body.byteLength === 0) {
    return NextResponse.json(
      { success: false, error: 'Empty image', code: 'empty' },
      { status: 400 }
    );
  }
  if (body.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { success: false, error: 'Image is too large', code: 'too_large' },
      { status: 413 }
    );
  }

  const res = await fetch(`${recipesBackendBaseUrl()}/api/images`, {
    method: 'POST',
    headers: {
      ...recipesProxyHeaders(userId),
      'Content-Type': contentType,
    },
    body,
    cache: 'no-store',
  });

  const payload = await res.json().catch(() => ({}));
  return NextResponse.json(payload, { status: res.status });
}
