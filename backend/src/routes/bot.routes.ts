import { Router } from 'express';
import { analyzeSystem, speakText, chatWithBot, translateText } from '../controllers/bot.controller';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Admin-only: System analysis
router.post('/analyze', authenticateToken, requireAdmin(), analyzeSystem);

// Role-based chat - optional auth for context, public access allowed
router.post('/chat', optionalAuth, chatWithBot);

// Public/Authenticated: Text-to-speech
router.post('/tts', optionalAuth, speakText);

// Public: Translation endpoint
router.post('/translate', optionalAuth, translateText); // Make public or optionalAuth so ml-client can use it

export default router;
