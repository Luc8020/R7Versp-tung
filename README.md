# R7Verspätung

A web application to track and display delays of the R7 bus line between Zweibrücken and Homburg in Saarland, Germany.

![R7 Verspätung App](https://github.com/user-attachments/assets/205e2312-99fb-4ce9-a578-ac0d87027dea)

## Features

- **Real-time delay information** for all R7 stops between Zweibrücken and Homburg
- **Summary statistics** including average delay, maximum delay, and on-time percentage
- **Stop filtering** to focus on specific stops
- **Auto-refresh** every 60 seconds
- **Responsive design** that works on desktop and mobile devices
- **Graceful fallback** to simulated data when the real API is not reachable

## R7 Route Stops

1. Zweibrücken Hauptbahnhof
2. Zweibrücken Rosengarten
3. Einöd
4. Ingweiler
5. Bierbach
6. Beeden
7. Homburg (Saar) Hauptbahnhof

## Technology Stack

### Backend
- **Node.js** with Express.js
- **hafas-client** - Client for HAFAS public transport APIs
- **saarfahrplan profile** - Saarland-specific HAFAS configuration
- ES Modules

### Frontend
- Vanilla HTML, CSS, and JavaScript
- Responsive design
- Express.js for static file serving

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Luc8020/R7Versp-tung.git
cd R7Versp-tung
```

2. Install backend dependencies:
```bash
cd Backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../Frontend
npm install
```

### Running the Application

1. Start the backend server (default port: 3000):
```bash
cd Backend
npm start
```

2. In a new terminal, start the frontend server (default port: 8080):
```bash
cd Frontend
npm start
```

3. Open your browser and navigate to `http://localhost:8080`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/delays` | GET | Get delays for all R7 stops |
| `/api/stops` | GET | Get list of R7 stops |
| `/api/delays/:stopId` | GET | Get delay for a specific stop |
| `/api/summary` | GET | Get route summary with statistics |
| `/api/search?q=query` | GET | Search for stations |

## Data Source

This application uses the [saarfahrplan HAFAS API](https://www.saarfahrplan.de/) via the [hafas-client](https://github.com/public-transport/hafas-client) library to fetch real-time departure and delay information.

When the API is not reachable (e.g., in development environments without internet access), the application automatically falls back to simulated data.

## License

ISC