// mindcare-combined/server/src/routes/assistant.routes.js
import express from 'express';
import { processAssistantQuery } from '../services/assistantService.js';

const router = express.Router();

router.post('/chat', async (req, res, next) => {
  try {
    const { message } = req.body;
    const userId = req.user?.id; // optional depending on your auth setup
    const response = await processAssistantQuery(userId, message);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;