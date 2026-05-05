/**
 * Extract @mentions from a chat-message text against a list of group
 * members.
 *
 * Matching strategy:
 *   - The composer inserts `@username` after autocomplete, using the
 *     `username` field on User (which is unique). This is the
 *     canonical, machine-resolvable form.
 *   - A username must be preceded by a non-word character (or start
 *     of string) and followed by a non-word character (or end). This
 *     prevents matching "@adminbot" inside "email@adminbot.com" or
 *     other compound strings that happen to contain a username
 *     substring.
 *   - Matching is CASE-INSENSITIVE — usernames are stored lowercase
 *     anyway but we normalize defensively.
 *
 * Why not also match by firstName / "@FirstName LastName"?
 *   It's tempting, but introduces ambiguity (two members with the
 *   same first name → both get tagged when only one was intended).
 *   The composer's autocomplete pushes users toward `@username`
 *   which is unambiguous. Plain-text "@John" stays unmatched and
 *   renders as normal text — same behavior as Slack / Discord.
 *
 * Returns:
 *   Array of unique user _id strings that the text mentions.
 */
function extractMentions(text, members) {
  if (!text || typeof text !== 'string') return [];
  if (!Array.isArray(members) || members.length === 0) return [];

  const lower = text.toLowerCase();
  const found = new Set();

  for (const m of members) {
    // members can be in two shapes:
    //   - the populated form `{ user: { _id, username, ... } }` (group route)
    //   - flat user docs `{ _id, username, ... }`               (DM / list)
    const u = m?.user && typeof m.user === 'object' ? m.user : m;
    const username = u?.username;
    if (!username) continue;

    const lowerName = String(username).toLowerCase();
    // Build a regex: lookbehind / lookahead on word boundaries so that
    // @bob matches in "hi @bob!" but not in "[email protected]".
    // Note: JS regex \b doesn't treat @ as a word boundary in the way
    // we want, so we use explicit character-class assertions.
    const escaped = lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9_])@${escaped}(?=$|[^a-z0-9_])`, 'i');
    if (re.test(lower)) {
      found.add(String(u._id));
    }
  }

  return Array.from(found);
}

module.exports = { extractMentions };
