import axios from 'axios';

// API Base URL - defaults to production backend if not specified
// For local development, set NEXT_PUBLIC_API_URL=http://localhost:5001/api in .env.local
// For Vercel deployment, set NEXT_PUBLIC_API_URL in Vercel dashboard
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://medicare-pro-neon.vercel.app/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string; role?: string }) => 
    api.post('/auth/login', credentials),
  register: (userData: any) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  uploadProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return api.post('/users/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteProfilePicture: () => api.delete('/users/profile/picture'),
  getPatients: (params?: any) => api.get('/users/patients', { params }),
  getPatientsStats: () => api.get('/users/patients/stats'), // Get all patient stats in one call
  getDoctors: (params?: any) => api.get('/users/doctors', { params }),
  getUser: (id: string) => api.get(`/users/${id}`),
};

// Health Metrics API
export const healthMetricsAPI = {
  getMetrics: (params?: any) => api.get('/health-metrics', { params }),
  getPatientMetrics: (patientId: string, params?: any) => 
    api.get(`/health-metrics/patient/${patientId}`, { params }),
  addMetric: (data: any) => api.post('/health-metrics', data),
  getSummary: (params?: any) => api.get('/health-metrics/summary', { params }),
  updateMetric: (id: string, data: any) => api.put(`/health-metrics/${id}`, data),
  deleteMetric: (id: string) => api.delete(`/health-metrics/${id}`),
  getHospitalOverview: (params?: any) => api.get('/health-metrics/hospital/overview', { params }),
};

// Alerts API
export const alertsAPI = {
  getAlerts: (params?: any) => api.get('/alerts', { params }),
  getPatientAlerts: (patientId: string, params?: any) => 
    api.get(`/alerts/patient/${patientId}`, { params }),
  createAlert: (data: any) => api.post('/alerts', data),
  acknowledgeAlert: (id: string, data?: any) => api.put(`/alerts/${id}/acknowledge`, data),
  resolveAlert: (id: string, data?: any) => api.put(`/alerts/${id}/resolve`, data),
  dismissAlert: (id: string, data?: any) => api.put(`/alerts/${id}/dismiss`, data),
  markAsRead: (id: string) => api.put(`/alerts/${id}/read`),
  getSummary: () => api.get('/alerts/summary'),
};

// Consent API
export const consentAPI = {
  getConsent: () => api.get('/consent'),
  updateConsent: (data: any) => api.put('/consent', data),
  addEmergencyContact: (data: any) => api.post('/consent/emergency-contacts', data),
  removeEmergencyContact: (contactId: string) => 
    api.delete(`/consent/emergency-contacts/${contactId}`),
  checkConsent: (dataType: string) => api.get(`/consent/check/${dataType}`),
  checkNotification: (notificationType: string) => 
    api.get(`/consent/notification/${notificationType}`),
};

// Appointments API
export const appointmentsAPI = {
  getAppointments: (params?: any) => api.get('/appointments', { params }),
  createAppointment: (data: any) => api.post('/appointments', data),
  updateAppointment: (id: string, data: any) => api.put(`/appointments/${id}`, data),
  deleteAppointment: (id: string) => api.delete(`/appointments/${id}`),
  getUpcoming: () => api.get('/appointments/upcoming'),
};

// Data Generator API
export const dataGeneratorAPI = {
  generateHealthMetrics: (data: any) => api.post('/data-generator/health-metrics', data),
  simulateDevice: (data: any) => api.post('/data-generator/simulate-device', data),
};

// Messages API (for chat functionality)
export const messagesAPI = {
  getMessages: (params?: any) => api.get('/messages', { params }),
  getConversations: () => api.get('/messages/conversations'),
  sendMessage: (data: any) => api.post('/messages', data),
  uploadFile: (file: File, receiverId: string, content?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', receiverId);
    if (content) {
      formData.append('content', content);
    }
    return api.post('/messages/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  markAsRead: (id: string) => api.put(`/messages/${id}/read`),
  markConversationAsRead: (userId: string) => 
    api.put(`/messages/conversation/${userId}/read-all`),
  getUnreadCount: () => api.get('/messages/unread-count'),
  clearConversation: (userId: string) => api.delete(`/messages/conversation/${userId}`),
  addReaction: (messageId: string, emoji: string) => 
    api.post(`/messages/${messageId}/reaction`, { emoji }),
};

export default api;

