import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

function backendBaseUrl(): string {
  return (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
}

function proxyHeaders(sessionUserId: string): HeadersInit {
  const headers: Record<string, string> = {
    'X-User-Id': sessionUserId,
  };
  const secret = process.env.RECIPES_PROXY_SECRET?.trim();
  if (secret) {
    headers['X-Recipes-Proxy-Secret'] = secret;
  }
  return headers;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${backendBaseUrl()}/api/recipes`, {
    headers: proxyHeaders(userId),
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

  const res = await fetch(`${backendBaseUrl()}/api/recipes`, {
    method: 'POST',
    headers: {
      ...proxyHeaders(userId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
