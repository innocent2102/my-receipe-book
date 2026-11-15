/** Helpers for recipe photos, shared by the form, the list rows and the recipe view. */

export const RECIPE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const RECIPE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

/**
 * A photo is either one we store (`/api/images/<id>`) or an http(s) address taken from
 * the page a recipe was imported from. Anything else is rejected before it reaches an
 * `<img>` tag.
 */
export function isDisplayableImageUrl(value: string | null | undefined): boolean {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return false;
  if (raw.startsWith('/api/images/')) return true;

  try {
    const { protocol } = new URL(raw);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export type ImageUploadResult = { url: string } | { errorCode: string };

/** Picks the first usable image out of a paste or a drop, if there is one. */
export function imageFileFromTransfer(data: DataTransfer | null): File | null {
  const files = Array.from(data?.files ?? []);
  return files.find((file) => RECIPE_IMAGE_TYPES.includes(file.type)) ?? null;
}

/**
 * Reads an image the user copied elsewhere (a screenshot, or "copy image" in a browser).
 * Returns null when the clipboard holds no picture or the browser denies access, which
 * is why the paste shortcut stays available as a fallback.
 */
export async function readImageFromClipboard(): Promise<File | null> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard?.read) return null;

  try {
    for (const item of await clipboard.read()) {
      const type = item.types.find((candidate) => RECIPE_IMAGE_TYPES.includes(candidate));
      if (!type) continue;

      const blob = await item.getType(type);
      return new File([blob], `pasted.${type.split('/')[1]}`, { type });
    }
  } catch {
    // Permission denied or an unreadable clipboard - treated as "nothing to paste".
  }
  return null;
}

/** Sends the picked file to our proxy as raw bytes and returns its stored address. */
export async function uploadRecipeImage(file: File): Promise<ImageUploadResult> {
  if (!RECIPE_IMAGE_TYPES.includes(file.type)) return { errorCode: 'unsupported_type' };
  if (file.size > RECIPE_IMAGE_MAX_BYTES) return { errorCode: 'too_large' };

  try {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      code?: string;
      data?: { url?: string };
    };

    if (!res.ok || !json.success || !json.data?.url) {
      return { errorCode: json.code ?? 'generic' };
    }
    return { url: json.data.url };
  } catch {
    return { errorCode: 'generic' };
  }
}
