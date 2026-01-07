import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'R7Verspätung Backend API',
    description: 'API for R7 bus line delays between Zweibrücken and Homburg (Saarland)',
    version: '1.0.0',
    dataSource: 'saarfahrplan HAFAS API (real-time data)',
    endpoints: {
      health: '/api/health',
      delays: '/api/delays',
      stops: '/api/stops',
      delayByStop: '/api/delays/:stopId',
      summary: '/api/summary',
      search: '/api/search?q=<query>'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
