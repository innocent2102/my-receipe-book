import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import {
  publicProxyHeaders,
  recipesBackendBaseUrl,
  recipesProxyHeaders,
} from '@/lib/recipesBackend';

/**
 * Reading a shared recipe deliberately needs no session: the token in the link is
 * the only credential. Copying it into a recipe book still requires signing in.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing share token' }, { status: 400 });
  }

  const res = await fetch(
    `${recipesBackendBaseUrl()}/api/share/view/${encodeURIComponent(token)}`,
    { headers: publicProxyHeaders(), cache: 'no-store' }
  );

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

/** POST `?token=` copies the shared recipe into the signed-in user's recipes. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing share token' }, { status: 400 });
  }

  const res = await fetch(
    `${recipesBackendBaseUrl()}/api/share/view/${encodeURIComponent(token)}/import`,
    { method: 'POST', headers: recipesProxyHeaders(userId), cache: 'no-store' }
  );

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
