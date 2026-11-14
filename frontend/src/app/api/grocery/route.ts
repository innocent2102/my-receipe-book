import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { recipesBackendBaseUrl, recipesProxyHeaders } from '@/lib/recipesBackend';

/**
 * Proxy for the shopping list. Item operations use query params instead of dynamic
 * segments, matching the recipes proxy (dynamic `[id]` + non-GET can 404 in dev).
 */
async function forward(
  userId: string,
  path: string,
  init?: { method?: string; body?: unknown }
) {
  const res = await fetch(`${recipesBackendBaseUrl()}/api/grocery${path}`, {
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

/** POST adds items: `{ items: [{ name, amount, unit, recipeId? }] }`. */
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  return forward(userId, '/items', { method: 'POST', body: payload });
}

/** PATCH `?id=` ticks an item off or back on. */
export async function PATCH(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing item id' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  return forward(userId, `/items/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
}

/** DELETE `?id=` removes one item; `?checked=true` clears everything ticked off. */
export async function DELETE(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();

  if (req.nextUrl.searchParams.get('checked') === 'true') {
    return forward(userId, '/checked', { method: 'DELETE' });
  }

  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing item id' }, { status: 400 });
  }

  return forward(userId, `/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
