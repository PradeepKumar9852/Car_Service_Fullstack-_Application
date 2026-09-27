const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');
const env = require('./config/env');

const app = express();

// CORS configuration (allow requests from React frontend on port 5173, etc.)
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', chatRoutes);

// Root Health & Welcome
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: env.SERVICE_CENTER_NAME,
    message: 'Precision AutoCare Voice & Chat Agent Backend API is active.',
    endpoints: {
      chat: '/api/chat',
      knowledgeBase: '/api/knowledge-base',
      health: '/api/health'
    }
  });
});

// 404 Handler for undefined API routes
app.use(['/api/*', '/api'], (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route ${req.method} ${req.originalUrl} not found.`,
    availableEndpoints: {
      chat: { url: '/api/chat', method: 'POST', infoUrl: '/api/chat (GET)' },
      assessment: { url: '/api/assessment/submit', method: 'POST' },
      knowledgeBase: { url: '/api/knowledge-base', method: 'GET' },
      health: { url: '/api/health', method: 'GET' },
      session: { url: '/api/session/:sessionId', method: 'GET' }
    },
    webInterface: 'http://localhost:5173'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Backend Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
