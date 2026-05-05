import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * Centralised hook for sticker pack management. Single source of truth
 * across StickerPicker (composer) and MyStickersPage so both stay in
 * sync after a create/delete/install action without prop drilling.
 *
 * Cache strategy: we keep packs in state and refresh on:
 *   - mount (initial load)
 *   - explicit `refetch()`
 *   - any local mutation (after the server acks)
 *
 * No global store — each consumer owns its own copy. This is fine since
 * a user typically opens at most two contexts (the page + the picker)
 * and refetch is cheap (≤30 packs of metadata + base64 stickers, but
 * Phase 4 may move to thumbnails).
 */
export function useStickers({ autoLoad = true } = {}) {
  const [myPacks, setMyPacks] = useState([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/stickers/my');
      setMyPacks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err);
      // Don't toast here — the page UI surfaces the error itself.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) refetch();
  }, [autoLoad, refetch]);

  // ── Pack actions ──
  const createPack = useCallback(async ({ name, description = '', isPublic = false }) => {
    try {
      const res = await api.post('/stickers/packs', { name, description, isPublic });
      // Server returns the new pack with `stickers: []`. Push to top.
      setMyPacks(prev => [res.data, ...prev]);
      toast.success('Пак создан');
      return res.data;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не удалось создать пак');
      return null;
    }
  }, []);

  const updatePack = useCallback(async (packId, patch) => {
    try {
      const res = await api.patch(`/stickers/packs/${packId}`, patch);
      // Server returns updated pack metadata only — preserve local stickers[].
      setMyPacks(prev => prev.map(p =>
        String(p._id) === String(packId)
          ? { ...p, ...res.data, stickers: p.stickers }
          : p
      ));
      return res.data;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не удалось обновить пак');
      return null;
    }
  }, []);

  const deletePack = useCallback(async (packId) => {
    try {
      await api.delete(`/stickers/packs/${packId}`);
      setMyPacks(prev => prev.filter(p => String(p._id) !== String(packId)));
      toast.success('Пак удалён');
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не удалось удалить пак');
      return false;
    }
  }, []);

  // ── Sticker actions ──
  const addSticker = useCallback(async (packId, { image, mimetype = 'image/webp', emoji = '', source = 'upload' }) => {
    try {
      const res = await api.post(`/stickers/packs/${packId}/stickers`, {
        image, mimetype, emoji, source,
      });
      const sticker = res.data;
      setMyPacks(prev => prev.map(p => {
        if (String(p._id) !== String(packId)) return p;
        return {
          ...p,
          stickers: [...(p.stickers || []), sticker],
          stickerCount: (p.stickerCount || 0) + 1,
        };
      }));
      return sticker;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не удалось добавить стикер');
      return null;
    }
  }, []);

  const removeSticker = useCallback(async (packId, stickerId) => {
    try {
      await api.delete(`/stickers/packs/${packId}/stickers/${stickerId}`);
      setMyPacks(prev => prev.map(p => {
        if (String(p._id) !== String(packId)) return p;
        return {
          ...p,
          stickers: (p.stickers || []).filter(s => String(s._id) !== String(stickerId)),
          stickerCount: Math.max(0, (p.stickerCount || 0) - 1),
        };
      }));
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не удалось удалить стикер');
      return false;
    }
  }, []);

  // ── Discover / install ──
  const discover = useCallback(async ({ q = '', page = 1 } = {}) => {
    try {
      const res = await api.get('/stickers/discover', { params: { q, page } });
      return res.data; // { packs, page, hasMore }
    } catch (err) {
      toast.error('Не удалось загрузить публичные паки');
      return { packs: [], page: 1, hasMore: false };
    }
  }, []);

  const installPack = useCallback(async (packId) => {
    try {
      const res = await api.post(`/stickers/packs/${packId}/install`);
      // Server returns the pack but without stickers[]; refetch to hydrate.
      await refetch();
      toast.success('Пак установлен');
      return res.data;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не удалось установить пак');
      return null;
    }
  }, [refetch]);

  const uninstallPack = useCallback(async (packId) => {
    try {
      await api.delete(`/stickers/packs/${packId}/install`);
      setMyPacks(prev => prev.filter(p => String(p._id) !== String(packId) || p.isOwner));
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Не удалось удалить пак');
      return false;
    }
  }, []);

  // ── AI ──
  const aiGenerate = useCallback(async ({ prompt, count = 4 }) => {
    try {
      const res = await api.post('/stickers/ai-generate', { prompt, count });
      return res.data; // { images: [{ image, mimetype, prompt, source }], remaining, ... }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Ошибка генерации';
      toast.error(msg);
      return null;
    }
  }, []);

  return {
    myPacks,
    loading,
    error,
    refetch,
    createPack,
    updatePack,
    deletePack,
    addSticker,
    removeSticker,
    discover,
    installPack,
    uninstallPack,
    aiGenerate,
  };
}
