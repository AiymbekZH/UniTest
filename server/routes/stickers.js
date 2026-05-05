/**
 * Stickers — packs CRUD, discover, install, AI generate.
 *
 * All endpoints under `/api/stickers`. Auth required everywhere except
 * the public discover feed.
 *
 * Storage model:
 *   StickerPack — metadata (owner, name, isPublic, counts, installedBy)
 *   Sticker     — one doc per sticker (packId, image base64, emoji, position)
 *
 * Limits (enforced here, soft caps live as statics on the models):
 *   PACKS_PER_USER         : 20
 *   STICKERS_PER_PACK      : 100
 *   MAX_STICKER_BYTES (raw): 512 KB pre-base64  (~700 KB encoded)
 *   AI_GENERATIONS_PER_DAY : 10
 *
 * AI generation is proxied through Pollinations.ai which is keyless and
 * returns the rendered PNG as the response body. We download server-side
 * (so the client doesn't see the third-party domain in its CSP) and hand
 * back base64.
 */
const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const StickerPack = require('../models/StickerPack');
const Sticker = require('../models/Sticker');

const router = express.Router();

// ── Constants ──
const PACKS_PER_USER = StickerPack.PACK_LIMIT_PER_USER || 20;
const STICKERS_PER_PACK = Sticker.PER_PACK_LIMIT || 100;
const MAX_STICKER_BYTES = Sticker.MAX_IMAGE_BYTES || 512 * 1024; // raw bytes pre-base64
const AI_GENERATIONS_PER_DAY = 10;

// ── Tiny in-memory daily counter for AI generation ──
// Keyed by `${userId}:${YYYY-MM-DD}`. Resets implicitly when the day rolls
// over because we never query yesterday's keys. Cleared on process restart
// (acceptable — restart is rare and the cap is generous).
const _aiCounter = new Map();
function _today() { return new Date().toISOString().slice(0, 10); }
function _aiKey(userId) { return `${userId}:${_today()}`; }
function _aiHits(userId) { return _aiCounter.get(_aiKey(userId)) || 0; }
function _aiBump(userId) {
  const k = _aiKey(userId);
  _aiCounter.set(k, (_aiCounter.get(k) || 0) + 1);
  // Bound the map so a busy server doesn't leak.
  if (_aiCounter.size > 5000) {
    const oldest = _aiCounter.keys().next().value;
    _aiCounter.delete(oldest);
  }
}

// ── Helpers ──

// Roughly check how many raw bytes a base64 string represents.
// Spec: encoded = Math.ceil(rawBytes / 3) * 4 → rawBytes ≈ encoded * 3/4
// minus padding. Close enough for our 512KB cap; we don't need the exact
// number, just rejection of obviously oversized payloads.
function approxRawBytes(b64String) {
  if (!b64String) return 0;
  // Strip data: URL prefix if present.
  const idx = b64String.indexOf(',');
  const body = idx >= 0 ? b64String.slice(idx + 1) : b64String;
  return Math.floor(body.length * 0.75);
}

// Verify ownership and load a pack. Returns 404/403 directly on failure
// (caller short-circuits with `if (!pack) return;`).
async function loadOwnedPack(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: 'Некорректный ID' });
    return null;
  }
  const pack = await StickerPack.findById(id);
  if (!pack) {
    res.status(404).json({ message: 'Пак не найден' });
    return null;
  }
  if (String(pack.owner) !== String(req.user._id)) {
    res.status(403).json({ message: 'Нет доступа к чужому паку' });
    return null;
  }
  return pack;
}

// Hydrate a pack with its sticker list. Done in one extra query rather
// than $lookup so we keep the route logic readable. The sticker cap of
// 100 keeps this cheap.
async function hydrateStickers(pack) {
  const stickers = await Sticker.find({ pack: pack._id })
    .sort({ position: 1, createdAt: 1 })
    .lean();
  return { ...pack.toJSON?.() || pack, stickers };
}

// ─────────────────────────────────────────────────────────────────────
// LIST: my packs (owned + installed)
// GET /api/stickers/my
// ─────────────────────────────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Owned + installed in one query, then partition client-side.
    const packs = await StickerPack.find({
      $or: [{ owner: userId }, { installedBy: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    // Hydrate stickers in parallel — small N (≤30 typically).
    const hydrated = await Promise.all(packs.map(async (p) => {
      const stickers = await Sticker.find({ pack: p._id })
        .sort({ position: 1, createdAt: 1 })
        .lean();
      return {
        ...p,
        stickers,
        isOwner: String(p.owner) === String(userId),
      };
    }));

    res.json(hydrated);
  } catch (err) {
    console.error('[stickers] /my error:', err.message);
    res.status(500).json({ message: 'Ошибка загрузки стикеров' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DISCOVER: public packs feed
// GET /api/stickers/discover?q=&page=1
// ─────────────────────────────────────────────────────────────────────
router.get('/discover', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 30;

    const filter = { isPublic: true };
    if (q.length >= 2) {
      // Escape regex specials so user input can't break the query.
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }

    const packs = await StickerPack.find(filter)
      .sort({ installCount: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Don't ship the full sticker list on discover — just first 4 as a preview.
    const hydrated = await Promise.all(packs.map(async (p) => {
      const preview = await Sticker.find({ pack: p._id })
        .sort({ position: 1 })
        .limit(4)
        .lean();
      return {
        ...p,
        previewStickers: preview,
        isInstalled: p.installedBy?.some(u => String(u) === String(req.user._id)) || false,
        isOwner: String(p.owner) === String(req.user._id),
      };
    }));

    res.json({ packs: hydrated, page, hasMore: hydrated.length === limit });
  } catch (err) {
    console.error('[stickers] /discover error:', err.message);
    res.status(500).json({ message: 'Ошибка поиска паков' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// CREATE pack
// POST /api/stickers/packs   { name, description?, isPublic? }
// ─────────────────────────────────────────────────────────────────────
router.post('/packs', auth, async (req, res) => {
  try {
    const { name, description = '', isPublic = false } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Название обязательно' });
    }

    // Hard cap: 20 packs per user. Without this, a script could spam
    // packs and OOM the discover feed for everyone.
    const ownedCount = await StickerPack.countDocuments({ owner: req.user._id });
    if (ownedCount >= PACKS_PER_USER) {
      return res.status(400).json({
        message: `Достигнут лимит паков (${PACKS_PER_USER}). Удалите старый перед созданием нового.`,
      });
    }

    const pack = await StickerPack.create({
      owner: req.user._id,
      name: name.trim().slice(0, 60),
      description: String(description || '').trim().slice(0, 300),
      isPublic: !!isPublic,
      stickerCount: 0,
      installCount: 0,
    });

    res.status(201).json({ ...pack.toJSON(), stickers: [], isOwner: true });
  } catch (err) {
    console.error('[stickers] create pack error:', err.message);
    res.status(500).json({ message: 'Ошибка создания пака' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// UPDATE pack metadata
// PATCH /api/stickers/packs/:id   { name?, description?, isPublic?, cover? }
// ─────────────────────────────────────────────────────────────────────
router.patch('/packs/:id', auth, async (req, res) => {
  try {
    const pack = await loadOwnedPack(req, res);
    if (!pack) return;

    const { name, description, isPublic, cover } = req.body || {};
    if (typeof name === 'string' && name.trim()) {
      pack.name = name.trim().slice(0, 60);
    }
    if (typeof description === 'string') {
      pack.description = description.trim().slice(0, 300);
    }
    if (typeof isPublic === 'boolean') {
      pack.isPublic = isPublic;
    }
    if (typeof cover === 'string') {
      // 50KB cap on the cover thumbnail — it's just a UI accent.
      if (approxRawBytes(cover) > 50 * 1024) {
        return res.status(400).json({ message: 'Обложка слишком большая (макс. 50 KB)' });
      }
      pack.cover = cover;
    }

    await pack.save();
    res.json(pack.toJSON());
  } catch (err) {
    console.error('[stickers] update pack error:', err.message);
    res.status(500).json({ message: 'Ошибка обновления пака' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DELETE pack (cascades stickers)
// DELETE /api/stickers/packs/:id
// ─────────────────────────────────────────────────────────────────────
router.delete('/packs/:id', auth, async (req, res) => {
  try {
    const pack = await loadOwnedPack(req, res);
    if (!pack) return;

    await Sticker.deleteMany({ pack: pack._id });
    await pack.deleteOne();

    res.json({ ok: true });
  } catch (err) {
    console.error('[stickers] delete pack error:', err.message);
    res.status(500).json({ message: 'Ошибка удаления пака' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// INSTALL / UNINSTALL public pack
// POST   /api/stickers/packs/:id/install
// DELETE /api/stickers/packs/:id/install
// ─────────────────────────────────────────────────────────────────────
router.post('/packs/:id/install', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pack = await StickerPack.findById(id);
    if (!pack) return res.status(404).json({ message: 'Пак не найден' });
    if (!pack.isPublic && String(pack.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Этот пак приватный' });
    }
    if (String(pack.owner) === String(req.user._id)) {
      // Owner already has it — no-op.
      return res.json({ ok: true, alreadyOwned: true });
    }

    const already = (pack.installedBy || []).some(u => String(u) === String(req.user._id));
    if (already) {
      return res.json({ ok: true, alreadyInstalled: true });
    }

    pack.installedBy.push(req.user._id);
    pack.installCount = (pack.installCount || 0) + 1;
    await pack.save();

    res.json({ ok: true });
  } catch (err) {
    console.error('[stickers] install error:', err.message);
    res.status(500).json({ message: 'Ошибка установки пака' });
  }
});

router.delete('/packs/:id/install', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const pack = await StickerPack.findById(id);
    if (!pack) return res.status(404).json({ message: 'Пак не найден' });

    const before = pack.installedBy?.length || 0;
    pack.installedBy = (pack.installedBy || []).filter(u => String(u) !== String(req.user._id));
    if (pack.installedBy.length !== before) {
      pack.installCount = Math.max(0, (pack.installCount || 0) - 1);
      await pack.save();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[stickers] uninstall error:', err.message);
    res.status(500).json({ message: 'Ошибка удаления установки' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// ADD sticker to a pack
// POST /api/stickers/packs/:id/stickers   { image, emoji?, source? }
// `image` is base64 (with or without data: prefix) of a PNG/WebP. The
// client is responsible for transparency / bg removal — server just
// stores what it gets.
// ─────────────────────────────────────────────────────────────────────
router.post('/packs/:id/stickers', auth, async (req, res) => {
  try {
    const pack = await loadOwnedPack(req, res);
    if (!pack) return;

    const { image, emoji = '', source = 'upload', mimetype = 'image/webp' } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ message: 'Не передано изображение' });
    }

    if (approxRawBytes(image) > MAX_STICKER_BYTES) {
      return res.status(400).json({ message: 'Стикер слишком большой (макс. 512 KB)' });
    }

    const count = await Sticker.countDocuments({ pack: pack._id });
    if (count >= STICKERS_PER_PACK) {
      return res.status(400).json({
        message: `В паке уже ${STICKERS_PER_PACK} стикеров — это максимум`,
      });
    }

    const allowedSources = ['upload', 'background_removed', 'editor', 'ai'];
    const sticker = await Sticker.create({
      pack: pack._id,
      owner: req.user._id,
      image,
      mimetype: typeof mimetype === 'string' ? mimetype.slice(0, 60) : 'image/webp',
      emoji: typeof emoji === 'string' ? emoji.slice(0, 8) : '',
      source: allowedSources.includes(source) ? source : 'upload',
      position: count, // append
    });

    pack.stickerCount = count + 1;
    // Auto-set cover from the first sticker if owner hasn't set one yet.
    if (!pack.cover && count === 0) {
      // Only the small ones — full image is too large for the inline cover.
      // Owner can override later via PATCH /packs/:id.
      pack.cover = image.length > 100_000 ? '' : image;
    }
    await pack.save();

    res.status(201).json(sticker.toJSON());
  } catch (err) {
    console.error('[stickers] add sticker error:', err.message);
    res.status(500).json({ message: 'Ошибка добавления стикера' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DELETE sticker from a pack
// DELETE /api/stickers/packs/:id/stickers/:sid
// ─────────────────────────────────────────────────────────────────────
router.delete('/packs/:id/stickers/:sid', auth, async (req, res) => {
  try {
    const pack = await loadOwnedPack(req, res);
    if (!pack) return;

    const { sid } = req.params;
    if (!mongoose.isValidObjectId(sid)) {
      return res.status(400).json({ message: 'Некорректный ID стикера' });
    }

    const result = await Sticker.deleteOne({ _id: sid, pack: pack._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Стикер не найден' });
    }

    pack.stickerCount = Math.max(0, (pack.stickerCount || 0) - 1);
    await pack.save();

    res.json({ ok: true });
  } catch (err) {
    console.error('[stickers] delete sticker error:', err.message);
    res.status(500).json({ message: 'Ошибка удаления стикера' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// REORDER stickers within a pack
// PUT /api/stickers/packs/:id/stickers/order   { orderedIds: [stickerId, ...] }
// ─────────────────────────────────────────────────────────────────────
router.put('/packs/:id/stickers/order', auth, async (req, res) => {
  try {
    const pack = await loadOwnedPack(req, res);
    if (!pack) return;

    const { orderedIds } = req.body || {};
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds должен быть массивом' });
    }

    // Re-position in a single bulk write rather than one updateOne per id.
    const ops = orderedIds
      .filter(id => mongoose.isValidObjectId(id))
      .map((id, idx) => ({
        updateOne: {
          filter: { _id: id, pack: pack._id },
          update: { $set: { position: idx } },
        },
      }));

    if (ops.length > 0) {
      await Sticker.bulkWrite(ops);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[stickers] reorder error:', err.message);
    res.status(500).json({ message: 'Ошибка изменения порядка' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// AI GENERATE — proxy to Pollinations.ai
// POST /api/stickers/ai-generate   { prompt, count?=4 }
// → { images: [{ image: base64, prompt }] }
//
// We don't write to a pack here — the client gets the variants, picks one
// (or several), and POSTs each chosen one to /packs/:id/stickers with
// source='ai'. This keeps the AI rate-limit decoupled from pack write
// permissions and lets the user discard rejects without paying the
// generation cost again.
// ─────────────────────────────────────────────────────────────────────
router.post('/ai-generate', auth, async (req, res) => {
  try {
    const { prompt, count = 4 } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ message: 'Опишите стикер' });
    }
    const cleanPrompt = prompt.trim().slice(0, 200);

    const userId = String(req.user._id);
    if (_aiHits(userId) >= AI_GENERATIONS_PER_DAY) {
      return res.status(429).json({
        message: `Дневной лимит ИИ-генераций исчерпан (${AI_GENERATIONS_PER_DAY}). Возвращайтесь завтра.`,
      });
    }

    const variants = Math.max(1, Math.min(4, parseInt(count) || 4));

    // Pollinations supports a `seed` query param so re-rolling gives
    // different results. We call N times in parallel; failures of
    // individual variants don't kill the whole request.
    // The "sticker" suffix nudges the model toward tight subjects on
    // transparent / clean backgrounds.
    const stickerPrompt = `${cleanPrompt}, sticker, transparent background, clean white outline, centered, vibrant colors`;
    const baseUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(stickerPrompt)}?width=512&height=512&nologo=true`;

    const startedAt = Date.now();
    const fetches = Array.from({ length: variants }).map((_, i) => {
      const seed = Math.floor(Math.random() * 1e9);
      const url = `${baseUrl}&seed=${seed}`;
      return fetchAsBase64(url, 30_000).catch((err) => {
        console.warn(`[stickers] ai variant ${i} failed:`, err.message);
        return null;
      });
    });

    const results = await Promise.all(fetches);
    const images = results.filter(Boolean).map((b64) => ({
      image: `data:image/png;base64,${b64}`,
      mimetype: 'image/png',
      prompt: cleanPrompt,
      source: 'ai',
    }));

    if (images.length === 0) {
      return res.status(502).json({ message: 'Сервис ИИ недоступен. Попробуйте ещё раз.' });
    }

    _aiBump(userId);

    res.json({
      images,
      generated: images.length,
      requested: variants,
      remaining: Math.max(0, AI_GENERATIONS_PER_DAY - _aiHits(userId)),
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error('[stickers] ai-generate error:', err.message);
    res.status(500).json({ message: 'Ошибка генерации' });
  }
});

// ── Internal: fetch URL → base64 with timeout ──
// Node 18+ has global `fetch`. We download the bytes and base64-encode
// in-process so the client never sees the third-party URL. AbortController
// + timeout covers Pollinations cold-start hangs.
async function fetchAsBase64(url, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'UniTest-Stickers/1.0' },
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > 1.5 * 1024 * 1024) {
      // Pollinations sometimes returns oversize SVG fallbacks. Reject
      // to keep storage sane.
      throw new Error('upstream oversized');
    }
    return buf.toString('base64');
  } finally {
    clearTimeout(timer);
  }
}

module.exports = router;
