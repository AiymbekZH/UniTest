import { io } from 'socket.io-client';

let socket = null;
// `lastUsedToken` is a cache key used to detect credential drift. We use the
// localStorage token when present; otherwise we use a constant sentinel for
// the cookie-only path (Google OAuth) — so a switch from cookie-auth to
// localStorage-auth (or vice versa) still triggers a reconnect.
const COOKIE_AUTH_SENTINEL = '__cookie__';
let lastUsedToken = null;

// Read fresh token on every (re)connect attempt — including socket.io's own
// auto-reconnects after a transient network drop. Without this, a token
// rotated mid-session (e.g. after `applyActiveSession`) would silently keep
// the socket on the stale credential and the server's `io.use` middleware
// would dump it on AUTH_FAILED, leaving the user with a "connected" client
// that the server never sees.
function readToken() {
  try {
    return localStorage.getItem('unitest_token') || null;
  } catch (_) {
    return null;
  }
}

export function connectSocket() {
  const token = readToken();
  // No localStorage token does NOT mean "unauthenticated" — Google OAuth
  // users authenticate via the httpOnly `unitest_token` cookie which JS
  // can't read. The server's socket middleware falls back to that cookie
  // (see server/index.js → io.use), so we still try to connect; the
  // browser will attach the cookie automatically because of withCredentials.
  const credKey = token || COOKIE_AUTH_SENTINEL;

  // If a socket already exists but its credential drifted (account switch,
  // localStorage→cookie or vice-versa), tear it down so we can reconnect
  // with the fresh credential.
  if (socket && lastUsedToken && lastUsedToken !== credKey) {
    try { socket.disconnect(); } catch (_) {}
    socket = null;
  }

  if (socket?.connected) return socket;
  if (socket) return socket; // mid-handshake — let it finish

  lastUsedToken = credKey;
  socket = io(window.location.origin, {
    // Function form is re-evaluated on every (re)connect attempt — this is
    // the only way socket.io exposes "use a fresh token" without nuking the
    // socket and rebuilding it.
    auth: (cb) => cb({ token: readToken() }),
    // Required so the browser includes our auth cookie on the WebSocket
    // handshake. Without this, the cookie is dropped and Google OAuth
    // sessions can't authenticate the socket.
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Auth error:', err.message);
    // If the server told us the request was unauthenticated (no token in
    // localStorage AND no usable cookie), there's no point in retrying —
    // the user is genuinely not logged in. Drop the socket so the next
    // login can start fresh.
    if (err?.message === 'AUTH_REQUIRED' || err?.message === 'AUTH_FAILED') {
      try { socket.disconnect(); } catch (_) {}
      socket = null;
      lastUsedToken = null;
    }
  });

  return socket;
}

export function getSocket() {
  return socket;
}

// Force a full reconnect with whatever is currently in localStorage. Call
// this from the AuthContext after `applyActiveSession` / `removeActiveSession`
// so the chat surface stops talking to the server as the previous user.
export function refreshSocketAuth() {
  if (socket) {
    try { socket.disconnect(); } catch (_) {}
    socket = null;
    lastUsedToken = null;
  }
  return connectSocket();
}

export function disconnectSocket() {
  if (socket) {
    try { socket.disconnect(); } catch (_) {}
    socket = null;
    lastUsedToken = null;
  }
}
