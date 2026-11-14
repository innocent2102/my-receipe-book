'use client';

import { readOffline, writeOffline } from './offlineStore';

export type GroceryItem = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
};

/**
 * A change made while the shopping list was offline. The queue is replayed in
 * order against the API once the connection is back, so the server ends up in
 * the same state the user already sees locally.
 */
export type PendingOp =
  | {
      kind: 'add';
      localId: string;
      name: string;
      amount: number;
      unit: string;
      recipeId?: string;
    }
  | { kind: 'toggle'; itemId: string; checked: boolean }
  | { kind: 'remove'; itemId: string }
  | { kind: 'clearChecked' };

const ITEMS_KEY = 'grocery.items';
const QUEUE_KEY = 'grocery.queue';

export const readCachedItems = () => readOffline<GroceryItem[]>(ITEMS_KEY) ?? [];
export const writeCachedItems = (items: GroceryItem[]) => writeOffline(ITEMS_KEY, items);
export const readQueue = () => readOffline<PendingOp[]>(QUEUE_KEY) ?? [];
export const writeQueue = (queue: PendingOp[]) => writeOffline(QUEUE_KEY, queue);

export const newLocalId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const isLocalId = (id: string) => id.startsWith('local-');

/** Mirrors the backend merge key so offline merging matches server merging. */
export function mergeKey(name: string, unit: string): string {
  return `${name.trim().replace(/\s+/g, ' ').toLowerCase()}|${unit.trim().toLowerCase()}`;
}

function sortItems(items: GroceryItem[]): GroceryItem[] {
  return [...items].sort(
    (a, b) =>
      Number(a.checked) - Number(b.checked) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

/**
 * Applies an operation to a local snapshot, reproducing the backend's rules:
 * the same ingredient in the same unit is one line, and re-adding something
 * already ticked off puts it back on the list.
 */
export function applyOp(items: GroceryItem[], op: PendingOp): GroceryItem[] {
  switch (op.kind) {
    case 'add': {
      const key = mergeKey(op.name, op.unit);
      const existing = items.find((item) => mergeKey(item.name, item.unit) === key);
      if (existing) {
        return sortItems(
          items.map((item) =>
            item.id === existing.id
              ? { ...item, amount: item.amount + op.amount, checked: false }
              : item
          )
        );
      }
      return sortItems([
        ...items,
        {
          id: op.localId,
          name: op.name,
          amount: op.amount,
          unit: op.unit,
          checked: false,
        },
      ]);
    }
    case 'toggle':
      return sortItems(
        items.map((item) => (item.id === op.itemId ? { ...item, checked: op.checked } : item))
      );
    case 'remove':
      return items.filter((item) => item.id !== op.itemId);
    case 'clearChecked':
      return items.filter((item) => !item.checked);
    default:
      return items;
  }
}

type GroceryResponse = {
  success?: boolean;
  data?: { id: string; items: GroceryItem[] };
  error?: string;
};

export class OfflineError extends Error {}
export class UnauthorizedError extends Error {}

async function send(input: string, init: RequestInit): Promise<GroceryResponse> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new OfflineError('Request failed — no connection');
  }

  if (res.status === 401) throw new UnauthorizedError('Unauthorized');

  const json = (await res.json().catch(() => ({}))) as GroceryResponse;
  if (!res.ok) {
    // 4xx other than 401 means the operation can never succeed (e.g. the item
    // was deleted on another device), so the caller drops it from the queue.
    const error = new Error(json.error || `Request failed (${res.status})`);
    if (res.status >= 500) throw new OfflineError(error.message);
    throw error;
  }
  return json;
}

export async function fetchList(): Promise<GroceryItem[]> {
  const json = await send('/api/grocery', { cache: 'no-store' });
  return json.data?.items ?? [];
}

export type ReplayResult = {
  /** Operations that still could not be delivered; keep them queued. */
  remaining: PendingOp[];
  /** Whether at least one operation reached the server. */
  synced: boolean;
};

/**
 * Replays queued operations in order. Ids created offline are translated to
 * the real server ids as soon as the matching `add` comes back, so later
 * toggles and removals address the right row.
 */
export async function replayQueue(queue: PendingOp[]): Promise<ReplayResult> {
  const serverIds = new Map<string, string>();
  let synced = false;

  const resolveId = (itemId: string) => serverIds.get(itemId) ?? itemId;

  for (let index = 0; index < queue.length; index += 1) {
    const op = queue[index];

    try {
      if (op.kind === 'add') {
        const json = await send('/api/grocery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              { name: op.name, amount: op.amount, unit: op.unit, recipeId: op.recipeId },
            ],
          }),
        });
        const key = mergeKey(op.name, op.unit);
        const stored = json.data?.items.find((item) => mergeKey(item.name, item.unit) === key);
        if (stored) serverIds.set(op.localId, stored.id);
      } else if (op.kind === 'toggle') {
        const itemId = resolveId(op.itemId);
        if (isLocalId(itemId)) continue;
        await send(`/api/grocery?id=${encodeURIComponent(itemId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checked: op.checked }),
        });
      } else if (op.kind === 'remove') {
        const itemId = resolveId(op.itemId);
        if (isLocalId(itemId)) continue;
        await send(`/api/grocery?id=${encodeURIComponent(itemId)}`, { method: 'DELETE' });
      } else {
        await send('/api/grocery?checked=true', { method: 'DELETE' });
      }

      synced = true;
    } catch (error) {
      if (error instanceof OfflineError || error instanceof UnauthorizedError) {
        // Still unreachable: stop here and keep the rest for the next attempt.
        return { remaining: queue.slice(index), synced };
      }
      // Permanently rejected — drop this one and carry on with the rest.
      synced = true;
    }
  }

  return { remaining: [], synced };
}

/**
 * Stores additions locally and queues them. Used by the "add to list" dialog so
 * putting a recipe on the list works with no connection.
 */
export function queueAdditions(
  entries: { name: string; amount: number; unit: string; recipeId?: string }[]
): number {
  let items = readCachedItems();
  const queue = readQueue();

  for (const entry of entries) {
    const op: PendingOp = { kind: 'add', localId: newLocalId(), ...entry };
    items = applyOp(items, op);
    queue.push(op);
  }

  writeCachedItems(items);
  writeQueue(queue);
  return entries.length;
}

/** Best-effort delivery of everything queued; safe to call when offline. */
export async function flushQueue(): Promise<void> {
  const pending = readQueue();
  if (pending.length === 0) return;

  const { remaining } = await replayQueue(pending);
  writeQueue(remaining);
  if (remaining.length > 0) return;

  try {
    writeCachedItems(await fetchList());
  } catch {
    // The replay already succeeded; the refresh can wait for the next visit.
  }
}
