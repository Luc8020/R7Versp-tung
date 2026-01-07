// Main application JavaScript for R7 Verspätung
// Uses real data from saarfahrplan HAFAS API

// API configuration
const API_BASE_URL = 'http://localhost:3000';

// Refresh interval (60 seconds for real data to avoid API rate limiting)
const REFRESH_INTERVAL = 60000;

// State
let autoRefreshInterval = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log('R7 Verspätung App initialized');
  initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
  // Setup event listeners
  setupEventListeners();
  
  // Check backend health and load data
  const isConnected = await checkBackendHealth();
  
  if (isConnected) {
    await loadAllData();
    startAutoRefresh();
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳ Laden...';
      loadAllData().finally(() => {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Aktualisieren';
      });
    });
  }
  
  // Stop filter
  const stopFilter = document.getElementById('stop-filter');
  if (stopFilter) {
    stopFilter.addEventListener('change', (e) => {
      filterDelays(e.target.value);
    });
  }
}

/**
 * Check backend API health
 */
async function checkBackendHealth() {
  const statusBar = document.getElementById('connection-status');
  const statusText = statusBar.querySelector('.status-text');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    
    if (data.status === 'OK') {
      statusBar.className = 'status-bar connected';
      statusText.textContent = 'Verbunden mit saarfahrplan API (Echtzeitdaten)';
      console.log('Backend status:', data);
      return true;
    }
  } catch (error) {
    console.error('Error connecting to backend:', error);
    statusBar.className = 'status-bar disconnected';
    statusText.textContent = 'Verbindung fehlgeschlagen - Backend nicht erreichbar';
    return false;
  }
  return false;
}

/**
 * Load all data (delays, summary, stops)
 */
async function loadAllData() {
  showLoadingState();
  
  await Promise.all([
    loadDelays(),
    loadSummary(),
    loadStops()
  ]);
  updateLastUpdateTime();
}

/**
 * Show loading state in table
 */
function showLoadingState() {
  const tbody = document.getElementById('delays-body');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">🔄 Echtzeitdaten werden geladen...</td></tr>';
}

/**
 * Load delay data from API
 */
async function loadDelays() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/delays`);
    const data = await response.json();
    
    if (data.success) {
      renderDelaysTable(data.data);
      // Store data for filtering
      window.delaysData = data.data;
      
      // Update connection status based on data source
      updateDataSourceStatus(data.isRealData, data.dataSource);
    } else {
      renderError('delays-body', data.error || 'Fehler beim Laden der Daten');
    }
  } catch (error) {
    console.error('Error loading delays:', error);
    renderError('delays-body', 'Fehler beim Laden der Verspätungsdaten');
  }
}

/**
 * Update data source status indicator
 */
function updateDataSourceStatus(isRealData, dataSource) {
  const statusBar = document.getElementById('connection-status');
  const statusText = statusBar.querySelector('.status-text');
  
  if (isRealData) {
    statusBar.className = 'status-bar connected';
    statusText.textContent = '🟢 ' + dataSource;
  } else {
    statusBar.className = 'status-bar connected simulated';
    statusText.textContent = '🟡 ' + dataSource;
  }
}

/**
 * Load route summary
 */
async function loadSummary() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/summary`);
    const data = await response.json();
    
    if (data.success) {
      renderSummary(data.summary);
    }
  } catch (error) {
    console.error('Error loading summary:', error);
  }
}

/**
 * Load stops for filter dropdown
 */
async function loadStops() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stops`);
    const data = await response.json();
    
    if (data.success) {
      populateStopFilter(data.data);
    }
  } catch (error) {
    console.error('Error loading stops:', error);
  }
}

/**
 * Render delays table
 */
function renderDelaysTable(delays) {
  const tbody = document.getElementById('delays-body');
  
  if (!delays || delays.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Keine Daten verfügbar</td></tr>';
    return;
  }
  
  tbody.innerHTML = delays.map(delay => {
    const hasData = delay.scheduledDeparture && !delay.error;
    const cancelledClass = delay.cancelled ? 'cancelled' : '';
    
    // Build remarks tooltip if available
    const remarksTooltip = delay.remarks && delay.remarks.length > 0 
      ? `title="${delay.remarks.join('; ')}"` 
      : '';
    
    // Show direction if available
    const directionInfo = delay.direction ? `<br><small class="direction">→ ${delay.direction}</small>` : '';
    
    if (!hasData) {
      return `
        <tr data-stop-id="${delay.stopId}" class="no-data">
          <td>${delay.stopOrder}</td>
          <td><strong>${delay.stopName}</strong>${delay.hafasName ? `<br><small class="hafas-name">${delay.hafasName}</small>` : ''}</td>
          <td colspan="4" class="no-service">
            ${delay.error ? `⚠️ ${delay.error}` : 'Keine R7-Verbindung gefunden'}
          </td>
        </tr>
      `;
    }
    
    return `
      <tr data-stop-id="${delay.stopId}" class="${cancelledClass}" ${remarksTooltip}>
        <td>${delay.stopOrder}</td>
        <td>
          <strong>${delay.stopName}</strong>
          ${delay.hafasName && delay.hafasName !== delay.stopName ? `<br><small class="hafas-name">${delay.hafasName}</small>` : ''}
          ${directionInfo}
        </td>
        <td>${formatTime(delay.scheduledDeparture)}</td>
        <td>${formatTime(delay.expectedArrival)}${delay.platform ? `<br><small>Gleis ${delay.platform}</small>` : ''}</td>
        <td class="delay-value ${getDelayClass(delay.delayMinutes)}">${delay.cancelled ? '❌ Ausfall' : formatDelay(delay.delayMinutes)}</td>
        <td><span class="status-badge ${delay.cancelled ? 'cancelled' : delay.status}">${delay.cancelled ? 'Ausfall' : getStatusText(delay.status)}</span></td>
      </tr>
    `;
  }).join('');
}

/**
 * Render summary cards
 */
function renderSummary(summary) {
  document.getElementById('avg-delay').textContent = `${summary.averageDelayMinutes} Min`;
  document.getElementById('max-delay').textContent = `${summary.maxDelayMinutes} Min`;
  document.getElementById('on-time-percentage').textContent = `${summary.onTimePercentage}%`;
  document.getElementById('stops-on-time').textContent = `${summary.stopsOnTime} / ${summary.stopsWithData || summary.totalStops}`;
}

/**
 * Populate stop filter dropdown
 */
function populateStopFilter(stops) {
  const select = document.getElementById('stop-filter');
  
  // Keep the "All" option
  select.innerHTML = '<option value="all">Alle Haltestellen</option>';
  
  stops.forEach(stop => {
    const option = document.createElement('option');
    option.value = stop.id;
    option.textContent = stop.name;
    select.appendChild(option);
  });
}

/**
 * Filter delays by stop
 */
function filterDelays(stopId) {
  const rows = document.querySelectorAll('#delays-body tr');
  
  rows.forEach(row => {
    if (stopId === 'all' || row.dataset.stopId === stopId) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Format time from ISO string
 */
function formatTime(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format delay in minutes
 */
function formatDelay(minutes) {
  if (minutes === 0 || minutes === undefined) return 'Pünktlich';
  return `+${minutes} Min`;
}

/**
 * Get CSS class for delay value
 */
function getDelayClass(minutes) {
  if (minutes === 0 || minutes === undefined) return 'no-delay';
  if (minutes <= 5) return 'small-delay';
  if (minutes <= 10) return 'medium-delay';
  return 'large-delay';
}

/**
 * Get German status text
 */
function getStatusText(status) {
  const statusMap = {
    'on-time': 'Pünktlich',
    'slight-delay': 'Leichte Verspätung',
    'delayed': 'Verspätet',
    'heavily-delayed': 'Stark verspätet',
    'unknown': 'Unbekannt',
    'cancelled': 'Ausfall'
  };
  return statusMap[status] || status;
}

/**
 * Update last update time display
 */
function updateLastUpdateTime() {
  const element = document.getElementById('last-update');
  const now = new Date();
  element.textContent = now.toLocaleTimeString('de-DE');
}

/**
 * Start auto-refresh
 */
function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  autoRefreshInterval = setInterval(async () => {
    console.log('Auto-refreshing real-time data...');
    await loadAllData();
  }, REFRESH_INTERVAL);
}

/**
 * Render error message
 */
function renderError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<tr><td colspan="6" class="loading" style="color: #dc3545;">⚠️ ${message}</td></tr>`;
  }
}
