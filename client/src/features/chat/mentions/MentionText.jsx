import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Renders a chat-message text body with @mentions turned into styled,
 * clickable spans.
 *
 * Inputs:
 *   - text: the raw message string. Always string-coerced; null/undefined
 *     resolve to ''.
 *   - mentions: the message's `mentions` field, populated server-side
 *     to an array of user docs `{ _id, username, firstName, lastName }`.
 *     If undefined / empty, the text is rendered as plain text.
 *   - currentUserId: when a mention targets the viewer, we accent it
 *     differently ("you were tagged" emphasis).
 *
 * Strategy:
 *   We don't try to be clever about all possible @-tokens — only the
 *   exact `@username` substrings whose username is in `mentions`
 *   become interactive. Everything else stays literal. This way a
 *   user typing "@nobody" sees plain text and we don't mis-link.
 *
 *   Rendering walks the text once with a regex that matches any
 *   `@username` whose username is present in our lookup. The match is
 *   wrapped in a button; surrounding text is emitted as plain
 *   whitespace-preserving text segments.
 *
 * Click → /profile/:userId. Same convention as message-sender names.
 */
export default function MentionText({ text, mentions, currentUserId }) {
  const navigate = useNavigate();
  const safe = typeof text === 'string' ? text : '';

  // Build a lookup of username (lowercase) → user. The regex below
  // anchors on word boundaries so we won't false-positive on
  // "@adminbot" inside an email; the rest of the contract matches
  // the server-side extractMentions() exactly.
  const byUsername = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(mentions)) return map;
    for (const u of mentions) {
      if (u?.username) map.set(String(u.username).toLowerCase(), u);
    }
    return map;
  }, [mentions]);

  if (!safe) return null;
  if (byUsername.size === 0) {
    // Fast path — no mentions at all, single text node.
    return <>{safe}</>;
  }

  // Build a single regex that matches any `@<username>` that we know
  // about. Iterating the message once is O(n) and avoids repeated
  // scans per username.
  const usernames = Array.from(byUsername.keys()).map(escapeRegex);
  // Sort longer names first so e.g. "@johnny" is preferred over
  // "@john" when both exist as members.
  usernames.sort((a, b) => b.length - a.length);
  const re = new RegExp(`(^|[^a-z0-9_])@(${usernames.join('|')})(?=$|[^a-z0-9_])`, 'gi');

  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(safe)) !== null) {
    const fullStart = match.index;
    const prefix = match[1] || '';
    const usernameMatched = match[2];
    const atStart = fullStart + prefix.length;
    const atEnd = atStart + 1 + usernameMatched.length;

    // Emit text up to and including the prefix (typically a space or
    // start-of-line) untouched.
    if (lastIndex < atStart) {
      parts.push(safe.slice(lastIndex, atStart));
    }

    const user = byUsername.get(usernameMatched.toLowerCase());
    const isMe = user && currentUserId && String(user._id) === String(currentUserId);

    parts.push(
      <button
        key={`m-${key++}`}
        type="button"
        onClick={(e) => {
          // stopPropagation so the bubble's outer click handlers
          // (long-press, double-tap-to-react) don't fire.
          e.stopPropagation();
          if (user?._id) navigate(`/profile/${user._id}`);
        }}
        className={`mx-0.5 inline rounded px-1 font-bold transition ${
          isMe
            ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-500/30 dark:text-amber-200 dark:hover:bg-amber-500/40'
            : 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-500/20 dark:text-primary-200 dark:hover:bg-primary-500/30'
        }`}
      >
        @{user?.firstName || usernameMatched}
        {user?.lastName ? ` ${user.lastName}` : ''}
      </button>
    );

    lastIndex = atEnd;
  }

  if (lastIndex < safe.length) {
    parts.push(safe.slice(lastIndex));
  }

  return <>{parts}</>;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
