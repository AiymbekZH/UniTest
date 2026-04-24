import { useMemo, useState } from 'react';
import Brand from './components/Brand.jsx';
import { Icon } from './components/Icons.jsx';
import {
  activity,
  arenaPlayers,
  badges,
  conversations as initialConversations,
  currentUser,
  initialDraft,
  leaderboard,
  testQuestions,
  tests
} from './data/mockData.js';

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'tests', label: 'Tests', icon: 'tests' },
  { id: 'create', label: 'Create', icon: 'create' },
  { id: 'sessions', label: 'Sessions', icon: 'sessions' },
  { id: 'arena', label: 'Arena', icon: 'arena' },
  { id: 'messages', label: 'Messages', icon: 'messages' },
  { id: 'profile', label: 'Profile', icon: 'profile' }
];

const statusLabels = {
  Published: 'Published',
  Assigned: 'Assigned',
  Draft: 'Draft'
};

function cloneDraft() {
  return {
    ...initialDraft,
    questions: initialDraft.questions.map((question) => ({
      ...question,
      options: [...question.options]
    }))
  };
}

function createInitialRun() {
  return {
    index: 0,
    answers: {},
    finished: false,
    startedAt: Date.now()
  };
}

function StatCard({ label, value, meta, icon, tone = 'accent' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon">
        <Icon name={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {meta ? <small>{meta}</small> : null}
      </div>
    </article>
  );
}

function AppShell({ route, setRoute, isAuthed, children, notice, clearNotice }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={route === item.id ? 'active' : ''}
              onClick={() => setRoute(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === 'messages' ? <b className="nav-dot" /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-upgrade">
          <span className="eyebrow">Prototype mode</span>
          <p>Mock state, real flows, no backend. Use it as a working product direction, not a static mockup.</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand compact />
            <strong>UniTest</strong>
          </div>
          <label className="global-search">
            <Icon name="search" />
            <input placeholder="Search tests, groups, students..." />
          </label>
          <div className="topbar-actions">
            <button type="button" className="icon-btn" aria-label="Notifications">
              <Icon name="bell" />
              <span />
            </button>
            <button type="button" className="primary-btn" onClick={() => setRoute('create')}>
              <Icon name="plus" />
              New test
            </button>
            <button type="button" className="user-chip" onClick={() => setRoute(isAuthed ? 'profile' : 'auth')}>
              <span>{currentUser.avatar}</span>
              <div>
                <strong>{currentUser.name}</strong>
                <small>{isAuthed ? `Level ${currentUser.level}` : 'Sign in'}</small>
              </div>
            </button>
          </div>
        </header>

        {notice ? (
          <button type="button" className="notice" onClick={clearNotice}>
            <Icon name="check" />
            <span>{notice}</span>
          </button>
        ) : null}

        {children}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            type="button"
            className={route === item.id ? 'active' : ''}
            onClick={() => setRoute(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function PageHeader({ eyebrow, title, desc, action }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {desc ? <p>{desc}</p> : null}
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </div>
  );
}

function TestCard({ test, onOpen, onStart }) {
  return (
    <article className="test-card">
      <div className="card-row">
        <span className={`status-pill status-${test.status.toLowerCase()}`}>{statusLabels[test.status]}</span>
        <span className="card-meta">{test.subject}</span>
      </div>
      <h3>{test.title}</h3>
      <p>{test.description}</p>
      <div className="card-progress">
        <span style={{ width: `${test.progress}%` }} />
      </div>
      <div className="test-stats">
        <span>{test.questions} questions</span>
        <span>{test.plays.toLocaleString('ru-RU')} plays</span>
        <span>★ {test.rating}</span>
      </div>
      <div className="card-actions">
        <button type="button" className="primary-btn small" onClick={() => onStart(test)}>
          Start
        </button>
        <button type="button" className="ghost-btn small" onClick={() => onOpen(test)}>
          Details
        </button>
      </div>
    </article>
  );
}

function OverviewPage({ setRoute, startTest }) {
  const daily = tests[0];

  return (
    <div className="page">
      <section className="hero-grid">
        <div className="hero-card">
          <span className="eyebrow">Today in UniTest</span>
          <h1>Рабочий кабинет, где тесты, прогресс и арены ощущаются как один продукт.</h1>
          <p>Быстро создавай задания, запускай live-сессии, отслеживай прогресс и возвращай учеников через понятные действия.</p>
          <div className="hero-actions">
            <button type="button" className="primary-btn" onClick={() => setRoute('create')}>
              <Icon name="plus" />
              Create test
            </button>
            <button type="button" className="ghost-btn" onClick={() => startTest(daily)}>
              <Icon name="take" />
              Try student flow
            </button>
          </div>
        </div>

        <article className="daily-panel">
          <div className="card-row">
            <span className="eyebrow">Daily challenge</span>
            <span className="xp-badge">+{daily.xp} XP</span>
          </div>
          <h2>{daily.title}</h2>
          <p>{daily.description}</p>
          <div className="countdown-card">
            <span>Resets in</span>
            <strong>03:49:12</strong>
          </div>
          <button type="button" className="primary-btn full" onClick={() => startTest(daily)}>
            Start challenge
          </button>
        </article>
      </section>

      <section className="stats-grid">
        <StatCard label="XP" value={currentUser.xp.toLocaleString('ru-RU')} meta={`${currentUser.xpToNext} to next level`} icon="trophy" tone="accent" />
        <StatCard label="Streak" value={`${currentUser.streak} days`} meta="Keep momentum" icon="flame" tone="warm" />
        <StatCard label="Accuracy" value={`${currentUser.accuracy}%`} meta="Last 30 days" icon="target" tone="success" />
        <StatCard label="Active tests" value="14" meta="4 due this week" icon="tests" tone="blue" />
      </section>

      <section className="dashboard-grid">
        <div className="panel wide">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Recommended</span>
              <h2>Continue working</h2>
            </div>
            <button type="button" className="ghost-btn small" onClick={() => setRoute('tests')}>View all</button>
          </div>
          <div className="test-grid">
            {tests.slice(0, 3).map((test) => (
              <TestCard key={test.id} test={test} onOpen={() => setRoute('tests')} onStart={startTest} />
            ))}
          </div>
        </div>

        <LeaderboardPanel />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Activity</span>
            <h2>Recent product events</h2>
          </div>
        </div>
        <div className="activity-list">
          {activity.map((item) => (
            <div key={item.id} className="activity-item">
              <span />
              <div>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </div>
              <time>{item.time}</time>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LeaderboardPanel() {
  return (
    <aside className="panel leaderboard-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Leaderboard</span>
          <h2>Weekly pace</h2>
        </div>
      </div>
      <div className="leaderboard-list">
        {leaderboard.map((entry, index) => (
          <div key={entry.id} className="leader-row">
            <b>{index + 1}</b>
            <span className="avatar">{entry.avatar}</span>
            <div>
              <strong>{entry.name}</strong>
              <small>{entry.streak} day streak</small>
            </div>
            <em>{entry.trend}</em>
          </div>
        ))}
      </div>
    </aside>
  );
}

function TestsPage({ startTest, notify }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const filteredTests = tests.filter((test) => {
    const matchesQuery = `${test.title} ${test.subject}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'All' || test.status === filter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Library"
        title="Tests that feel managed, not dumped into a list."
        desc="Search, filter, launch and inspect the same way a real product would behave."
      />

      <div className="toolbar">
        <label className="search-box">
          <Icon name="search" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or subject" />
        </label>
        <div className="segmented">
          {['All', 'Published', 'Assigned', 'Draft'].map((item) => (
            <button key={item} type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="test-grid library-grid">
        {filteredTests.map((test) => (
          <TestCard
            key={test.id}
            test={test}
            onStart={startTest}
            onOpen={() => notify(`${test.title} details opened in prototype`)}
          />
        ))}
      </div>

      {filteredTests.length === 0 ? (
        <div className="empty-state">
          <Icon name="filter" />
          <h2>No tests found</h2>
          <p>Try a different search or filter.</p>
        </div>
      ) : null}
    </div>
  );
}

function CreatePage({ draft, setDraft, activeQuestionId, setActiveQuestionId, notify }) {
  const activeQuestion = draft.questions.find((question) => question.id === activeQuestionId) || draft.questions[0];

  const updateDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const updateQuestion = (id, patch) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question)
    }));
  };
  const updateOption = (id, optionIndex, value) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.id !== id) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      })
    }));
  };
  const addQuestion = () => {
    const next = {
      id: `draft-${Date.now()}`,
      type: 'single',
      title: 'New question',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: 0,
      points: 1
    };
    setDraft((current) => ({ ...current, questions: [...current.questions, next] }));
    setActiveQuestionId(next.id);
    notify('Question added');
  };
  const removeQuestion = (id) => {
    if (draft.questions.length === 1) {
      notify('At least one question is required');
      return;
    }
    const nextQuestions = draft.questions.filter((question) => question.id !== id);
    setDraft((current) => ({ ...current, questions: nextQuestions }));
    setActiveQuestionId(nextQuestions[0].id);
    notify('Question removed');
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Creator Studio"
        title="Create tests with a real editor flow."
        desc="This mock editor has editable questions, options, settings and AI controls, so it behaves like product UI."
        action={<button type="button" className="primary-btn" onClick={() => notify('Draft saved locally')}>Save draft</button>}
      />

      <section className="creator-grid">
        <aside className="panel question-rail">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Questions</span>
              <h2>{draft.questions.length} items</h2>
            </div>
            <button type="button" className="icon-btn static" onClick={addQuestion}><Icon name="plus" /></button>
          </div>
          <div className="question-list">
            {draft.questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                className={question.id === activeQuestion.id ? 'active' : ''}
                onClick={() => setActiveQuestionId(question.id)}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{question.title}</strong>
                  <small>{question.type} · {question.points} point</small>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <article className="panel editor-panel">
          <div className="editor-toolbar">
            <button type="button">B</button>
            <button type="button">I</button>
            <button type="button">U</button>
            <button type="button">Link</button>
            <button type="button">AI fill</button>
          </div>

          <label className="field">
            <span>Question text</span>
            <textarea value={activeQuestion.title} onChange={(event) => updateQuestion(activeQuestion.id, { title: event.target.value })} />
          </label>

          <div className="answer-editor">
            {activeQuestion.options.map((option, index) => (
              <label key={`${activeQuestion.id}-${index}`} className={activeQuestion.correct === index ? 'active' : ''}>
                <button type="button" onClick={() => updateQuestion(activeQuestion.id, { correct: index })}>{String.fromCharCode(65 + index)}</button>
                <input value={option} onChange={(event) => updateOption(activeQuestion.id, index, event.target.value)} />
              </label>
            ))}
          </div>

          <div className="editor-footer">
            <button type="button" className="ghost-btn" onClick={() => removeQuestion(activeQuestion.id)}>Remove question</button>
            <button type="button" className="primary-btn" onClick={() => notify('Question updated')}>Apply changes</button>
          </div>
        </article>

        <aside className="settings-stack">
          <div className="panel compact-panel">
            <span className="eyebrow">Test settings</span>
            <label className="field">
              <span>Title</span>
              <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
            </label>
            <label className="field">
              <span>Subject</span>
              <input value={draft.subject} onChange={(event) => updateDraft({ subject: event.target.value })} />
            </label>
            <label className="field">
              <span>Time limit</span>
              <input type="number" value={draft.timeLimit} onChange={(event) => updateDraft({ timeLimit: event.target.value })} />
            </label>
          </div>

          <div className="panel compact-panel ai-panel">
            <div className="stat-icon tone-accent"><Icon name="spark" /></div>
            <span className="eyebrow">AI assistant</span>
            <h2>Generate from source</h2>
            <p>Mock AI controls for future import, translate and question mix features.</p>
            <div className="mix-row"><span>Single choice</span><b>10</b></div>
            <div className="mix-row"><span>True / False</span><b>7</b></div>
            <div className="mix-row"><span>Matching</span><b>3</b></div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function TakeTestPage({ selectedTest, run, setRun, notify }) {
  const current = testQuestions[run.index];
  const answeredCount = Object.keys(run.answers).length;
  const score = testQuestions.reduce((sum, question) => sum + (run.answers[question.id] === question.correct ? question.points : 0), 0);
  const total = testQuestions.reduce((sum, question) => sum + question.points, 0);

  const selectAnswer = (questionId, index) => {
    setRun((currentRun) => ({ ...currentRun, answers: { ...currentRun.answers, [questionId]: index } }));
  };

  if (run.finished) {
    const percent = Math.round((score / total) * 100);
    return (
      <div className="page result-page">
        <section className="result-card">
          <span className="eyebrow">Result ready</span>
          <h1>{percent}%</h1>
          <p>{selectedTest.title} completed with {score}/{total} points. This is a working result state, not a static screen.</p>
          <div className="stats-grid mini">
            <StatCard label="Answered" value={`${answeredCount}/${testQuestions.length}`} icon="check" tone="success" />
            <StatCard label="XP earned" value={`+${selectedTest.xp}`} icon="spark" tone="accent" />
            <StatCard label="Time" value="08:42" icon="clock" tone="blue" />
          </div>
          <div className="hero-actions">
            <button type="button" className="primary-btn" onClick={() => setRun(createInitialRun())}>Retry</button>
            <button type="button" className="ghost-btn" onClick={() => notify('Result details opened')}>Open details</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="test-shell">
        <aside className="panel test-nav">
          <span className="eyebrow">{selectedTest.title}</span>
          <h2>{answeredCount}/{testQuestions.length} answered</h2>
          <div className="test-progress"><span style={{ width: `${((run.index + 1) / testQuestions.length) * 100}%` }} /></div>
          <div className="question-dots">
            {testQuestions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                className={`${index === run.index ? 'active' : ''} ${run.answers[question.id] !== undefined ? 'done' : ''}`}
                onClick={() => setRun((currentRun) => ({ ...currentRun, index }))}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button type="button" className="finish-btn" onClick={() => setRun((currentRun) => ({ ...currentRun, finished: true }))}>Finish test</button>
        </aside>

        <article className="panel question-stage">
          <div className="question-top">
            <span className="eyebrow">Question {run.index + 1}</span>
            <span className="timer">12:48</span>
          </div>
          <div className="reading-box">
            <span>{current.type}</span>
            <p>{current.text}</p>
          </div>
          <h1>{current.title}</h1>
          <div className="choice-stack">
            {current.options.map((option, index) => (
              <button
                key={option}
                type="button"
                className={run.answers[current.id] === index ? 'selected' : ''}
                onClick={() => selectAnswer(current.id, index)}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {option}
              </button>
            ))}
          </div>
          <div className="question-footer">
            <button
              type="button"
              className="ghost-btn"
              disabled={run.index === 0}
              onClick={() => setRun((currentRun) => ({ ...currentRun, index: Math.max(0, currentRun.index - 1) }))}
            >
              Back
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => setRun((currentRun) => (
                currentRun.index === testQuestions.length - 1
                  ? { ...currentRun, finished: true }
                  : { ...currentRun, index: currentRun.index + 1 }
              ))}
            >
              {run.index === testQuestions.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

function SessionsPage({ setRoute }) {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Live operations"
        title="Sessions, assignments and rooms in one place."
        desc="A functional product needs operational views, not only pretty test cards."
        action={<button type="button" className="primary-btn" onClick={() => setRoute('arena')}>Open arena</button>}
      />
      <section className="sessions-grid">
        {tests.map((test) => (
          <article key={test.id} className="panel session-card">
            <div className="card-row">
              <span className={`status-pill status-${test.status.toLowerCase()}`}>{test.status}</span>
              <span>{test.due}</span>
            </div>
            <h2>{test.title}</h2>
            <p>{test.completion}% class completion · {test.attempts} attempts used</p>
            <div className="card-progress"><span style={{ width: `${test.completion}%` }} /></div>
            <div className="card-actions">
              <button type="button" className="ghost-btn small">View roster</button>
              <button type="button" className="primary-btn small">Send reminder</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ArenaPage({ arenaPhase, setArenaPhase, arenaAnswer, setArenaAnswer }) {
  const sortedPlayers = [...arenaPlayers].sort((a, b) => b.score - a.score);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Arena"
        title="A live game flow that behaves like an actual room."
        desc="Lobby, question, reveal and leaderboard are separate states controlled by the UI."
      />

      <section className="arena-layout">
        <div className="arena-main panel">
          {arenaPhase === 'lobby' ? (
            <div className="arena-lobby">
              <span className="eyebrow">Join code</span>
              <h1>482 019</h1>
              <p>Share this code with players. The next button starts the mock round.</p>
              <button type="button" className="primary-btn" onClick={() => setArenaPhase('live')}>Start round</button>
            </div>
          ) : null}

          {arenaPhase === 'live' ? (
            <div className="arena-question">
              <div className="question-top">
                <span className="eyebrow">Question 1 · 12 seconds</span>
                <span className="timer">00:12</span>
              </div>
              <h1>What does “optimal” mean in paragraph 3?</h1>
              <div className="arena-answers">
                {testQuestions[2].options.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    className={`arena-answer answer-${index} ${arenaAnswer === index ? 'selected' : ''}`}
                    onClick={() => {
                      setArenaAnswer(index);
                      setArenaPhase('reveal');
                    }}
                  >
                    <span>{['▲', '◆', '●', '■'][index]}</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {arenaPhase === 'reveal' ? (
            <div className="arena-reveal">
              <span className="eyebrow">Answer reveal</span>
              <h1>{arenaAnswer === 0 ? 'Correct' : 'Best possible'}</h1>
              <p>The correct answer is highlighted before moving to the leaderboard.</p>
              <button type="button" className="primary-btn" onClick={() => setArenaPhase('leaderboard')}>Show leaderboard</button>
            </div>
          ) : null}

          {arenaPhase === 'leaderboard' ? (
            <div className="arena-reveal">
              <span className="eyebrow">Round leaderboard</span>
              <h1>Amina keeps the lead</h1>
              <p>Players see rank changes before the next question starts.</p>
              <button type="button" className="primary-btn" onClick={() => {
                setArenaAnswer(null);
                setArenaPhase('live');
              }}>Next question</button>
            </div>
          ) : null}
        </div>

        <aside className="panel players-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Players</span>
              <h2>{arenaPlayers.length} joined</h2>
            </div>
          </div>
          <div className="leaderboard-list">
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className="leader-row">
                <b>{index + 1}</b>
                <span className="avatar">{player.avatar}</span>
                <div>
                  <strong>{player.name}</strong>
                  <small>{player.answered ? 'Answered' : 'Thinking...'}</small>
                </div>
                <em>{player.score}</em>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function MessagesPage({ conversations, setConversations }) {
  const [activeId, setActiveId] = useState(conversations[0]?.id);
  const [draft, setDraft] = useState('');
  const active = conversations.find((conversation) => conversation.id === activeId) || conversations[0];

  const sendMessage = () => {
    if (!draft.trim()) return;
    setConversations((current) => current.map((conversation) => {
      if (conversation.id !== active.id) return conversation;
      return {
        ...conversation,
        messages: [
          ...conversation.messages,
          { id: `m-${Date.now()}`, author: 'Айбек', body: draft.trim(), time: 'now', mine: true }
        ]
      };
    }));
    setDraft('');
  };

  return (
    <div className="page">
      <PageHeader eyebrow="Messages" title="Communication should also feel integrated." desc="A real product prototype needs chat and group states, not only academic screens." />
      <section className="messages-layout">
        <aside className="panel conversation-list">
          {conversations.map((conversation) => (
            <button key={conversation.id} type="button" className={conversation.id === active.id ? 'active' : ''} onClick={() => setActiveId(conversation.id)}>
              <span className="avatar">{conversation.avatar}</span>
              <div>
                <strong>{conversation.name}</strong>
                <small>{conversation.type} · {conversation.messages.at(-1)?.body}</small>
              </div>
              {conversation.unread ? <b>{conversation.unread}</b> : null}
            </button>
          ))}
        </aside>

        <article className="panel chat-panel">
          <div className="chat-head">
            <span className="avatar">{active.avatar}</span>
            <div>
              <h2>{active.name}</h2>
              <p>{active.type} channel</p>
            </div>
          </div>
          <div className="message-stream">
            {active.messages.map((message) => (
              <div key={message.id} className={message.mine ? 'message mine' : 'message'}>
                <small>{message.author} · {message.time}</small>
                <p>{message.body}</p>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendMessage()} placeholder="Write a message..." />
            <button type="button" className="primary-btn" onClick={sendMessage}><Icon name="send" /> Send</button>
          </div>
        </article>
      </section>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="page">
      <section className="profile-hero panel">
        <div className="profile-avatar">{currentUser.avatar}</div>
        <div>
          <span className="eyebrow">{currentUser.role}</span>
          <h1>{currentUser.name}</h1>
          <p>{currentUser.school} · creator, learner and arena player.</p>
          <div className="hero-actions">
            <button type="button" className="primary-btn">Edit profile</button>
            <button type="button" className="ghost-btn">Public page</button>
          </div>
        </div>
        <div className="level-ring">
          <strong>{currentUser.level}</strong>
          <span>Level</span>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Total XP" value={currentUser.xp.toLocaleString('ru-RU')} icon="trophy" tone="accent" />
        <StatCard label="Streak" value={`${currentUser.streak} days`} icon="flame" tone="warm" />
        <StatCard label="Accuracy" value={`${currentUser.accuracy}%`} icon="target" tone="success" />
        <StatCard label="Created tests" value="42" icon="create" tone="blue" />
      </section>

      <section className="dashboard-grid">
        <div className="panel wide">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Badges</span>
              <h2>Achievement system</h2>
            </div>
          </div>
          <div className="badge-grid">
            {badges.map((badge) => (
              <article key={badge.id} className="badge-card">
                <div className="stat-icon tone-accent"><Icon name={badge.icon} /></div>
                <strong>{badge.title}</strong>
                <p>{badge.desc}</p>
              </article>
            ))}
          </div>
        </div>
        <LeaderboardPanel />
      </section>
    </div>
  );
}

function AuthPage({ setAuthed, setRoute, notify }) {
  const [mode, setMode] = useState('login');

  const submit = (event) => {
    event.preventDefault();
    setAuthed(true);
    notify(mode === 'login' ? 'Signed in with mock account' : 'Account created in prototype');
    setRoute('overview');
  };

  return (
    <div className="page auth-page">
      <section className="auth-card">
        <div className="auth-story">
          <Brand />
          <h1>Functional prototype, not a poster.</h1>
          <p>This entry screen connects to the same mock app shell, user state and product flows.</p>
          <div className="auth-metrics">
            <span>14 active tests</span>
            <span>5 live players</span>
            <span>8 day streak</span>
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create workspace'}</span>
          <h2>{mode === 'login' ? 'Sign in to UniTest' : 'Start with UniTest'}</h2>
          <label className="field">
            <span>Email</span>
            <input type="email" defaultValue="aiymbek@unitest.kz" />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" defaultValue="unitest-demo" />
          </label>
          <button type="submit" className="primary-btn full">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <button type="button" className="google-btn">G Continue with Google</button>
          <button type="button" className="text-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState('overview');
  const [isAuthed, setAuthed] = useState(true);
  const [selectedTest, setSelectedTest] = useState(tests[0]);
  const [run, setRun] = useState(createInitialRun());
  const [draft, setDraft] = useState(cloneDraft());
  const [activeQuestionId, setActiveQuestionId] = useState(initialDraft.questions[0].id);
  const [arenaPhase, setArenaPhase] = useState('lobby');
  const [arenaAnswer, setArenaAnswer] = useState(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [notice, setNotice] = useState('');

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(window.__unitestNoticeTimer);
    window.__unitestNoticeTimer = window.setTimeout(() => setNotice(''), 2400);
  };

  const startTest = (test) => {
    setSelectedTest(test);
    setRun(createInitialRun());
    setRoute('take');
  };

  const screen = useMemo(() => {
    if (route === 'tests') return <TestsPage startTest={startTest} notify={notify} />;
    if (route === 'create') {
      return (
        <CreatePage
          draft={draft}
          setDraft={setDraft}
          activeQuestionId={activeQuestionId}
          setActiveQuestionId={setActiveQuestionId}
          notify={notify}
        />
      );
    }
    if (route === 'take') return <TakeTestPage selectedTest={selectedTest} run={run} setRun={setRun} notify={notify} />;
    if (route === 'sessions') return <SessionsPage setRoute={setRoute} />;
    if (route === 'arena') {
      return (
        <ArenaPage
          arenaPhase={arenaPhase}
          setArenaPhase={setArenaPhase}
          arenaAnswer={arenaAnswer}
          setArenaAnswer={setArenaAnswer}
        />
      );
    }
    if (route === 'messages') return <MessagesPage conversations={conversations} setConversations={setConversations} />;
    if (route === 'profile') return <ProfilePage />;
    if (route === 'auth') return <AuthPage setAuthed={setAuthed} setRoute={setRoute} notify={notify} />;
    return <OverviewPage setRoute={setRoute} startTest={startTest} />;
  }, [activeQuestionId, arenaAnswer, arenaPhase, conversations, draft, route, run, selectedTest]);

  return (
    <AppShell
      route={route}
      setRoute={setRoute}
      isAuthed={isAuthed}
      notice={notice}
      clearNotice={() => setNotice('')}
    >
      {screen}
    </AppShell>
  );
}
