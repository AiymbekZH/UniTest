# Phase 3 — Inline Question Editor + Advanced AI in Arena Test Builder

Расширяем `CreateArenaTest` до полноценного редактора с inline-созданием вопросов (паритет с `CreateTest`) + улучшенный AI (генерация / переводы 4 языка / remix / автобаланс) + Crown Carry + Shuffle + Boss Round + Audio Vibes + per-question power-up теги. Коммитим эпиками F → J.

---

## Архитектурные решения (зафиксированы по ответам)

- **Где живут новые вопросы:** локально в шаблоне как embedded snapshot (`ArenaTest.entries[].embedded`). На каждой карточке кнопка «В банк» — реплицирует вопрос в `BankQuestion` и переключает entry на ссылку.
- **AI:** должен быть как в `CreateTest`, **но улучшенный** для арены — добавляем 2 новых эндпоинта (`/ai/arena-remix`, `/ai/arena-balance`) поверх существующих `/ai/generate` + `/ai/translate`.
- **UX-развилка:** на степе «Вопросы» две вкладки — `Создать` (inline editor) и `Из банка` (текущий drag-drop picker). Справа общая «Лента арены» сохраняет порядок.
- **Объём:** ~6 новых файлов + правки 8 существующих. Разбито на 5 коммитов.

---

## Эпик F — Backend: embedded questions + Crown/Shuffle

### F1. `ArenaTest` model — embedded entries
- `entries[]` остаётся, но добавляем дискриминатор `entry.kind`:
  - `'bank'` — `bankQuestion: ObjectId<BankQuestion>` (как сейчас)
  - `'embedded'` — `embedded: { type, questionText, points, options[], correctAnswer, explanation, passage, media, translations{en,ru,kz,es} }`
- Добавляем `entry.tag: 'normal' | 'blitz' | 'think' | 'boss' | 'jackpot'` (per-question power-up tag).
- `settings.audioVibe: 'default' | 'quizshow' | '8bit' | 'cinematic' | 'chill'`
- `settings.bossRoundEnabled: bool` — последний вопрос автоматически помечается `boss`.

### F2. `routes/arenaTests.js` sanitization
- `sanitizeEntries` принимает оба варианта (`bank` или `embedded`). Embedded санитайзим на сервере (типы, длина текста, max 10 options, обрезка translations).
- Для `embedded` пропускаем ownership-check (сами создаём).

### F3. `arenaEngine.js` — snapshot builder
- `createArenaSnapshotFromArenaTest()` уже существует (через populate). Расширить:
  - Если `entry.kind === 'embedded'` — кладём вопрос напрямую в `room.questionSnapshot`.
  - Если `entry.kind === 'bank'` — populate `bankQuestion` и map (как сейчас).
  - Прокидываем `entry.tag` в `questionSnapshot[i].tag`.
- Tag → multiplier: `boss=3x`, `jackpot=2x`, `blitz` → timer 5s override, `think` → timer 60s. Применяется в `gradeArenaAnswer()`.

### F4. Shuffle (per-player order) + Crown Carry
- **Shuffle:** при `settings.shuffleQuestions=true` сервер генерирует per-participant `questionOrder: [int]` при `arena:start`. В `handleArenaAnswer` маппим `currentQuestionIndex` через personal order.
  - Альтернатива (проще): на frontend отображаем `questionSnapshot[participant.questionOrder[currentQuestionIndex]]`. Сделаем серверный mapping.
- **Crown Carry:** в `ArenaParticipant.crown: bool` — true у текущего лидера. После каждого вопроса финализатор пересчитывает корону (топ-1 по score, ties → totalResponseTimeMs). На `steal` power-up: если target=crown, `+100` вместо `+50`. В overlay показываем 👑 у лидера.

### F5. POST `/api/ai/arena-remix` (новый AI endpoint)
- Body: `{ question: { type, questionText, options, explanation } }`
- Зовём GPT с system-prompt: «Перепиши вопрос в стиле live-quiz: короче, динамичнее, добавь эмодзи в варианты, придумай 2 правдоподобных distractor'а, добавь reveal-объяснение в одной фразе.»
- Возвращает: `{ remixedQuestion: {...} }`
- Auth: same `aiAccess` check как `/ai/generate`.

### F6. POST `/api/ai/arena-balance` (новый AI endpoint)
- Body: `{ entries: [{ questionText, type, points }] }`
- Зовём GPT с system-prompt: «Оцени сложность 1-5 каждого вопроса. Расставь easy→medium→hard→jackpot (по типу кривой Bell-Boss). Не ставь подряд два одинаковых типа. Предложи таймер 10/20/30с.»
- Возвращает: `{ recommendedOrder: [originalIndex...], timers: [int...], difficulties: ['easy'|'medium'|'hard'|'boss'] }`

---

## Эпик G — Frontend `CreateArenaTest`: inline editor + tabbed step

### G1. Step «Вопросы» — табы
- Внутри степа добавить переключатель `[Создать] [Из банка]` + правую sticky-колонку «Лента арены» (общая для обеих вкладок).
- При `Из банка` — текущий `ArenaQuestionPicker` (без правок).
- При `Создать` — новый компонент `<ArenaInlineEditor />`.

### G2. `ArenaInlineEditor` (новый компонент `~700 строк`)
- Поддержка 6 типов вопросов (single/multiple/true-false/essay/matching/fill-blank) — копируем функции `createQuestion`, `addOption`, `removeOption`, `updateOption` из `CreateTest.jsx`.
- `RichTextEditor` для `questionText`, `passage`, `explanation`.
- Media upload (image/video/audio) — переиспользуем `handleMediaUpload` логику.
- **Translation panels** для `ru/en/kz/es` — складные секции под каждым вопросом, AI-кнопка «Перевести на 4 языка» зовёт `/ai/translate`.
- **AI ✨ remix кнопка** на каждом вопросе → `/ai/arena-remix`.
- **Per-question power-up tag chip:** `normal / blitz / think / jackpot / boss` (segmented control с цветами и иконками).
- **«В банк» кнопка** на embedded-карточке → `POST /api/question-bank` с данными вопроса, обновляет entry на `kind: 'bank'` и убирает локальные данные.
- Список вопросов sortable через `@dnd-kit` (как в picker).
- `+` кнопка → меню типов (всплывающее как в CreateTest).
- AI-генерация: кнопка «Сгенерировать AI» открывает `AIGenerateModal` (переиспользуем существующий), сгенерированные вопросы добавляются как embedded entries.

### G3. Right column — общая «Лента арены»
- Vertical stack карточек (sticky на больших экранах).
- Drag-handles для перестановки в общем списке (mix bank + embedded).
- Кнопка «AI ⚖ автобаланс» → `/ai/arena-balance` → переставляет entries и предлагает таймеры.
- Кнопки «Очистить», «Дублировать ленту в новый шаблон».

### G4. Settings step — расширить
- Добавить **Audio Vibes** селектор (4 пресета + Default).
- Добавить **Boss Round** toggle (если on, последний вопрос автоматически помечается boss).
- **Crown Carry** уже есть как часть expanded power-ups (steal).
- **Shuffle** уже toggle есть — теперь будет работать на бэке.

---

## Эпик H — Audio Vibes (frontend)

### H1. `client/src/utils/arenaSounds.js` — расширить
- Добавить `setAudioVibe(theme)` — переключает Web Audio osc/freq paramset.
- Темы:
  - `quizshow`: яркие, тон mid-high, Major chord для correct.
  - `8bit`: square wave, низкое sample rate emulation (lo-fi через biquad).
  - `cinematic`: long sustain, reverb-like via convolver.
  - `chill`: sine wave, мягкие транзиенты.
- На клиенте при подключении к арене читаем `room.settings.audioVibe` и зовём `setAudioVibe`.

---

## Эпик I — Per-question power-up tags + Boss Round (рантайм)

### I1. Frontend overlay: показывать tag-бейдж на вопросе
- В `ArenaQuestionPanel` (player) и `ArenaHostPage` (intro): если `question.tag === 'boss'` — красный glow + анимация шока + блокировка power-ups (по `settings.bossRoundEnabled`).
- `jackpot` — золотой glow + множитель отображается ×2.
- `blitz` — синий, mini-таймер.
- `think` — зелёный, расширенный таймер.

### I2. Backend grading
- В `gradeArenaAnswer` принимать question.tag и применять multiplier:
  - `jackpot` → ×2 (комбинируется с другими)
  - `boss` → ×3 + bonus return: если игрок отвечает верно при `score === bottom`, получает +500 catch-up.
- Сбрасывать active power-ups в начале boss-вопроса (server-side).

---

## Эпик J — Tests + polish

### J1. Сборка и проверка
- `npm run build` — без ошибок.
- Регрессия: открыть существующий ArenaTest без embedded → должно работать.
- Создать новый шаблон с 1 embedded + 1 bank вопросом → запустить → ответить → финал.

### J2. Документация в коде
- JSDoc на новых функциях.
- Краткий README в `client/src/components/arena/README.md` (опц., если уже есть структура).

---

## Файлы — измениться (приблизительно)

### Новые
- `client/src/components/arena/ArenaInlineEditor.jsx` (~700 строк)
- `client/src/components/arena/ArenaUnifiedQuestionsStep.jsx` (~250 строк, оборачивает табы + правую ленту)
- `server/routes/aiArena.js` (~120 строк, два новых endpoints) — или внутри существующего `routes/ai.js`

### Правка
- `server/models/ArenaTest.js` — embedded sub-schema, tag, audioVibe, bossRoundEnabled
- `server/routes/arenaTests.js` — sanitizeEntries поддерживает embedded
- `server/utils/arena.js` / `arenaEngine.js` — snapshot из embedded, shuffle order, crown carry, tag multipliers
- `server/utils/arenaEngine.js` — `handleArenaAnswer` обновление crown
- `server/socket/arena.js` — emit crown updates
- `client/src/pages/CreateArenaTest.jsx` — заменить step «Вопросы» на новый wrapper
- `client/src/components/arena/ArenaGameplayOverlay.jsx` — show crown 👑 на лидере, show tag badges
- `client/src/components/arena/ArenaQuestionPanel.jsx` — tag styling
- `client/src/utils/arenaSounds.js` — audio vibes

---

## Риски / неопределённости

- **Размер:** это самый большой эпик в проекте до сих пор (~1500-2000 строк). Делаем 5 коммитов, каждый билдится.
- **AI стоимость:** новые endpoints зовут OpenAI. Придерживаемся текущей логики `aiAccess` гейтинга.
- **Crown Carry edge cases:** ничьи (одинаковый score) — берём первого по `totalResponseTimeMs`. Если все 0 — короны нет.
- **Shuffle + Boss Round совместимость:** если shuffle on, boss-вопрос (исходно последний) может оказаться не последним для игрока. Решение: при `bossRoundEnabled` всегда фиксируем последний вопрос на месте, шаффлим только остальные.
- **Embedded vs Bank rendering:** в picker'е и редакторе одинаковый layout; добавим визуальный значок «Embedded» (амбер ⚡) vs «Bank» (синий 📚).

---

## План коммитов

1. **F-эпик**: model + sanitization + crown/shuffle backend + 2 AI endpoints. Build green, запущенная арена работает с embedded.
2. **G1-G2**: `ArenaInlineEditor` + tabbed step. Можно создавать/редактировать без AI.
3. **G3-G4**: правая лента + AI balance + AudioVibes/BossRound в settings.
4. **H + I**: AudioVibes runtime + tag styling + boss round runtime.
5. **J**: regression fixes + polish + final build.
