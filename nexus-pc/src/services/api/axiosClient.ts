import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Create configured Axios instance
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available in local storage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nexus_auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Standard error logging or handling
    if (error.response?.status === 401) {
      // Handle unauthorized session
      console.warn('Unauthorized request intercepted.');
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
