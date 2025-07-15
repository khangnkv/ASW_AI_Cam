// Frontend API configuration
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000'
  },
  production: {
    baseURL: 'https://aswaicam-production.up.railway.app'
  }
};

// Auto-detect environment based on hostname
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname.includes('netlify.app') || 
   window.location.hostname.includes('netlify.com') ||
   window.location.hostname !== 'localhost');

const environment = isProduction ? 'production' : 'development';
export const API_BASE_URL = API_CONFIG[environment].baseURL;

console.log('🔗 API Configuration:', {
  environment,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  baseURL: API_BASE_URL
});

export default API_CONFIG;