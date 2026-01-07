import express from 'express';
import * as delayController from '../controllers/delayController.js';

const router = express.Router();

// R7 Bus Delay Routes

// Get all delays for all stops
router.get('/delays', delayController.getAllDelays);

// Get all R7 stops
router.get('/stops', delayController.getStops);

// Search for stations
router.get('/search', delayController.searchStations);

// Get delay for a specific stop
router.get('/delays/:stopId', delayController.getDelayByStop);

// Get route summary with statistics
router.get('/summary', delayController.getRouteSummary);

export default router;
