import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error("Warning: GROQ_API_KEY is not defined in your environment or .env file.");
}

const groq = new Groq({ apiKey });

app.post('/api/assistant', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = {
      role: 'system',
      content: `You are an expert, knowledgeable, and reliable AI assistant.
Rules:
1. Provide accurate, direct, and complete answers to any topic asked.
2. Structure your response clearly using headers, bullet points, or code blocks where applicable.
3. If an answer is uncertain, state the limitation directly.`
    };

    const completion = await groq.chat.completions.create({
      model: 'groq/compound',
      messages: [
        systemPrompt,
        ...history,
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated.';
    res.json({ reply });
  } catch (error) {
    console.error('Assistant API error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
