import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  // 30s timeout — на медленной мобильной связи M0 Atlas + DO иногда отвечает за 10-20с.
  // Раньше было 15с и login падал с (canceled) до того как сервер успевал ответить.
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

function readCookie(name) {
  const prefix = `${name}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  const found = parts.find(part => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : '';
}

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('unitest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const csrfToken = readCookie('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

// Handle 401 errors (but not 403 bans)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('unitest_token');
      localStorage.removeItem('unitest_user');
      
      // Dispatch event to clear React state without a forced window redirect
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
