const fs = require('fs');
const file = 'src/context/LanguageContext.jsx';
let content = fs.readFileSync(file, 'utf8');

const tRu = {
  landingBadge: 'Самый простой способ проверить знания',
  landingHeroTitle: 'Оценивайте уверенно,',
  landingHeroSubtitle: 'с помощью ИИ',
  landingHeroDesc: 'UniTest — это комплексная платформа для преподавателей: создавайте тесты, отслеживайте студентов и анализируйте результаты.',
  landingStartBtn: 'Начать бесплатно',
  landingLoginBtn: 'Войти',
  landingFeaturesHeader: 'Всё необходимое для успеха',
  landingFeaturesSubHeader: 'Мощные инструменты, созданные специально для современных преподавателей и учебных заведений.',
  landingFeatureAIGenTitle: 'Генерация с ИИ',
  landingFeatureAIGenDesc: 'Создавайте вопросы из текста или документов в мгновение ока с помощью ИИ.',
  landingFeatureLevelsTitle: 'ДНК Сложности',
  landingFeatureLevelsDesc: 'Динамическая 5-уровневая система сложности для точной оценки знаний.',
  landingFeatureAnalyticsTitle: 'Глубокая аналитика',
  landingFeatureAnalyticsDesc: 'Отслеживайте успеваемость с помощью аналитики в реальном времени и подробных отчетов.',
  landingFeatureSecurityTitle: 'Античит',
  landingFeatureSecurityDesc: 'Блокировка браузера, прозрачность вкладок и безопасная проверка для честного тестирования.',
  landingStepsHeader: 'Как это работает',
  landingStepsSubHeader: 'Создайте свой первый тест и получите результаты за считанные минуты.',
  landingStep1Title: 'Создайте',
  landingStep1Desc: 'Напишите или сгенерируйте вопросы теста за секунды.',
  landingStep2Title: 'Поделитесь',
  landingStep2Desc: 'Отправьте короткую ссылку студентам или группам.',
  landingStep3Title: 'Проанализируйте',
  landingStep3Desc: 'Просматривайте результаты и оценивайте автоматически.',
  landingCtaHeader: 'Готовы трансформировать обучение?',
  landingCtaDesc: 'Присоединяйтесь к тысячам преподавателей, которые уже используют UniTest.',
  landingCtaBtn: 'Создать бесплатный аккаунт'
};

const tEn = {
  landingBadge: 'The easiest way to test knowledge',
  landingHeroTitle: 'Assess with confidence,',
  landingHeroSubtitle: 'powered by AI',
  landingHeroDesc: 'UniTest is an all-in-one platform for educators to create tests, monitor students, and analyze results seamlessly.',
  landingStartBtn: 'Get Started Free',
  landingLoginBtn: 'Log in',
  landingFeaturesHeader: 'Everything you need to succeed',
  landingFeaturesSubHeader: 'Powerful tools designed specifically for modern educators and institutions.',
  landingFeatureAIGenTitle: 'AI Generation',
  landingFeatureAIGenDesc: 'Generate questions from text or documents instantly using AI.',
  landingFeatureLevelsTitle: 'Difficulty DNA',
  landingFeatureLevelsDesc: 'Dynamic 5-level difficulty system for precise knowledge assessment.',
  landingFeatureAnalyticsTitle: 'Deep Analytics',
  landingFeatureAnalyticsDesc: 'Track performance with real-time analytics and detailed score reports.',
  landingFeatureSecurityTitle: 'Anti-Cheat',
  landingFeatureSecurityDesc: 'Browser lock, tab tracking, and secure execution for honest testing.',
  landingStepsHeader: 'How it works',
  landingStepsSubHeader: 'Create your first test and get results in minutes.',
  landingStep1Title: 'Create',
  landingStep1Desc: 'Write or generate test questions in seconds.',
  landingStep2Title: 'Share',
  landingStep2Desc: 'Send a short link to your students or groups.',
  landingStep3Title: 'Analyze',
  landingStep3Desc: 'Review results and grade automatically.',
  landingCtaHeader: 'Ready to transform your teaching?',
  landingCtaDesc: 'Join thousands of educators who are already using UniTest.',
  landingCtaBtn: 'Create Free Account'
};

const tKz = {
  landingBadge: 'Білімді тексерудің ең оңай жолы',
  landingHeroTitle: 'Сеніммен бағалаңыз,',
  landingHeroSubtitle: 'Жасанды Интеллект көмегімен',
  landingHeroDesc: 'UniTest — оқытушыларға тест құруға, студенттерді бақылауға және нәтижелерді талдауға арналған кешенді платформа.',
  landingStartBtn: 'Тегін бастау',
  landingLoginBtn: 'Кіру',
  landingFeaturesHeader: 'Табысқа жету үшін қажеттінің бәрі',
  landingFeaturesSubHeader: 'Қазіргі заманғы оқытушылар мен оқу орындарына арналған қуатты құралдар.',
  landingFeatureAIGenTitle: 'ЖИ генерациясы',
  landingFeatureAIGenDesc: 'ЖИ көмегімен мәтіннен немесе құжаттардан көзді ашып жұмғанша сұрақтар жасаңыз.',
  landingFeatureLevelsTitle: 'Қиындық ДНҚ-сы',
  landingFeatureLevelsDesc: 'Білімді дәл бағалау үшін динамикалық 5 деңгейлі қиындық жүйесі.',
  landingFeatureAnalyticsTitle: 'Терең аналитика',
  landingFeatureAnalyticsDesc: 'Нақты уақыттағы аналитика мен егжей-тегжейлі есептер арқылы үлгерімді бақылаңыз.',
  landingFeatureSecurityTitle: 'Античит',
  landingFeatureSecurityDesc: 'Әділ тестілеу үшін браузерді бұғаттау, қойындыларды бақылау және қауіпсіз тексеру.',
  landingStepsHeader: 'Қалай жұмыс істейді',
  landingStepsSubHeader: 'Алғашқы тестіңізді жасап, нәтижелерді бірнеше минутта алыңыз.',
  landingStep1Title: 'Құру',
  landingStep1Desc: 'Тест сұрақтарын бірнеше секундта жазыңыз немесе генерациялаңыз.',
  landingStep2Title: 'Бөлісу',
  landingStep2Desc: 'Студенттерге немесе топтарға қысқа сілтеме жіберіңіз.',
  landingStep3Title: 'Талдау',
  landingStep3Desc: 'Нәтижелерді қарап, автоматты түрде бағалаңыз.',
  landingCtaHeader: 'Оқыту әдісін өзгертуге дайынсыз ба?',
  landingCtaDesc: 'UniTest-ті қазірдің өзінде пайдаланып жүрген мыңдаған оқытушыларға қосылыңыз.',
  landingCtaBtn: 'Тегін аккаунт құру'
};

const tEs = {
  landingBadge: 'La forma más fácil de evaluar el conocimiento',
  landingHeroTitle: 'Evalúa con confianza,',
  landingHeroSubtitle: 'impulsado por IA',
  landingHeroDesc: 'UniTest es una plataforma todo en uno para que los educadores creen pruebas, supervisen a los estudiantes y analicen resultados sin problemas.',
  landingStartBtn: 'Comenzar Gratis',
  landingLoginBtn: 'Iniciar sesión',
  landingFeaturesHeader: 'Todo lo que necesitas para tener éxito',
  landingFeaturesSubHeader: 'Herramientas poderosas diseñadas específicamente para educadores e instituciones modernas.',
  landingFeatureAIGenTitle: 'Generación de IA',
  landingFeatureAIGenDesc: 'Genera preguntas a partir de texto o documentos al instante usando IA.',
  landingFeatureLevelsTitle: 'ADN de Dificultad',
  landingFeatureLevelsDesc: 'Sistema dinámico de dificultad de 5 niveles para una evaluación precisa del conocimiento.',
  landingFeatureAnalyticsTitle: 'Análisis Profundo',
  landingFeatureAnalyticsDesc: 'Haz un seguimiento del rendimiento con análisis en tiempo real y reportes detallados.',
  landingFeatureSecurityTitle: 'Antitrampas',
  landingFeatureSecurityDesc: 'Bloqueo de navegador, seguimiento de pestañas y ejecución segura para pruebas honestas.',
  landingStepsHeader: 'Cómo funciona',
  landingStepsSubHeader: 'Crea tu primera prueba y obtén resultados en minutos.',
  landingStep1Title: 'Crear',
  landingStep1Desc: 'Escribe o genera preguntas de prueba en segundos.',
  landingStep2Title: 'Compartir',
  landingStep2Desc: 'Envía un enlace corto a tus estudiantes o grupos.',
  landingStep3Title: 'Analizar',
  landingStep3Desc: 'Revisa resultados y califica automáticamente.',
  landingCtaHeader: '¿Listo para transformar tu enseñanza?',
  landingCtaDesc: 'Únete a miles de educadores que ya usan UniTest.',
  landingCtaBtn: 'Crear cuenta gratis'
};

function injectDict(langContent, dictObj, langKey) {
  const startRegex = new RegExp(`${langKey}:\\s*\\{`);
  const match = langContent.match(startRegex);
  if (!match) return langContent;
  
  let inserted = `\n`;
  for(let key in dictObj) {
    inserted += `    ${key}: '${dictObj[key].replace(/'/g, "\\'")}',\n`;
  }
  
  const insertIndex = match.index + match[0].length;
  return langContent.slice(0, insertIndex) + inserted + langContent.slice(insertIndex);
}

content = injectDict(content, tEn, 'en');
content = injectDict(content, tRu, 'ru');
content = injectDict(content, tKz, 'kz');
content = injectDict(content, tEs, 'es');

fs.writeFileSync(file, content);
console.log("Translations injected successfully.");