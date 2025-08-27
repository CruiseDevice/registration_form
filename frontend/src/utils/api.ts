import axios from 'axios';
import { UserCreate, UserLogin, Token, User, UserUpdate } from '../types/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: async (userData: UserCreate): Promise<User> => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  login: async (credentials: UserLogin): Promise<Token> => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/profile');
    return response.data;
  },

  updateProfile: async (userData: UserUpdate): Promise<User> => {
    const response = await api.put('/profile', userData);
    return response.data;
  },
};

export default api;