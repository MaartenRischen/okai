const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
// Note: Basic authentication has been removed
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
// Home page - AI News Feed
app.get('/', (req, res) => {
  res.render('index');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'AI Nexus News Feed',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`AI Nexus News Feed listening on port ${port}`);
}); 