/** Server-side: URL and headers for proxying to the Express recipes API. */

export function recipesBackendBaseUrl(): string {
  return (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export function recipesProxyHeaders(sessionUserId: string): HeadersInit {
  const headers: Record<string, string> = {
    'X-User-Id': sessionUserId,
  };
  const secret = process.env.RECIPES_PROXY_SECRET?.trim();
  if (secret) {
    headers['X-Recipes-Proxy-Secret'] = secret;
  }
  return headers;
}
