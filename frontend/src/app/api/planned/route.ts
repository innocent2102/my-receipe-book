import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { recipesBackendBaseUrl, recipesProxyHeaders } from '@/lib/recipesBackend';

/**
 * Proxy for planned recipes. Removal uses a query param instead of a dynamic
 * segment, matching the other proxies (dynamic `[id]` + non-GET can 404 in dev).
 */
async function forward(
  userId: string,
  path: string,
  init?: { method?: string; body?: unknown }
) {
  const res = await fetch(`${recipesBackendBaseUrl()}/api/planned${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      ...recipesProxyHeaders(userId),
      ...(init?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

async function currentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

const unauthorized = () =>
  NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  return forward(userId, '');
}

/** POST plans a recipe: `{ recipeId }`. */
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  return forward(userId, '', { method: 'POST', body: payload });
}

/** DELETE `?id=` unplans a recipe. */
export async function DELETE(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing recipe id' }, { status: 400 });
  }

  return forward(userId, `/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
