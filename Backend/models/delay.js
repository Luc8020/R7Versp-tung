/**
 * Delay Model - Fetches delay information for R7 bus stops
 * 
 * This model attempts to fetch real delay data from saarfahrplan HAFAS API.
 * If the API is not reachable (e.g., in development), it falls back to simulated data.
 * 
 * The R7 bus line runs between Zweibrücken and Homburg in Saarland.
 */

import { createClient } from 'hafas-client';
import { profile as saarfahrplanProfile } from 'hafas-client/p/saarfahrplan/index.js';

// Create HAFAS client with saarfahrplan profile
const userAgent = 'R7Verspaetung-App (github.com/Luc8020/R7Versp-tung)';
let hafasClient = null;
let useRealData = true;

try {
  hafasClient = createClient(saarfahrplanProfile, userAgent);
} catch (error) {
  console.warn('Failed to create HAFAS client:', error.message);
  useRealData = false;
}

// R7 bus stops between Zweibrücken and Homburg
// HAFAS IDs from saarfahrplan (will be used when API is accessible)
const R7_STOPS = [
  { id: '1', name: 'Zweibrücken Hauptbahnhof', searchName: 'Zweibrücken Hbf', hafasId: '8000472', order: 1 },
  { id: '2', name: 'Zweibrücken Rosengarten', searchName: 'Zweibrücken Rosengarten', hafasId: null, order: 2 },
  { id: '3', name: 'Einöd', searchName: 'Einöd', hafasId: null, order: 3 },
  { id: '4', name: 'Ingweiler', searchName: 'Ingweiler', hafasId: null, order: 4 },
  { id: '5', name: 'Bierbach', searchName: 'Bierbach', hafasId: null, order: 5 },
  { id: '6', name: 'Beeden', searchName: 'Beeden', hafasId: null, order: 6 },
  { id: '7', name: 'Homburg (Saar) Hauptbahnhof', searchName: 'Homburg Hbf', hafasId: '8000176', order: 7 }
];

// Cache for station IDs (discovered at runtime)
let stationCache = new Map();
let apiAvailable = null; // null = not tested, true = available, false = not available

/**
 * Check if the HAFAS API is reachable
 * @returns {Promise<boolean>}
 */
async function checkApiAvailability() {
  if (apiAvailable !== null) return apiAvailable;
  
  if (!hafasClient) {
    apiAvailable = false;
    return false;
  }
  
  try {
    // Try a simple location search
    await hafasClient.locations('Saarbrücken', { results: 1 });
    apiAvailable = true;
    console.log('✅ HAFAS API is available - using real-time data');
    return true;
  } catch (error) {
    apiAvailable = false;
    console.log('⚠️ HAFAS API not reachable - using simulated data');
    console.log('   Reason:', error.message);
    return false;
  }
}

/**
 * Search for a station by name and return its HAFAS ID
 * @param {string} name - Station name to search for
 * @returns {Promise<Object|null>} Station info or null
 */
async function findStation(name) {
  if (!await checkApiAvailability()) return null;
  
  if (stationCache.has(name)) {
    return stationCache.get(name);
  }
  
  try {
    const results = await hafasClient.locations(name, { results: 5 });
    if (results && results.length > 0) {
      // Find the best match (prefer stops over addresses)
      const station = results.find(r => r.type === 'stop') || results[0];
      stationCache.set(name, station);
      return station;
    }
  } catch (error) {
    console.error(`Error searching for station "${name}":`, error.message);
  }
  return null;
}

/**
 * Get departures from a specific station, filtered for R7 line
 * @param {string} stationId - HAFAS station ID
 * @param {number} duration - Duration in minutes to look ahead
 * @returns {Promise<Array>} Array of departures
 */
async function getDeparturesForStation(stationId, duration = 120) {
  if (!await checkApiAvailability()) return [];
  
  try {
    const departures = await hafasClient.departures(stationId, {
      duration: duration,
      results: 50
    });
    
    // Filter for R7 line only (various formats)
    const r7Departures = departures.departures.filter(dep => {
      const lineName = (dep.line?.name || dep.line?.product || '').toUpperCase();
      return lineName.includes('R7') || lineName.includes('R 7') || lineName === 'RE7' || lineName === 'RB7';
    });
    
    return r7Departures;
  } catch (error) {
    console.error(`Error getting departures for station ${stationId}:`, error.message);
    return [];
  }
}

/**
 * Calculate delay in minutes from departure data
 * @param {Object} departure - HAFAS departure object
 * @returns {Object} Delay information
 */
function calculateDelay(departure) {
  const scheduledTime = departure.plannedWhen ? new Date(departure.plannedWhen) : null;
  const actualTime = departure.when ? new Date(departure.when) : null;
  
  let delayMinutes = 0;
  if (departure.delay) {
    delayMinutes = Math.round(departure.delay / 60); // delay is in seconds
  } else if (scheduledTime && actualTime) {
    delayMinutes = Math.round((actualTime - scheduledTime) / (1000 * 60));
  }
  
  return {
    scheduledDeparture: scheduledTime ? scheduledTime.toISOString() : null,
    expectedDeparture: actualTime ? actualTime.toISOString() : (scheduledTime ? scheduledTime.toISOString() : null),
    delayMinutes: Math.max(0, delayMinutes),
    status: getDelayStatus(delayMinutes),
    cancelled: departure.cancelled || false,
    platform: departure.platform || departure.plannedPlatform || null,
    direction: departure.direction || null,
    lineName: departure.line?.name || 'R7',
    remarks: departure.remarks?.map(r => r.text) || []
  };
}

/**
 * Get delay status based on delay minutes
 * @param {number} delayMinutes - Delay in minutes
 * @returns {string} Status string
 */
function getDelayStatus(delayMinutes) {
  if (delayMinutes <= 0) return 'on-time';
  if (delayMinutes <= 5) return 'slight-delay';
  if (delayMinutes <= 10) return 'delayed';
  return 'heavily-delayed';
}

/**
 * Generate simulated delay data (fallback when API is not available)
 * @returns {Array} Array of delay objects with simulated data
 */
function generateSimulatedData() {
  const now = new Date();
  
  return R7_STOPS.map(stop => {
    // Simulate random delay between 0-15 minutes (with higher probability for smaller delays)
    const baseDelay = Math.floor(Math.random() * 16);
    const delay = baseDelay < 5 ? 0 : baseDelay; // 5/16 chance of no delay
    
    // Generate next scheduled departure (every 30 minutes)
    const minutes = now.getMinutes();
    const nextDeparture = new Date(now);
    const nextHalfHour = minutes < 30 ? 30 : 60;
    nextDeparture.setMinutes(nextHalfHour % 60);
    if (nextHalfHour === 60) {
      nextDeparture.setHours(nextDeparture.getHours() + 1);
    }
    nextDeparture.setSeconds(0);
    nextDeparture.setMilliseconds(0);
    
    // Calculate expected arrival based on delay
    const expectedArrival = new Date(nextDeparture);
    expectedArrival.setMinutes(expectedArrival.getMinutes() + delay);
    
    // Occasional cancellation (5% chance)
    const cancelled = Math.random() < 0.05;
    
    // Random direction
    const directions = ['Homburg (Saar) Hbf', 'Zweibrücken Hbf'];
    const direction = stop.order <= 3 ? directions[0] : directions[1];
    
    return {
      stopId: stop.id,
      stopName: stop.name,
      stopOrder: stop.order,
      hafasId: stop.hafasId,
      hafasName: stop.name,
      location: null,
      scheduledDeparture: nextDeparture.toISOString(),
      expectedArrival: expectedArrival.toISOString(),
      delayMinutes: cancelled ? 0 : delay,
      status: cancelled ? 'cancelled' : getDelayStatus(delay),
      cancelled: cancelled,
      platform: stop.order === 1 || stop.order === 7 ? String(Math.floor(Math.random() * 3) + 1) : null,
      direction: direction,
      lineName: 'R7',
      remarks: [],
      upcomingDepartures: [],
      lastUpdated: now.toISOString(),
      isSimulated: true
    };
  });
}

/**
 * Fetch real delay data for all R7 stops
 * Falls back to simulated data if API is not available
 * @returns {Promise<Array>} Array of delay objects for all stops
 */
async function fetchRealDelayData() {
  const isApiAvailable = await checkApiAvailability();
  
  // If API is not available, return simulated data
  if (!isApiAvailable) {
    console.log('Using simulated data');
    return generateSimulatedData();
  }
  
  const results = [];
  const now = new Date();
  
  for (const stop of R7_STOPS) {
    try {
      // Find the station using search name or regular name
      const station = await findStation(stop.searchName || stop.name);
      
      if (!station) {
        // Station not found - use stop's predefined HAFAS ID if available
        if (stop.hafasId) {
          const departures = await getDeparturesForStation(stop.hafasId);
          const processedDepartures = departures.map(dep => calculateDelay(dep));
          const nextDeparture = processedDepartures[0] || null;
          
          results.push({
            stopId: stop.id,
            stopName: stop.name,
            stopOrder: stop.order,
            hafasId: stop.hafasId,
            hafasName: stop.name,
            location: null,
            scheduledDeparture: nextDeparture?.scheduledDeparture || null,
            expectedArrival: nextDeparture?.expectedDeparture || null,
            delayMinutes: nextDeparture?.delayMinutes || 0,
            status: nextDeparture?.status || 'unknown',
            cancelled: nextDeparture?.cancelled || false,
            platform: nextDeparture?.platform,
            direction: nextDeparture?.direction,
            lineName: nextDeparture?.lineName || 'R7',
            remarks: nextDeparture?.remarks || [],
            upcomingDepartures: processedDepartures.slice(0, 5),
            lastUpdated: now.toISOString()
          });
        } else {
          results.push({
            stopId: stop.id,
            stopName: stop.name,
            stopOrder: stop.order,
            error: 'Station not found in HAFAS',
            departures: [],
            lastUpdated: now.toISOString()
          });
        }
        continue;
      }
      
      // Get departures for this station
      const departures = await getDeparturesForStation(station.id);
      
      // Process departures
      const processedDepartures = departures.map(dep => calculateDelay(dep));
      
      // Get the next departure info
      const nextDeparture = processedDepartures[0] || null;
      
      results.push({
        stopId: stop.id,
        stopName: stop.name,
        stopOrder: stop.order,
        hafasId: station.id,
        hafasName: station.name,
        location: station.location,
        scheduledDeparture: nextDeparture?.scheduledDeparture || null,
        expectedArrival: nextDeparture?.expectedDeparture || null,
        delayMinutes: nextDeparture?.delayMinutes || 0,
        status: nextDeparture?.status || 'unknown',
        cancelled: nextDeparture?.cancelled || false,
        platform: nextDeparture?.platform,
        direction: nextDeparture?.direction,
        lineName: nextDeparture?.lineName || 'R7',
        remarks: nextDeparture?.remarks || [],
        upcomingDepartures: processedDepartures.slice(0, 5),
        lastUpdated: now.toISOString()
      });
    } catch (error) {
      console.error(`Error processing stop ${stop.name}:`, error.message);
      results.push({
        stopId: stop.id,
        stopName: stop.name,
        stopOrder: stop.order,
        error: error.message,
        departures: [],
        lastUpdated: now.toISOString()
      });
    }
  }
  
  return results;
}

/**
 * Get all stops information
 * @returns {Array} Array of stop objects
 */
function getAllStops() {
  return R7_STOPS.map(stop => ({
    id: stop.id,
    name: stop.name,
    order: stop.order
  }));
}

/**
 * Get delay info for a specific stop
 * @param {string} stopId - Stop ID
 * @returns {Promise<Object|null>} Delay object or null if not found
 */
async function getDelayByStopId(stopId) {
  const allDelays = await fetchRealDelayData();
  return allDelays.find(d => d.stopId === stopId) || null;
}

/**
 * Search for stations by query
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching stations
 */
async function searchStations(query) {
  if (!await checkApiAvailability()) {
    // Return mock results when API is not available
    return R7_STOPS
      .filter(stop => stop.name.toLowerCase().includes(query.toLowerCase()))
      .map(stop => ({
        id: stop.hafasId || stop.id,
        name: stop.name,
        type: 'stop',
        location: null
      }));
  }
  
  try {
    const results = await hafasClient.locations(query, { results: 10 });
    return results.filter(r => r.type === 'stop').map(station => ({
      id: station.id,
      name: station.name,
      type: station.type,
      location: station.location
    }));
  } catch (error) {
    console.error('Error searching stations:', error.message);
    return [];
  }
}

/**
 * Check if using real data or simulated
 * @returns {Promise<boolean>}
 */
async function isUsingRealData() {
  return await checkApiAvailability();
}

export {
  fetchRealDelayData,
  getAllStops,
  getDelayByStopId,
  getDelayStatus,
  searchStations,
  isUsingRealData,
  R7_STOPS
};
