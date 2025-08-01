import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  join: (data) => api.post('/auth/join', data),
  leave: () => api.post('/auth/leave'),
  getMe: () => api.get('/auth/me'),
};

// Session API
export const sessionAPI = {
  create: (data) => api.post('/sessions/create', data),
  join: (data) => api.post('/sessions/join', data),
  leave: () => api.post('/sessions/leave'),
  getCurrent: () => api.get('/sessions/current'),
  getParticipants: (sessionId) => api.get(`/sessions/${sessionId}/participants`),
  end: (sessionId) => api.post(`/sessions/${sessionId}/end`),
  getHistory: (params) => api.get('/sessions/history', { params }),
};

// Poll API
export const pollAPI = {
  create: (data) => api.post('/polls/create', data),
  vote: (pollId, data) => api.post(`/polls/${pollId}/vote`, data),
  getCurrent: () => api.get('/polls/current'),
  getHistory: (params) => api.get('/polls/history', { params }),
  end: () => api.post('/polls/end'),
};

// Chat API
export const chatAPI = {
  getMessages: (params) => api.get('/chat/messages', { params }),
  sendMessage: (data) => api.post('/chat/send', data),
  deleteMessage: (messageId) => api.delete(`/chat/${messageId}`),
};

// Users API
export const usersAPI = {
  getParticipants: () => api.get('/users/participants'),
  kickUser: (userId) => api.post(`/users/kick/${userId}`),
  getStats: () => api.get('/users/stats'),
};

export default api;