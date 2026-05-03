import { io } from 'socket.io-client';

let socket = null;
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
  if (!token) return null;

  // If a socket already exists but its credential drifted from the current
  // localStorage token (account switch / refresh), tear it down so we can
  // reconnect with the fresh one.
  if (socket && lastUsedToken && lastUsedToken !== token) {
    try { socket.disconnect(); } catch (_) {}
    socket = null;
  }

  if (socket?.connected) return socket;
  if (socket) return socket; // mid-handshake — let it finish

  lastUsedToken = token;
  socket = io(window.location.origin, {
    // Function form is re-evaluated on every (re)connect attempt — this is
    // the only way socket.io exposes "use a fresh token" without nuking the
    // socket and rebuilding it.
    auth: (cb) => cb({ token: readToken() }),
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
