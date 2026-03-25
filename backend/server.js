require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const hospitalRoutes = require('./routes/hospitals');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database connection
db.initDB()
  .then(() => {
    console.log('PostgreSQL connected and initialized successfully');
  })
  .catch(err => {
    console.error('PostgreSQL connection error:', err);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
