import type { Request, Response } from 'express';

/**
 * Trust boundary: only the Next.js server should call the recipes API, with a shared
 * secret when RECIPES_PROXY_SECRET is set. X-User-Id must match the logged-in user
 * the proxy resolved from the session.
 */
export function requireRecipeUser(req: Request, res: Response): string | null {
  const proxySecret = process.env.RECIPES_PROXY_SECRET?.trim();
  if (proxySecret) {
    const got = req.get('x-recipes-proxy-secret');
    if (!got || got !== proxySecret) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return null;
    }
  }

  const userId = req.get('x-user-id')?.trim();
  if (!userId) {
    res.status(401).json({ success: false, error: 'Missing user' });
    return null;
  }

  return userId;
}

