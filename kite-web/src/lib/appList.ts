import type { App } from "@/lib/types/wire.gen";

/** The search box only appears once the list is long enough to need it. */
export const SEARCH_MIN_APPS = 8;

/** Lower case without accents, so "dang" finds "Đặng". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

/**
 * Whether the user was invited to the app instead of owning it. The id of the
 * user is the reliable answer; before it is known the owner that the list
 * sends along for the apps of other people is used.
 */
export function isInvited(app: App, userId?: string): boolean {
  if (userId) return app.owner_user_id !== userId;
  return app.owner !== undefined;
}

export function matchesSearch(app: App, query: string): boolean {
  const needle = normalizeSearch(query);
  if (!needle) return true;

  return [app.name, app.description ?? "", app.owner?.display_name ?? ""].some(
    (text) => normalizeSearch(text).includes(needle)
  );
}

export interface AppGroups {
  mine: App[];
  invited: App[];
}

/** Splits the apps into the ones of the user and the ones they were invited to. */
export function groupApps(
  apps: (App | undefined)[],
  { userId, query = "" }: { userId?: string; query?: string } = {}
): AppGroups {
  const groups: AppGroups = { mine: [], invited: [] };

  for (const app of apps) {
    if (!app || !matchesSearch(app, query)) continue;
    (isInvited(app, userId) ? groups.invited : groups.mine).push(app);
  }

  return groups;
}
