/**
 * Delay Controller - Handles API requests for R7 bus delay data
 * Uses real data from saarfahrplan HAFAS API when available, with fallback to simulated data
 */

import * as delay from '../models/delay.js';

/**
 * Get all delay information for all R7 stops
 */
async function getAllDelays(req, res) {
  try {
    const isRealData = await delay.isUsingRealData();
    const delays = await delay.fetchRealDelayData();
    
    // Calculate summary stats
    const validDelays = delays.filter(d => !d.error && d.scheduledDeparture);
    const totalDelays = validDelays.reduce((sum, d) => sum + d.delayMinutes, 0);
    const averageDelay = validDelays.length > 0 ? Math.round(totalDelays / validDelays.length) : 0;
    
    res.json({
      success: true,
      route: 'R7',
      routeDescription: 'Zweibrücken - Homburg (Saarland)',
      totalStops: delays.length,
      dataSource: isRealData ? 'saarfahrplan HAFAS API (Echtzeitdaten)' : 'Simulierte Daten (API nicht erreichbar)',
      isRealData: isRealData,
      data: delays,
      summary: {
        averageDelayMinutes: averageDelay,
        stopsWithData: validDelays.length,
        stopsWithoutData: delays.length - validDelays.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching delays:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delay information',
      message: error.message
    });
  }
}

/**
 * Get all R7 bus stops
 */
function getStops(req, res) {
  try {
    const stops = delay.getAllStops();
    res.json({
      success: true,
      route: 'R7',
      data: stops,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stops information'
    });
  }
}

/**
 * Get delay for a specific stop
 */
async function getDelayByStop(req, res) {
  try {
    const { stopId } = req.params;
    const isRealData = await delay.isUsingRealData();
    const delayData = await delay.getDelayByStopId(stopId);
    
    if (!delayData) {
      return res.status(404).json({
        success: false,
        error: 'Stop not found'
      });
    }
    
    res.json({
      success: true,
      route: 'R7',
      dataSource: isRealData ? 'saarfahrplan HAFAS API (Echtzeitdaten)' : 'Simulierte Daten',
      isRealData: isRealData,
      data: delayData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching delay for stop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delay information for stop',
      message: error.message
    });
  }
}

/**
 * Get route summary with statistics
 */
async function getRouteSummary(req, res) {
  try {
    const isRealData = await delay.isUsingRealData();
    const delays = await delay.fetchRealDelayData();
    const validDelays = delays.filter(d => !d.error && d.scheduledDeparture);
    
    const totalDelays = validDelays.reduce((sum, d) => sum + d.delayMinutes, 0);
    const averageDelay = validDelays.length > 0 ? Math.round(totalDelays / validDelays.length) : 0;
    const maxDelay = validDelays.length > 0 ? Math.max(...validDelays.map(d => d.delayMinutes)) : 0;
    const onTimeCount = validDelays.filter(d => d.delayMinutes === 0).length;
    const cancelledCount = delays.filter(d => d.cancelled).length;
    
    res.json({
      success: true,
      route: 'R7',
      routeDescription: 'Zweibrücken - Homburg (Saarland)',
      dataSource: isRealData ? 'saarfahrplan HAFAS API (Echtzeitdaten)' : 'Simulierte Daten',
      isRealData: isRealData,
      summary: {
        totalStops: delays.length,
        stopsWithData: validDelays.length,
        averageDelayMinutes: averageDelay,
        maxDelayMinutes: maxDelay,
        onTimePercentage: validDelays.length > 0 ? Math.round((onTimeCount / validDelays.length) * 100) : 0,
        stopsOnTime: onTimeCount,
        stopsDelayed: validDelays.length - onTimeCount,
        cancelledServices: cancelledCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching route summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch route summary',
      message: error.message
    });
  }
}

/**
 * Search for stations
 */
async function searchStations(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }
    
    const stations = await delay.searchStations(q);
    res.json({
      success: true,
      query: q,
      results: stations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error searching stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search stations',
      message: error.message
    });
  }
}

export {
  getAllDelays,
  getStops,
  getDelayByStop,
  getRouteSummary,
  searchStations
};
