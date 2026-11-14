import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { recipesBackendBaseUrl, recipesProxyHeaders } from '@/lib/recipesBackend';

/** GET returns the current user's known ingredient names, optional `q` filter. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  const target = q
    ? `${recipesBackendBaseUrl()}/api/ingredients?q=${encodeURIComponent(q)}`
    : `${recipesBackendBaseUrl()}/api/ingredients`;

  const res = await fetch(target, {
    headers: recipesProxyHeaders(userId),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

/** DELETE removes an ingredient name from the user's suggestions. */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const name = req.nextUrl.searchParams.get('name')?.trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: 'Missing ingredient name' },
      { status: 400 }
    );
  }

  const res = await fetch(
    `${recipesBackendBaseUrl()}/api/ingredients?name=${encodeURIComponent(name)}`,
    {
      method: 'DELETE',
      headers: recipesProxyHeaders(userId),
    }
  );

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

/** POST adds a new ingredient name to the user's list. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));

  const res = await fetch(`${recipesBackendBaseUrl()}/api/ingredients`, {
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
