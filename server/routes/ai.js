const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const AiHistory = require('../models/AiHistory');
const SUPPORTED_AI_LANGUAGES = {
  ru: 'Russian',
  en: 'English',
  kz: 'Kazakh',
  es: 'Spanish'
};

const TRUE_FALSE_LABELS = {
  ru: ['Верно', 'Неверно', 'Не указано'],
  en: ['True', 'False', 'Not given'],
  kz: ['Дұрыс', 'Бұрыс', 'Берілмеген'],
  es: ['Verdadero', 'Falso', 'No se indica']
};

const TRUE_FALSE_CATEGORY_KEYWORDS = {
  true: ['true', 'verdadero', 'верно', 'дұрыс'],
  false: ['false', 'falso', 'неверно', 'бұрыс'],
  notGiven: [
    'not given',
    'not stated',
    'not specified',
    'not mentioned',
    'not provided',
    'не указано',
    'не дано',
    'не уверен',
    'берілмеген',
    'көрсетілмеген',
    'no se indica',
    'no se menciona',
    'no se especifica'
  ]
};

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

function normalizeString(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeComparisonText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-zа-яёқғүұөһáéíóúñ0-9]+/gi, ' ')
    .trim();
}

function normalizeGeneratedType(value = '') {
  const normalized = normalizeComparisonText(value);
  if (!normalized) return 'single-choice';
  if (normalized.includes('single')) return 'single-choice';
  if (normalized.includes('multiple')) return 'multiple-choice';
  if (normalized.includes('true') || normalized.includes('false') || normalized.includes('verdadero') || normalized.includes('верно')) return 'true-false';
  if (normalized.includes('fill')) return 'fill-blank';
  if (normalized.includes('matching') || normalized.includes('match') || normalized.includes('сопостав')) return 'matching';
  return 'single-choice';
}

function detectTrueFalseCategory(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeComparisonText(candidate);
    if (!normalized) continue;

    for (const [category, keywords] of Object.entries(TRUE_FALSE_CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => normalized.includes(keyword))) {
        return category;
      }
    }
  }

  return null;
}

function buildCanonicalTrueFalseOptions(options = [], language = 'ru') {
  const labels = TRUE_FALSE_LABELS[language] || TRUE_FALSE_LABELS.ru;
  const correctOption = options.find(option => option?.isCorrect);
  const correctCategory = detectTrueFalseCategory(
    correctOption?.text,
    ...options.map(option => option?.text)
  );
  const orderedCategories = ['true', 'false', 'notGiven'];

  return orderedCategories.map((category, index) => ({
    id: uuidv4(),
    text: labels[index],
    isCorrect: correctCategory
      ? correctCategory === category
      : Boolean(options[index]?.isCorrect),
    matchPair: '',
  }));
}

function parseQuestionPlan(questionPlan, questionCount, questionTypes) {
  let parsedPlan = {};

  try {
    parsedPlan = typeof questionPlan === 'string'
      ? JSON.parse(questionPlan || '{}')
      : (questionPlan || {});
  } catch {
    parsedPlan = {};
  }

  const normalizedPlan = Object.entries(parsedPlan).reduce((acc, [type, count]) => {
    const normalizedType = normalizeGeneratedType(type);
    const normalizedCount = Number(count);
    if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) return acc;
    acc[normalizedType] = (acc[normalizedType] || 0) + Math.floor(normalizedCount);
    return acc;
  }, {});

  if (Object.keys(normalizedPlan).length > 0) {
    return normalizedPlan;
  }

  let parsedTypes;
  try {
    parsedTypes = typeof questionTypes === 'string' ? JSON.parse(questionTypes) : questionTypes;
  } catch {
    parsedTypes = ['single-choice'];
  }

  const fallbackTypes = Array.isArray(parsedTypes) && parsedTypes.length > 0
    ? parsedTypes.map(type => normalizeGeneratedType(type))
    : ['single-choice'];
  const totalQuestions = Math.max(1, Number(questionCount) || 5);
  const baseCount = Math.floor(totalQuestions / fallbackTypes.length);
  const remainder = totalQuestions % fallbackTypes.length;

  return fallbackTypes.reduce((acc, type, index) => {
    acc[type] = (acc[type] || 0) + baseCount + (index < remainder ? 1 : 0);
    return acc;
  }, {});
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
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
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
    if (!req.user.aiAccess && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'У вас нет доступа к AI функциям. Обратитесь к администратору.' });
    }

    const {
      text,
      image,
      questionCount = 5,
      questionTypes = '["single-choice"]',
      questionPlan = '{}',
      difficultyLevel = 3,
      language = 'ru'
    } = req.body;
    const normalizedPlan = parseQuestionPlan(questionPlan, questionCount, questionTypes);
    const requestedTypeEntries = Object.entries(normalizedPlan).filter(([, count]) => count > 0);
    const totalQuestions = requestedTypeEntries.reduce((sum, [, count]) => sum + count, 0);

    if (totalQuestions <= 0) {
      return res.status(400).json({ error: 'Select at least one question type with a positive count' });
    }

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

    const langName = SUPPORTED_AI_LANGUAGES[language] || SUPPORTED_AI_LANGUAGES.ru;
    const normalizedDifficulty = Math.min(5, Math.max(1, Number(difficultyLevel) || 3));
    const difficultyDescriptions = {
      1: 'Very easy. Basic recall, direct facts, simple recognition.',
      2: 'Easy. Introductory understanding with light reasoning.',
      3: 'Medium. Balanced difficulty for standard assessment.',
      4: 'Hard. Multi-step reasoning, inference, deeper understanding.',
      5: 'Very hard. Expert-level nuance, synthesis, and edge cases.'
    };

    const typeDescriptions = {
      'single-choice': 'Single choice (one correct answer, 4 options)',
      'multiple-choice': 'Multiple choice (2-3 correct answers, 4-5 options)',
      'true-false': `True/False with 3 options in this exact order: ${TRUE_FALSE_LABELS[language]?.join(', ') || TRUE_FALSE_LABELS.ru.join(', ')}`,
      'fill-blank': 'Fill in the blank (student types the answer)',
      'matching': 'Matching pairs (4-5 pairs of left-right items)',
    };

    const requestedTypes = requestedTypeEntries
      .map(([type, count]) => `${count} x ${typeDescriptions[type] || type}`)
      .join('; ');

    const systemPrompt = `You are a professional test/quiz generator for an educational platform.
Generate exactly ${totalQuestions} questions based on the provided content.

QUESTION DISTRIBUTION:
${requestedTypes}

The distribution MUST match exactly.

TARGET DIFFICULTY LEVEL: ${normalizedDifficulty}/5
${difficultyDescriptions[normalizedDifficulty]}

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
- Follow the requested difficulty level consistently
- If the source already contains ready-made questions, answer options, matching pairs, or answer keys, extract and copy them as faithfully as possible into the requested JSON schema
- Preserve the original wording and correct answers as closely as possible when they already exist in the source
- Only generate brand-new questions when the source does not already contain enough ready-made questions for the requested amount or requested types
- Do not add markdown, comments, or text outside the JSON object`;

    // Build message content
    const userContent = [];

    if (combinedText) {
      userContent.push({
        type: 'text',
        text: `Generate exactly ${totalQuestions} test questions with this exact distribution: ${requestedTypes}. Difficulty level: ${normalizedDifficulty}/5. If the material already contains ready-made questions or answers, extract and copy them first. Keep the wording and correct answers as close to the source as possible. Only generate missing questions if the source does not provide enough ready-made ones.\n\n${combinedText.substring(0, 15000)}`,
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
          text: `Generate exactly ${totalQuestions} test questions from this image with this exact distribution: ${requestedTypes}. Difficulty level: ${normalizedDifficulty}/5. If the image contains ready-made questions or answer keys, extract and copy them first as faithfully as possible. Only generate missing questions if the image does not provide enough ready-made ones.`,
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
    const formatted = questions.map((q, i) => {
      const type = normalizeGeneratedType(q.type || q.questionType || '');
      const normalizedOptions = type === 'true-false'
        ? buildCanonicalTrueFalseOptions(Array.isArray(q.options) ? q.options : [], language)
        : (q.options || []).map(option => ({
            id: uuidv4(),
            text: normalizeString(option?.text),
            isCorrect: !!option?.isCorrect,
            matchPair: normalizeString(option?.matchPair),
          }));

      return {
        id: uuidv4(),
        type,
        questionText: q.questionText || q.question || '',
        passage: q.passage || '',
        points: q.points || 1,
        options: normalizedOptions,
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        media: { type: '', url: '', fileName: '' },
        order: i,
      };
    });

    const remainingByType = { ...normalizedPlan };
    const filteredQuestions = [];

    for (const question of formatted) {
      if (!remainingByType[question.type]) continue;
      filteredQuestions.push(question);
      remainingByType[question.type] -= 1;
    }

    if (filteredQuestions.length !== totalQuestions || Object.values(remainingByType).some(count => count > 0)) {
      return res.status(500).json({ error: 'AI returned an invalid question mix. Please try again.' });
    }

    // Save history
    try {
      await AiHistory.create({
        user: req.user._id,
        prompt: combinedText ? combinedText.substring(0, 100) : (req.file?.originalname || 'Generated Test'),
        questions: filteredQuestions,
        count: filteredQuestions.length
      });
    } catch (dbErr) {
      console.error('Failed to save AI history:', dbErr);
    }

    res.json({ questions: filteredQuestions });
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
    if (!req.user.aiAccess && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'У вас нет доступа к AI функциям. Обратитесь к администратору.' });
    }

    const {
      questionText = '',
      options = [],
      matchingPairs = [],
      passage = '',
      explanation = '',
      correctAnswer = '',
      targetLanguages = []
    } = req.body;

    const normalizedOptions = Array.isArray(options) ? options : [];
    const normalizedMatchingPairs = Array.isArray(matchingPairs) ? matchingPairs : [];
    const normalizedTargets = [...new Set((Array.isArray(targetLanguages) ? targetLanguages : []).filter(Boolean))];
    const hasSourceContent = [
      normalizeString(questionText).trim(),
      normalizeString(passage).trim(),
      normalizeString(explanation).trim(),
      normalizeString(correctAnswer).trim(),
      normalizedOptions.some(option => normalizeString(option?.text).trim()),
      normalizedMatchingPairs.some(pair => normalizeString(pair).trim())
    ].some(Boolean);

    if (!hasSourceContent || normalizedTargets.length === 0) {
      return res.status(400).json({ error: 'Provide source content and targetLanguages' });
    }

    const { client, model } = getClient();

    const langs = normalizedTargets.map(l => SUPPORTED_AI_LANGUAGES[l] || l).join(', ');

    // Build content to translate
    let contentToTranslate = `Question HTML/Text:\n${normalizeString(questionText)}`;
    if (normalizedOptions.length) {
      contentToTranslate += '\n\nOptions:\n' + normalizedOptions.map((option, i) => `${i + 1}. ${normalizeString(option?.text)}`).join('\n');
    }
    if (normalizedMatchingPairs.length) {
      contentToTranslate += '\n\nMatching pairs:\n' + normalizedMatchingPairs.map((pair, i) => `${i + 1}. ${normalizeString(pair)}`).join('\n');
    }
    if (passage) contentToTranslate += `\n\nPassage:\n${normalizeString(passage)}`;
    if (explanation) contentToTranslate += `\n\nExplanation:\n${normalizeString(explanation)}`;
    if (correctAnswer) contentToTranslate += `\n\nCorrect answer:\n${normalizeString(correctAnswer)}`;

    const systemPrompt = `You are a professional translator for an educational testing platform.
Translate the given content to: ${langs}.

Respond with JSON: { "translations": { "${normalizedTargets.join('": {...}, "')}" : {...} } }

For each language, include:
- "questionText": translated question
${normalizedOptions.length ? '- "options": [array of translated option texts in the same order]' : ''}
${normalizedMatchingPairs.length ? '- "matchPairs": [array of translated matching pair labels in the same order]' : ''}
${passage ? '- "passage": translated passage' : ''}
${explanation ? '- "explanation": translated explanation' : ''}
${correctAnswer ? '- "correctAnswer": translated correct answer' : ''}

Rules:
- Keep the meaning and tone identical
- Preserve HTML tags, paragraph structure, lists, and line breaks when they are present in the source
- Do not add markdown, bullet markers, code fences, or stray symbols
- Keep the options array length exactly ${normalizedOptions.length}
- Keep the matchPairs array length exactly ${normalizedMatchingPairs.length}
- For Kazakh: use proper Қazaq grammar, not transliteration
- Translate naturally, not word-by-word`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentToTranslate }
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const translations = {};

    for (const lang of normalizedTargets) {
      const current = parsed?.translations?.[lang] || {};
      translations[lang] = {
        questionText: normalizeString(current.questionText),
        options: Array.isArray(current.options) ? current.options.map(option => normalizeString(option)) : [],
        matchPairs: Array.isArray(current.matchPairs) ? current.matchPairs.map(pair => normalizeString(pair)) : [],
        passage: normalizeString(current.passage),
        explanation: normalizeString(current.explanation),
        correctAnswer: normalizeString(current.correctAnswer)
      };
    }

    res.json({ translations });
  } catch (err) {
    console.error('AI translate error:', err);
    if (err.message?.includes('not configured')) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Translation failed: ' + (err.message || 'Unknown error') });
  }
});

module.exports = router;
