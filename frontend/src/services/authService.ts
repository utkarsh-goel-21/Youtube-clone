import api from './api';
import type { 
  AuthResponse, 
  LoginCredentials, 
  RegisterData, 
  UpdatePasswordData 
} from '../types/user';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async getCurrentUser(): Promise<{ user: any }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updatePassword(passwords: UpdatePasswordData): Promise<{ message: string }> {
    const response = await api.put('/auth/change-password', passwords);
    return response.data;
  },

  async refreshToken(): Promise<{ token: string }> {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  }
};