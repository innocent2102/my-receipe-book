import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { recipesBackendBaseUrl, recipesProxyHeaders } from '@/lib/recipesBackend';

/**
 * Turns a recipe page URL into a draft. Nothing is saved here - the user reviews the
 * draft on the add page first.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const res = await fetch(`${recipesBackendBaseUrl()}/api/recipes/from-url`, {
    method: 'POST',
    headers: {
      ...recipesProxyHeaders(userId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  // The backend's `code` drives the dialog's error message, so pass the body through.
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
