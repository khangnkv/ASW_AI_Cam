// Frontend API configuration
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000'
  },
  production: {
    baseURL: 'https://your-railway-backend.railway.app'  // Replace with your Railway URL
  }
};

const environment = import.meta.env.MODE || 'development';
export const API_BASE_URL = API_CONFIG[environment as keyof typeof API_CONFIG].baseURL;

export default API_CONFIG;