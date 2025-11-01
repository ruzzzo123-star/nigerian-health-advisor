import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Voice Health Advisor API is running' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { model, max_tokens, system, messages } = req.body;

    console.log('📩 Received chat request');
    console.log('Model:', model);
    console.log('Messages:', messages?.length || 0);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const response = await anthropic.messages.create({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 1024,
      system: system || 'You are a helpful health advisor.',
      messages: messages,
    });

    console.log('✅ Claude response received');
    res.json(response);
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get response from Claude',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔑 API Key loaded: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No'}`);
});

