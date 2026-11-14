import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { recipesBackendBaseUrl, recipesProxyHeaders } from '@/lib/recipesBackend';

/** Owner-side share controls. Reading a shared recipe lives in `share/view`. */
async function forward(
  userId: string,
  path: string,
  init?: { method?: string; body?: unknown }
) {
  const res = await fetch(`${recipesBackendBaseUrl()}/api/share${path}`, {
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

/** GET `?recipeId=` returns the current share token, or null when not shared. */
export async function GET(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const recipeId = req.nextUrl.searchParams.get('recipeId')?.trim();
  if (!recipeId) {
    return NextResponse.json({ success: false, error: 'Missing recipe id' }, { status: 400 });
  }

  return forward(userId, `/recipe/${encodeURIComponent(recipeId)}`);
}

/** POST `{ recipeId }` publishes the recipe and returns its token. */
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

/** DELETE `?recipeId=` stops sharing, invalidating every existing link. */
export async function DELETE(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const recipeId = req.nextUrl.searchParams.get('recipeId')?.trim();
  if (!recipeId) {
    return NextResponse.json({ success: false, error: 'Missing recipe id' }, { status: 400 });
  }

  return forward(userId, `/recipe/${encodeURIComponent(recipeId)}`, { method: 'DELETE' });
}
