export const currentUser = {
  id: 'u-1',
  name: 'Айбек Жангарашов',
  email: 'aiymbek@unitest.kz',
  role: 'Creator',
  level: 12,
  xp: 4820,
  xpToNext: 640,
  streak: 8,
  accuracy: 87,
  avatar: 'АЖ',
  school: 'Digital Ocean Academy'
};

export const tests = [
  {
    id: 'test-grammar',
    title: 'Grammar: Past Continuous',
    subject: 'English',
    status: 'Published',
    mode: 'Practice',
    questions: 4,
    plays: 1240,
    rating: 4.8,
    difficulty: 'Medium',
    progress: 72,
    due: 'Сегодня',
    xp: 40,
    description: 'Reading + grammar sprint with instant feedback.',
    attempts: 2,
    completion: 68
  },
  {
    id: 'test-bio',
    title: 'Адам және экология',
    subject: 'Biology',
    status: 'Assigned',
    mode: 'Exam',
    questions: 5,
    plays: 816,
    rating: 4.7,
    difficulty: 'Hard',
    progress: 44,
    due: 'Завтра',
    xp: 55,
    description: 'Экология тақырыбы бойынша бақылау жұмысы.',
    attempts: 1,
    completion: 42
  },
  {
    id: 'test-history',
    title: 'World History Sprint',
    subject: 'History',
    status: 'Draft',
    mode: 'Arena',
    questions: 6,
    plays: 2200,
    rating: 4.9,
    difficulty: 'Easy',
    progress: 93,
    due: 'Без срока',
    xp: 30,
    description: 'Fast public quiz for leaderboard training.',
    attempts: 4,
    completion: 91
  },
  {
    id: 'test-math',
    title: 'Algebra checkpoint',
    subject: 'Math',
    status: 'Published',
    mode: 'Exam',
    questions: 8,
    plays: 540,
    rating: 4.6,
    difficulty: 'Medium',
    progress: 36,
    due: 'Пятница',
    xp: 45,
    description: 'Equations, functions and short problem solving.',
    attempts: 3,
    completion: 53
  }
];

export const testQuestions = [
  {
    id: 'q-1',
    type: 'single',
    title: 'Which sentence uses Past Continuous correctly?',
    text: 'Choose the grammatically correct sentence.',
    options: ['I was reading when he called.', 'I read when he calls.', 'I am read yesterday.', 'I reading when he called.'],
    correct: 0,
    points: 1
  },
  {
    id: 'q-2',
    type: 'truefalse',
    title: 'Vacations can reduce stress.',
    text: 'Based on the text, choose the correct statement.',
    options: ['True', 'False', 'Not given'],
    correct: 0,
    points: 1
  },
  {
    id: 'q-3',
    type: 'single',
    title: 'What does “optimal” mean in the passage?',
    text: 'Pick the closest meaning.',
    options: ['Best possible', 'Very slow', 'Not available', 'Already finished'],
    correct: 0,
    points: 1
  },
  {
    id: 'q-4',
    type: 'single',
    title: 'Which paragraph gives examples of health benefits?',
    text: 'Time off is like medicine. Studies show that vacations are as important as watching cholesterol or getting exercise.',
    options: ['Paragraph 1', 'Paragraph 2', 'Paragraph 3', 'Paragraph 4'],
    correct: 1,
    points: 1
  }
];

export const initialDraft = {
  title: 'Untitled English checkpoint',
  subject: 'English',
  language: 'RU',
  timeLimit: 25,
  questions: [
    {
      id: 'draft-1',
      type: 'single',
      title: 'Which sentence uses Past Continuous correctly?',
      options: ['I was reading when he called.', 'I read when he calls.', 'I am read yesterday.', 'I reading when he called.'],
      correct: 0,
      points: 1
    },
    {
      id: 'draft-2',
      type: 'truefalse',
      title: 'Vacations can reduce stress.',
      options: ['True', 'False', 'Not given'],
      correct: 0,
      points: 1
    }
  ]
};

export const leaderboard = [
  { id: 'l-1', name: 'Amina', score: 9840, streak: 12, avatar: 'A', trend: '+420' },
  { id: 'l-2', name: 'Айбек', score: 9410, streak: 8, avatar: 'А', trend: '+280' },
  { id: 'l-3', name: 'Dias', score: 8990, streak: 7, avatar: 'D', trend: '+210' },
  { id: 'l-4', name: 'Sofia', score: 8200, streak: 5, avatar: 'S', trend: '+180' }
];

export const arenaPlayers = [
  { id: 'p-1', name: 'Amina', score: 2800, avatar: 'A', answered: true },
  { id: 'p-2', name: 'Dias', score: 2460, avatar: 'D', answered: true },
  { id: 'p-3', name: 'Айбек', score: 2310, avatar: 'А', answered: false },
  { id: 'p-4', name: 'Sofia', score: 2100, avatar: 'S', answered: true },
  { id: 'p-5', name: 'Miras', score: 1860, avatar: 'M', answered: false }
];

export const activity = [
  { id: 'a-1', title: 'Grammar: Past Continuous completed', meta: '87% score · +40 XP', time: '12 min ago' },
  { id: 'a-2', title: 'Arena room created', meta: '5 players joined', time: '38 min ago' },
  { id: 'a-3', title: 'Biology test assigned', meta: 'Due tomorrow', time: '2 h ago' },
  { id: 'a-4', title: 'Profile streak updated', meta: '8 day streak', time: 'Yesterday' }
];

export const badges = [
  { id: 'b-1', title: 'Streak Keeper', icon: 'flame', desc: '8 days without losing rhythm' },
  { id: 'b-2', title: 'Arena Clutch', icon: 'trophy', desc: 'Top 3 in live battle' },
  { id: 'b-3', title: 'Clean Creator', icon: 'spark', desc: 'Premium test structure' },
  { id: 'b-4', title: 'Fast Finisher', icon: 'clock', desc: 'Finished under target time' }
];

export const conversations = [
  {
    id: 'c-1',
    name: 'English group',
    type: 'Group',
    avatar: 'EN',
    unread: 2,
    messages: [
      { id: 'm-1', author: 'Amina', body: 'Can we launch the arena after class?', time: '13:02', mine: false },
      { id: 'm-2', author: 'Айбек', body: 'Yes, I will open a room in 10 minutes.', time: '13:04', mine: true }
    ]
  },
  {
    id: 'c-2',
    name: 'Dias',
    type: 'Direct',
    avatar: 'D',
    unread: 0,
    messages: [
      { id: 'm-3', author: 'Dias', body: 'Send me the ecology test link.', time: '10:11', mine: false },
      { id: 'm-4', author: 'Айбек', body: 'Added it to your assignments.', time: '10:14', mine: true }
    ]
  }
];
