import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('unitest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      const publicAuthPaths = [
        'login',
        'register',
        'forgot-password',
        'reset-password'
      ];

      const isPublicAuthPage = publicAuthPaths.some(path => window.location.href.toLowerCase().includes(path));

      if (!isPublicAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
