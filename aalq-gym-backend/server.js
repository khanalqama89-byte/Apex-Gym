const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDB } = require('./db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Base health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Apex Physiques Gym API' });
});

// Mount main routes under /api
app.use('/api', routes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Connect to Database and start the server
async function startServer() {
  console.log('Initializing database connection...');
  await initDB();
  
  app.listen(PORT, () => {
    console.log(`Backend server successfully listening on port ${PORT}`);
  });
}

startServer();
