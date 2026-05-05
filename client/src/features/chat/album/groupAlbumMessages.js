/**
 * Group consecutive image/video messages from the same sender into
 * "album" tuples for Telegram-style grid rendering in the bubble layer.
 *
 * Why client-side?
 *   The Phase 4b-C composer sends one message per attachment because
 *   the socket.io packet size cap (5 MB) can't fit large albums.
 *   Visual grouping is purely a presentational concern, so it lives
 *   in the renderer and doesn't require a schema change.
 *
 * Grouping rules — the album streak breaks when ANY of:
 *   - sender changes
 *   - the next message is text / sticker / audio / file / system
 *   - the next message is a reply (replyTo set) — replies stand alone
 *   - the next message is forwarded (forwardedFrom set)
 *   - the next message is pending (status: 'sending' / 'failed') —
 *     it might still fail; we don't want to group an unstable bubble
 *   - more than 60 s elapsed between consecutive items in the streak
 *   - the streak already contains MAX_ALBUM_TILES items
 *
 * Output:
 *   The function returns an array of "render units":
 *     { kind: 'single', message }
 *     { kind: 'album',  messages: [...], leader: messages[0] }
 *
 *   Single-element albums are demoted to 'single' since a 1-tile
 *   "album" is just a regular image bubble.
 *
 * Pure & memoizable: the result is referentially stable across
 * `messages.length` and shape changes, so a useMemo over `messages`
 * gives you a free perf win.
 */
export const ALBUM_WINDOW_MS = 60 * 1000;
export const MAX_ALBUM_TILES = 10;

function isAlbumCandidate(msg) {
  if (!msg) return false;
  if (msg.isDeleted) return false;
  if (msg.type !== 'image' && msg.type !== 'video') return false;
  if (msg.replyTo) return false;
  if (msg.forwardedFrom) return false;
  if (msg.status === 'sending' || msg.status === 'failed') return false;
  if (!msg.attachments || msg.attachments.length === 0) return false;
  return true;
}

function senderIdOf(msg) {
  return String(msg?.sender?._id || msg?.sender || '');
}

export function groupAlbumMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const out = [];
  let streak = null;

  const flushStreak = () => {
    if (!streak) return;
    if (streak.messages.length === 1) {
      out.push({ kind: 'single', message: streak.messages[0] });
    } else {
      out.push({
        kind: 'album',
        messages: streak.messages,
        leader: streak.messages[0],
      });
    }
    streak = null;
  };

  for (const m of messages) {
    if (!isAlbumCandidate(m)) {
      flushStreak();
      out.push({ kind: 'single', message: m });
      continue;
    }

    const sid = senderIdOf(m);
    const t = new Date(m.createdAt).getTime();

    if (
      streak &&
      streak.senderId === sid &&
      streak.messages.length < MAX_ALBUM_TILES &&
      Math.abs(t - streak.lastAt) <= ALBUM_WINDOW_MS
    ) {
      streak.messages.push(m);
      streak.lastAt = t;
      continue;
    }

    // Either no streak in progress OR the conditions broke. Flush the
    // previous one (if any) and start a fresh potential streak.
    flushStreak();
    streak = {
      senderId: sid,
      lastAt: t,
      messages: [m],
    };
  }

  flushStreak();
  return out;
}
