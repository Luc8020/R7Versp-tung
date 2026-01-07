// Main application JavaScript

// API configuration
const API_BASE_URL = 'http://localhost:3000';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log('R7 Verspätung App initialized');
  checkBackendHealth();
});

// Check backend API health
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    console.log('Backend status:', data);
  } catch (error) {
    console.error('Error connecting to backend:', error);
  }
}
