import { NextResponse, type NextRequest } from 'next/server';
import { publicProxyHeaders, recipesBackendBaseUrl } from '@/lib/recipesBackend';

/**
 * Serves an uploaded recipe photo. Deliberately session-free so shared recipes stay
 * viewable by anyone holding the link; the unguessable id is what protects the photo.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  const res = await fetch(`${recipesBackendBaseUrl()}/api/images/${encodeURIComponent(id)}`, {
    headers: publicProxyHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: res.status });
  }

  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      // A new upload always gets a new id, so the bytes behind one never change.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
