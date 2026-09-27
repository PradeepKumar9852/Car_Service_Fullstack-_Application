const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Main chat & voice-transcription intake endpoints (handles /api/chat and /api)
router.post('/chat', chatController.postChat);
router.post('/', chatController.postChat);

// GET discovery and info endpoints for browsers / status check
router.get('/chat', chatController.getChatInfo);
router.get('/', chatController.getChatInfo);

// Customer Assessment & Intake Form Submission endpoints
router.post('/assessment/submit', chatController.submitAssessment);
router.post('/customer', chatController.submitAssessment);
router.post('/intake', chatController.submitAssessment);

// Session endpoints
router.get('/session/:sessionId', chatController.getSession);
router.post('/session/reset', chatController.resetSession);
router.post('/session/:sessionId/reset', chatController.resetSession);

// Knowledge base endpoints
router.get('/knowledge-base', chatController.getKnowledgeBase);

// Health check endpoint
router.get('/health', chatController.healthCheck);

module.exports = router;
