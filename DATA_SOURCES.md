# Data Sources and Fetching Strategy

## Overview

The R7Verspätung application uses a multi-tier approach to fetch delay information for the R7 bus line between Zweibrücken and Homburg in Saarland, Germany.

## Data Fetching Hierarchy

### 1. Primary Source: HAFAS API (Real-time Data)

The application's primary data source is the **saarfahrplan HAFAS API**, which provides real-time public transport information for the Saarland region.

- **Library**: `hafas-client` with `saarfahrplan` profile
- **Endpoint**: `https://saarfahrplan.de/bin/mgate.exe`
- **Data Type**: Real-time departures, delays, cancellations, and platform information
- **Advantages**: 
  - Official and accurate real-time data
  - Includes delay information, cancellations, and platform changes
  - Updated in real-time
- **Implementation**: `/Backend/models/delay.js`

The application automatically checks HAFAS API availability on startup and for each request. When available, it:
1. Searches for each R7 stop by name
2. Fetches upcoming departures filtered for the R7 line
3. Calculates delays based on scheduled vs. actual departure times
4. Returns structured delay information with timestamps

### 2. Fallback: Simulated Data

When the HAFAS API is not reachable (e.g., network issues, API downtime, or development environments without internet access), the application automatically falls back to **simulated data**.

- **Purpose**: Ensure the application remains functional for development and testing
- **Data Type**: Realistic simulated delays and departures
- **Characteristics**:
  - Random delays between 0-15 minutes (with higher probability for shorter delays)
  - Occasional cancellations (5% probability)
  - Scheduled departures at regular intervals
  - Marked with `isSimulated: true` flag
- **Implementation**: `generateSimulatedData()` function in `/Backend/models/delay.js`

## API Response Indicators

All API responses include a `dataSource` field and `isRealData` boolean flag to indicate which data source is being used:

**Real Data Response:**
```json
{
  "success": true,
  "dataSource": "saarfahrplan HAFAS API (Echtzeitdaten)",
  "isRealData": true,
  "data": [...]
}
```

**Simulated Data Response:**
```json
{
  "success": true,
  "dataSource": "Simulierte Daten (API nicht erreichbar)",
  "isRealData": false,
  "data": [...]
}
```

## Future Enhancements

### Web Scraping (Not Currently Implemented)

While web scraping of the saarfahrplan website could be added as an additional fallback layer, it is not currently implemented due to:

1. **Complexity**: HTML structure changes frequently, making scrapers fragile
2. **Terms of Service**: May violate the website's usage policies
3. **Maintenance**: Requires constant updates to match website changes
4. **Performance**: Slower than API access and simulated data
5. **Reliability**: Websites may have rate limiting or anti-scraping measures

If web scraping becomes necessary in the future, recommended approach:
- Add `cheerio` or `puppeteer` as a dependency
- Create a new module `/Backend/models/scraper.js`
- Insert as a fallback between API and simulated data
- Add appropriate rate limiting and error handling
- Document the scraping strategy and maintain robustness

## Testing Data Sources

### Test Real API Access
```bash
curl http://localhost:3000/api/delays
```

The response will indicate whether real or simulated data is being used.

### Test with API Check
```bash
curl http://localhost:3000/api/summary
```

Check the `isRealData` field in the response.

## Environment Configuration

Currently, no environment variables are required for data source configuration. The application automatically detects API availability.

Future configuration options could include:
- `FORCE_SIMULATED_DATA=true` - Force simulated data for testing
- `API_TIMEOUT=5000` - Configure API timeout (milliseconds)
- `ENABLE_SCRAPING=true` - Enable web scraping fallback (when implemented)
