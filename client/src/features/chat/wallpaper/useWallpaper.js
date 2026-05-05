import { useCallback, useEffect, useState } from 'react';
import { WALLPAPER_BY_ID } from './wallpapers';

/**
 * Chat wallpaper selection hook.
 *
 * Scope:
 *   Global (same wallpaper for every chat the user opens). Scoping
 *   per-chat is deferred to Phase 4c — the vast majority of users
 *   set one wallpaper and forget; per-chat just inflates the
 *   picker's UX without clear win.
 *
 * Storage:
 *   localStorage key `unitest_chat_wallpaper` holds the selected id
 *   (a string) or is absent when the user has never picked one or
 *   chose "Без фона". Absence OR an id whose wallpaper is missing
 *   from WALLPAPER_BY_ID both resolve to `null` so the UI falls
 *   back to the default chat background.
 *
 * Cross-tab sync:
 *   A `storage` event listener updates every open tab when the user
 *   changes wallpapers in one tab. Without this a user with two
 *   tabs open would see the new pick only in the tab that made it.
 */
const STORAGE_KEY = 'unitest_chat_wallpaper';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // Reject ids that no longer exist in the registry (e.g. after a
    // preset rename / removal). The user just falls back to "no
    // wallpaper" until they pick again — better than a 404 image
    // request every render.
    return WALLPAPER_BY_ID[raw] ? raw : null;
  } catch (_) {
    return null;
  }
}

export function useWallpaper() {
  const [wallpaperId, setWallpaperId] = useState(readStored);

  // Keep this tab in sync when another tab changes the pick.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      setWallpaperId(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setWallpaper = useCallback((id) => {
    try {
      if (id && WALLPAPER_BY_ID[id]) {
        localStorage.setItem(STORAGE_KEY, id);
        setWallpaperId(id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setWallpaperId(null);
      }
    } catch (_) {
      // Private mode / quota exceeded — just update state so the pick
      // persists for this session. Next reload will reset to default.
      setWallpaperId(id || null);
    }
  }, []);

  const wallpaper = wallpaperId ? WALLPAPER_BY_ID[wallpaperId] : null;

  return { wallpaper, wallpaperId, setWallpaper };
}
