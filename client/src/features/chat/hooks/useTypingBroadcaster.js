import { useCallback, useRef } from 'react';
import { getSocket } from '../../../services/socket';

/**
 * Throttles outbound typing notifications. Without throttling, every
 * keystroke would emit a socket event — overkill, since the recipient
 * UI just needs to know "someone's typing in the last 3s". Pattern:
 *
 *   first key  → emit `typing` immediately
 *   subsequent → silent for `throttleMs` (default 2.5s)
 *   idle 3s    → auto-emit `stopTyping`
 *
 * The auto-stop matters because if the user starts typing then closes
 * the tab, the recipient would see "typing…" forever otherwise.
 */
export function useTypingBroadcaster({ kind, chatId, throttleMs = 2500, idleMs = 3000 }) {
  const lastSentRef = useRef(0);
  const idleTimerRef = useRef(null);

  const stop = useCallback(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;
    socket.emit(
      kind === 'dm' ? 'dm:stopTyping' : 'group:stopTyping',
      kind === 'dm' ? { conversationId: chatId } : { groupId: chatId }
    );
    lastSentRef.current = 0;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [kind, chatId]);

  const ping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    const now = Date.now();
    if (now - lastSentRef.current >= throttleMs) {
      socket.emit(
        kind === 'dm' ? 'dm:typing' : 'group:typing',
        kind === 'dm' ? { conversationId: chatId } : { groupId: chatId }
      );
      lastSentRef.current = now;
    }

    // Reset idle timer on every keystroke.
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stop, idleMs);
  }, [kind, chatId, throttleMs, idleMs, stop]);

  return { ping, stop };
}
