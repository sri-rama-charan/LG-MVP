/**
 * @file server.js
 * @description Entry point for the generic Backend API.
 * Initializes Express, connects to MongoDB, and configures middleware/routes.
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// Middleware Configuration
// ==========================================
app.use(express.json()); // Parse JSON request bodies
app.use(cors());         // Enable Cross-Origin Resource Sharing (Frontend <-> Backend)
app.use(helmet());       // Security headers
app.use(morgan('dev'));  // HTTP Request logging

// ==========================================
// Database Connection
// ==========================================
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/leveragegroups_mvp')
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// Route Registration
// ==========================================
const apiRoutes = require('./routes/api');

// Mount API routes under /api/v1 prefix
app.use('/api/v1', apiRoutes);

// Health Check Endpoint
app.get('/', (req, res) => {
    res.send('Leveragegroups API MVP Running 🚀');
});

// ==========================================
// Server Start
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
