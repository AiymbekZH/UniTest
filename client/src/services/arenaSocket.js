import { io } from 'socket.io-client';

let arenaSocket = null;

export function connectArenaSocket({ arenaGuestToken } = {}) {
  if (arenaSocket?.connected) return arenaSocket;

  const token = localStorage.getItem('unitest_token');
  if (!token && !arenaGuestToken) return null;

  arenaSocket = io(window.location.origin, {
    auth: {
      token: token || undefined,
      arenaGuestToken: arenaGuestToken || undefined,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  return arenaSocket;
}

export function getArenaSocket() {
  return arenaSocket;
}

export function disconnectArenaSocket() {
  if (arenaSocket) {
    arenaSocket.disconnect();
    arenaSocket = null;
  }
}
