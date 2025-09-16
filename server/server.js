const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const mcpRoutes = require('./routes/mcp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/build')));

// API Routes
app.use('/api/mcp', mcpRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server running successfully!' });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
