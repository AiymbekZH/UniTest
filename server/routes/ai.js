const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

// Initialize OpenAI client — supports both direct OpenAI API and Azure
const getClient = () => {
  // Option 1: Direct OpenAI API (simplest — just OPENAI_API_KEY)
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.AI_MODEL || 'gpt-4o',
    };
  }

  // Option 2: Azure OpenAI
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    const { AzureOpenAI } = require('openai');
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    return {
      client: new AzureOpenAI({
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        apiVersion: '2025-04-01-preview',
        deployment,
      }),
      model: deployment,
    };
  }

  throw new Error('AI not configured. Set OPENAI_API_KEY (or AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY) in .env');
};

// POST /api/ai/generate — Generate test questions from text/image
router.post('/generate', auth, async (req, res) => {
  try {
    const { text, image, questionCount = 5, questionTypes = ['single-choice'], language = 'ru' } = req.body;

    if (!text && !image) {
      return res.status(400).json({ error: 'Provide text or image' });
    }

    const { client, model } = getClient();

    const langMap = { ru: 'Russian', en: 'English', kz: 'Kazakh' };
    const langName = langMap[language] || 'Russian';

    const typeDescriptions = {
      'single-choice': 'Single choice (one correct answer, 4 options)',
      'multiple-choice': 'Multiple choice (2-3 correct answers, 4-5 options)',
      'true-false': 'True/False with 3 options: True, False, Not stated',
      'fill-blank': 'Fill in the blank (student types the answer)',
      'matching': 'Matching pairs (4-5 pairs of left-right items)',
    };

    const requestedTypes = questionTypes
      .map(t => typeDescriptions[t] || t)
      .join('; ');

    const systemPrompt = `You are a professional test/quiz generator for an educational platform. 
Generate exactly ${questionCount} questions based on the provided content.

QUESTION TYPES to use: ${requestedTypes}
Distribute question types evenly across the requested types.

LANGUAGE: All question text, options, and answers MUST be in ${langName}.

RESPOND ONLY with a valid JSON array. No markdown, no code blocks, no explanation.
Each question object must follow this EXACT structure:

For single-choice:
{"type":"single-choice","questionText":"...","points":1,"options":[{"text":"...","isCorrect":false},{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}],"explanation":"..."}

For multiple-choice:
{"type":"multiple-choice","questionText":"...","points":2,"options":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":true},{"text":"...","isCorrect":false}],"explanation":"..."}

For true-false:
{"type":"true-false","questionText":"...","points":1,"options":[{"text":"True","isCorrect":true},{"text":"False","isCorrect":false},{"text":"Not stated","isCorrect":false}],"explanation":"..."}

For fill-blank:
{"type":"fill-blank","questionText":"Complete: ___ is the capital of France","points":1,"correctAnswer":"Paris","explanation":"..."}

For matching:
{"type":"matching","questionText":"Match the items","points":2,"options":[{"text":"Left1","isCorrect":true,"matchPair":"Right1"},{"text":"Left2","isCorrect":true,"matchPair":"Right2"}],"explanation":"..."}

Rules:
- questionText should be clear, educational, and well-formed
- explanation should briefly explain the correct answer
- For single-choice, exactly ONE option must have isCorrect:true
- For multiple-choice, 2-3 options must have isCorrect:true
- Provide 4 options for single/multiple choice
- Make wrong options plausible (not obviously wrong)
- Vary difficulty: mix easy, medium, and hard questions`;

    // Build message content
    const userContent = [];

    if (text) {
      userContent.push({
        type: 'text',
        text: `Generate ${questionCount} test questions based on this content:\n\n${text}`,
      });
    }

    if (image) {
      // image is base64 data URL (data:image/...;base64,...)
      const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
      userContent.push({
        type: 'image_url',
        image_url: { url: imageUrl, detail: 'high' },
      });
      if (!text) {
        userContent.push({
          type: 'text',
          text: `Generate ${questionCount} test questions based on this image. Extract all relevant educational content from the image and create questions.`,
        });
      }
    }

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_completion_tokens: 8192,
    });

    const raw = completion.choices[0]?.message?.content || '[]';

    // Parse JSON — strip markdown code blocks if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('AI response parse error:', parseErr.message, '\nRaw:', raw);
      return res.status(500).json({ error: 'Failed to parse AI response. Try again.' });
    }

    if (!Array.isArray(questions)) {
      questions = [questions];
    }

    // Add IDs and clean up
    const formatted = questions.map((q, i) => ({
      id: uuidv4(),
      type: q.type || 'single-choice',
      questionText: q.questionText || '',
      passage: q.passage || '',
      points: q.points || 1,
      options: (q.options || []).map(o => ({
        id: uuidv4(),
        text: o.text || '',
        isCorrect: !!o.isCorrect,
        matchPair: o.matchPair || '',
      })),
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      media: { type: '', url: '', fileName: '' },
      order: i,
    }));

    res.json({ questions: formatted });
  } catch (err) {
    console.error('AI generate error:', err.message);
    if (err.message.includes('not configured')) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

module.exports = router;
