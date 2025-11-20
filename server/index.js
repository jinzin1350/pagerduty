require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// Import services
const { startEmailMonitoring } = require('./services/emailMonitor');

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/emails');
const phoneRoutes = require('./routes/phoneNumbers');
const callRoutes = require('./routes/calls');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/phone-numbers', phoneRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start email monitoring cron job (every 2 minutes)
const emailPollInterval = process.env.EMAIL_POLL_INTERVAL_MINUTES || 2;
cron.schedule(`*/${emailPollInterval} * * * *`, async () => {
  console.log(`[${new Date().toISOString()}] Running email monitoring check...`);
  try {
    await startEmailMonitoring();
  } catch (error) {
    console.error('Email monitoring error:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Email monitoring: Every ${emailPollInterval} minutes`);
  console.log('---');

  // Run initial email check on startup
  startEmailMonitoring().catch(console.error);
});
