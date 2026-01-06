// lib/api.ts - Centralized API configuration and utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ML_SERVER_URL = process.env.NEXT_PUBLIC_ML_SERVER_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Admin
  ADMIN_LOGIN: `${API_BASE_URL}/api/admin/login`,
  ADMIN_STATS: `${API_BASE_URL}/api/stats`,
  
  // Doctor
  DOCTOR_LOGIN: `${API_BASE_URL}/api/doctors/login`,
  DOCTOR_ME: `${API_BASE_URL}/api/doctors/me`,
  DOCTOR_STATS: `${API_BASE_URL}/api/stats/doctor`,
  DOCTORS_ALL: `${API_BASE_URL}/api/doctors/all`,
  
  // Workers
  WORKERS: `${API_BASE_URL}/api/workers`,
  
  // Donors
  DONORS: `${API_BASE_URL}/api/donors`,
  
  // Bot/AI
  BOT_CHAT: `${API_BASE_URL}/api/bot/chat`,
  BOT_ANALYZE: `${API_BASE_URL}/api/bot/analyze`,
  BOT_TTS: `${API_BASE_URL}/api/bot/tts`,
  
  // Health
  HEALTH: `${API_BASE_URL}/health`,
  
  // ML Server
  ML_CHAT: `${ML_SERVER_URL}/api/chat`,
  ML_ANALYZE: `${ML_SERVER_URL}/api/admin/analyze`,
  ML_TTS: `${ML_SERVER_URL}/api/tts`,
} as const;

// Helper function to get auth token
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token') || 
         localStorage.getItem('doctor_token') || 
         null;
};

// Helper function to get auth headers
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Centralized fetch wrapper with error handling
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Could not connect to server. Please check if the backend is running.');
    }
    throw error;
  }
};

// Login helper
export const login = async (identifier: string, password: string): Promise<{
  token: string;
  user: any;
  role: 'admin' | 'doctor' | 'user';
}> => {
  // Try admin login first (supports email OR mobile)
  try {
    const response = await apiCall(API_ENDPOINTS.ADMIN_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    
    const data = await response.json();
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    return { ...data, role: 'admin' };
  } catch (adminError) {
    // If admin login fails, try doctor login (email only)
    if (identifier.includes('@')) {
      try {
        const response = await apiCall(API_ENDPOINTS.DOCTOR_LOGIN, {
          method: 'POST',
          body: JSON.stringify({ email: identifier, password }),
        });
        
        const data = await response.json();
        localStorage.setItem('doctor_token', data.token);
        localStorage.setItem('doctor_user', JSON.stringify(data.user));
        return { ...data, role: 'doctor' };
      } catch (doctorError) {
        throw new Error('Invalid credentials. Please check your email/mobile and password.');
      }
    } else {
      throw new Error('Doctor login requires email address.');
    }
  }
};

// Clear all auth tokens
export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor_user');
  }
};
