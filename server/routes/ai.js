const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const AiHistory = require('../models/AiHistory');

// Multer for file uploads (PDF, DOCX, TXT, images) — max 20MB
const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type. Use PDF, DOCX, TXT, or images.'));
  },
});

// Extract text from uploaded file
async function extractText(file) {
  const mime = file.mimetype;
  if (mime === 'application/pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  if (mime.includes('wordprocessingml') || mime === 'application/msword') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  if (mime === 'text/plain') {
    return file.buffer.toString('utf-8');
  }
  return null; // images handled separately
}

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

// POST /api/ai/generate — Generate test questions from text/file/image
router.post('/generate', auth, fileUpload.single('file'), async (req, res) => {
  try {
    const { text, image, questionCount = 5, questionTypes = '["single-choice"]', language = 'ru' } = req.body;
    
    // Parse questionTypes (could be JSON string from FormData)
    let parsedTypes;
    try {
      parsedTypes = typeof questionTypes === 'string' ? JSON.parse(questionTypes) : questionTypes;
    } catch { parsedTypes = ['single-choice']; }

    // Extract text from uploaded file
    let fileText = '';
    let fileImageBase64 = null;
    
    if (req.file) {
      if (req.file.mimetype.startsWith('image/')) {
        fileImageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else {
        fileText = await extractText(req.file) || '';
      }
    }

    const combinedText = [text, fileText].filter(Boolean).join('\n\n');
    const hasImage = image || fileImageBase64;

    if (!combinedText && !hasImage) {
      return res.status(400).json({ error: 'Provide text, file, or image' });
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

    const requestedTypes = parsedTypes
      .map(t => typeDescriptions[t] || t)
      .join('; ');

    const systemPrompt = `You are a professional test/quiz generator for an educational platform.
Generate exactly ${questionCount} questions based on the provided content.

QUESTION TYPES to use: ${requestedTypes}
Distribute question types evenly across the requested types.

LANGUAGE: All question text, options, and answers MUST be in ${langName}.

You MUST respond with a JSON object: {"questions": [...]}
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

    if (combinedText) {
      userContent.push({
        type: 'text',
        text: `Generate ${questionCount} test questions based on this content:\n\n${combinedText.substring(0, 15000)}`,
      });
    }

    const imageData = image || fileImageBase64;
    if (imageData) {
      const imageUrl = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
      userContent.push({
        type: 'image_url',
        image_url: { url: imageUrl, detail: 'high' },
      });
      if (!combinedText) {
        userContent.push({
          type: 'text',
          text: `Generate ${questionCount} test questions based on this image.`,
        });
      }
    }

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_completion_tokens: 16384,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    console.log('AI raw response (first 500 chars):', raw.substring(0, 500));

    // Parse JSON (response_format guarantees valid JSON)
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      // Fallback: extract JSON from response
      let cleaned = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {
          console.error('Parse error:', parseErr.message, '\nRaw:', raw.substring(0, 1000));
          return res.status(500).json({ error: 'Failed to parse AI response. Try again.' });
        }
      } else {
        console.error('Parse error:', parseErr.message, '\nRaw:', raw.substring(0, 1000));
        return res.status(500).json({ error: 'Failed to parse AI response. Try again.' });
      }
    }

    // Extract questions array from various response shapes
    let questions = parsed.questions || parsed.data || (Array.isArray(parsed) ? parsed : []);
    if (!Array.isArray(questions)) questions = [questions];
    if (questions.length === 0) {
      return res.status(500).json({ error: 'AI returned no questions. Try again.' });
    }

    // Add IDs and clean up
    const formatted = questions.map((q, i) => ({
      id: uuidv4(),
      type: q.type || 'single-choice',
      questionText: q.questionText || q.question || '',
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

    // Save history
    try {
      await AiHistory.create({
        user: req.user._id,
        prompt: combinedText ? combinedText.substring(0, 100) : (uploadedFile ? uploadedFile.name : 'Generated Test'),
        questions: formatted,
        count: formatted.length
      });
    } catch (dbErr) {
      console.error('Failed to save AI history:', dbErr);
    }

    res.json({ questions: formatted });
  } catch (err) {
    console.error('AI generate error:', err);
    if (err.message?.includes('not configured')) {
      return res.status(503).json({ error: err.message });
    }
    if (err.message?.includes('Unsupported file type')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'AI generation failed: ' + (err.message || 'Unknown error') });
  }
});

// Get AI history
router.get('/history', auth, async (req, res) => {
  try {
    const history = await AiHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(15);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки истории' });
  }
});

// Delete history entry
router.delete('/history/:id', auth, async (req, res) => {
  try {
    await AiHistory.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

// Clear all history
router.delete('/history', auth, async (req, res) => {
  try {
    await AiHistory.deleteMany({ user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при очистке' });
  }
});

// POST /api/ai/translate — Translate question + options to target languages
router.post('/translate', auth, async (req, res) => {
  try {
    const { questionText, options, passage, explanation, correctAnswer, targetLanguages } = req.body;
    if (!questionText || !targetLanguages?.length) {
      return res.status(400).json({ error: 'Provide questionText and targetLanguages' });
    }

    const { client, model } = getClient();

    const langMap = { ru: 'Russian', en: 'English', kz: 'Kazakh' };
    const langs = targetLanguages.map(l => langMap[l] || l).join(', ');

    // Build content to translate
    let contentToTranslate = `Question: ${questionText}`;
    if (options?.length) {
      contentToTranslate += '\nOptions:\n' + options.map((o, i) => `${i + 1}. ${o.text}`).join('\n');
    }
    if (passage) contentToTranslate += `\nPassage: ${passage}`;
    if (explanation) contentToTranslate += `\nExplanation: ${explanation}`;
    if (correctAnswer) contentToTranslate += `\nCorrect answer: ${correctAnswer}`;

    const systemPrompt = `You are a professional translator for an educational testing platform.
Translate the given content to: ${langs}.

Respond with JSON: { "translations": { "${targetLanguages.join('": {...}, "')}" : {...} } }

For each language, include:
- "questionText": translated question
${options?.length ? '- "options": [array of translated option texts in same order]' : ''}
${passage ? '- "passage": translated passage' : ''}
${explanation ? '- "explanation": translated explanation' : ''}
${correctAnswer ? '- "correctAnswer": translated correct answer' : ''}

Rules:
- Keep the meaning and tone identical
- Maintain all formatting (bold, lists, etc.)
- For Kazakh: use proper Қazaq grammar, not transliteration
- Translate naturally, not word-by-word`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentToTranslate }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(raw);

    res.json(result);
  } catch (err) {
    console.error('AI translate error:', err);
    if (err.message?.includes('not configured')) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Translation failed: ' + (err.message || 'Unknown error') });
  }
});

module.exports = router;
