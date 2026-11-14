import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { recipesBackendBaseUrl, recipesProxyHeaders } from '@/lib/recipesBackend';

/** GET lists recipes, or fetches one when query `id` is present. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id')?.trim();
  const target = id
    ? `${recipesBackendBaseUrl()}/api/recipes/${encodeURIComponent(id)}`
    : `${recipesBackendBaseUrl()}/api/recipes`;

  const res = await fetch(target, {
    headers: recipesProxyHeaders(userId),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json();

  const res = await fetch(`${recipesBackendBaseUrl()}/api/recipes`, {
    method: 'POST',
    headers: {
      ...recipesProxyHeaders(userId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

/** PUT uses query `id`, matching DELETE (dynamic `[id]` segments 404 in dev on some Next versions). */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing recipe id' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const res = await fetch(`${recipesBackendBaseUrl()}/api/recipes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      ...recipesProxyHeaders(userId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

/** DELETE uses query `id` (dynamic `[id]` + DELETE can 404 in dev with some Next versions). */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing recipe id' }, { status: 400 });
  }

  const encodedId = encodeURIComponent(id);
  const res = await fetch(`${recipesBackendBaseUrl()}/api/recipes/${encodedId}`, {
    method: 'DELETE',
    headers: recipesProxyHeaders(userId),
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
