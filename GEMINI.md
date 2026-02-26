# UniTest Platform — Full Specification for Redesign

## Project Overview

UniTest is a comprehensive online testing and assessment platform designed for educational institutions. The platform enables teachers to create, manage, and distribute tests while students can take tests and track their performance. An administrative layer provides oversight and moderation capabilities.

**Core Purpose**: Facilitate seamless test creation, distribution, assessment, and analytics in an educational environment.

**Technology Stack**: 
- Frontend: React 18 + Vite + TailwindCSS + Framer Motion
- Backend: Node.js + Express + MongoDB
- Authentication: JWT-based
- Deployment: Fly.io

---

## Design Philosophy Requirements

### MANDATORY RESTRICTIONS:
1. **NO neon colors, neon glows, or vibrant fluorescent aesthetics under any circumstances**
2. **NO emojis anywhere in the UI**

### Design Direction:
- **Minimalist Premium Aesthetic**: Think luxury brand websites — clean, spacious, sophisticated
- **Visual Hierarchy**: Clear, purposeful use of whitespace and typography
- **Professional Color Palette**: Muted, elegant tones (grays, deep blues, subtle earth tones)
- **Typography**: Modern, readable sans-serif fonts with clear hierarchy
- **Iconography**: Simple, line-based icons (lucide-react library is already integrated)
- **Motion**: Subtle, purposeful animations (framer-motion available) — no excessive effects
- **Consistency**: Unified design language across all pages

Think: Apple website, Stripe dashboard, Linear app — professional, clean, expensive-looking.

---

## User Roles & Permissions

### 1. Student (`role: 'student'`)
- Take tests via share links or public test listing
- View personal results and history
- Access leaderboards
- Manage personal profile (avatar, name, password, language)
- Comment on test profiles
- Report inappropriate content (tests, comments, users)
- View notifications (test results, replies)

### 2. Teacher (`role: 'teacher'`)
- All student capabilities, plus:
- Create and edit tests
- Create questions in a reusable question bank
- View detailed results for their tests (per-student analytics)
- Export results to Excel
- Delete their own tests and questions
- Import questions from CSV format

### 3. Admin (`role: 'admin'`)
- All teacher capabilities, plus:
- Access admin panel with tabs:
  * **Users tab**: View all users, ban/unban, issue warnings, change roles, delete accounts
  * **Tests tab**: View all tests, delete any test, view creator info
  * **Reports tab**: Review user/test/comment reports with sub-filters (Pending/Resolved/Rejected), resolve or reject reports with admin notes
- Full moderation control over platform content

---

## Core Features & Logic

### Authentication System
- Registration with: firstName, lastName, middleName (optional), email, password
- Each user receives a unique alphanumeric ID (e.g., `A1B2C3D4`) for identification
- Login returns JWT token stored in localStorage
- Three language options: English, Russian, Kazakh (fully localized UI)
- Avatar upload (base64 encoding, stored in MongoDB)

### Test Creation & Management

#### Test Structure
A test consists of:
- **Metadata**: title, description, tags (array), creator reference
- **Questions array**: Each question has:
  - Type: `single-choice`, `multiple-choice`, `true-false`, `essay`, `matching`, `fill-blank`
  - Question text
  - Points value
  - Options (for choice-based questions) with `isCorrect` boolean
  - Media support: image/video/audio upload for question and each option
  - Correct answer text (for non-choice types)
  - Explanation field (optional)

#### Settings & Controls
- **Time limit** (minutes, 0 = unlimited)
- **Shuffle questions** (randomize order for each student)
- **Shuffle options** (randomize answer order)
- **Show results** (immediately after submission or hidden)
- **Allow review** (students can review their answers)
- **Max attempts** (limit how many times a student can retake)
- **Public/Private toggle** (public tests appear in global listing)
- **Anti-cheat system**:
  - Block tab switching (tracks violations)
  - Block copy/paste
  - Block screenshots
  - Max violations threshold (auto-submit test when exceeded)

#### Auto-save & Drafts
- Test drafts auto-save to localStorage every 2 seconds while editing
- Draft restoration prompt on page reload
- Indicator showing "Draft saved" status

#### Question Bank Integration
- Teachers can save questions to a reusable bank (category, tags, search)
- Import questions from bank into tests with one click
- Bulk selection and deletion
- Search and filter by type/category

### Test Taking Experience

#### Access Methods
1. **Share link**: `/test/:shareLink` (unique alphanumeric code)
2. **Public listing**: Browse all public tests with search/filter

#### During Test
- Timer display (if time limit set)
- Question navigation with status indicators (answered/unanswered)
- Media display for questions and options
- Anti-cheat monitor (tab switch counter, paste blocker, etc.)
- Auto-submission when time expires or max violations reached

#### Submission & Grading
- Auto-grading for all question types except essays
- Essays require manual grading by teacher (shows as "pending")
- Calculate percentage score = (earned points / total points) × 100
- Store: answers, correct answers, points earned, violations count, time spent

### Results & Analytics

#### Student View (`/my-results`)
- List of all tests taken
- For each result: test name, score, percentage, violations, date, link to detailed review

#### Teacher View (`/test-results/:testId`)
- Table of all submissions for their test
- Columns: student name (with avatar), score, percentage, violations, date, actions (view/delete)
- **Deduplication toggle**: Show only best attempt per student OR all attempts
- Export to Excel (all data)
- Click to view individual submission details

#### Detailed Result Page (`/result/:resultId`)
- Shows each question with:
  - Student's answer
  - Correct answer
  - Points earned/total
  - Explanation (if provided)
- Overall stats: total score, percentage, time spent, violations
- Teacher can manually grade essay questions here

### Leaderboard System
- Global leaderboard based on average scores across all tests
- Display: rank, student name, avatar, average %, tests taken count
- Pagination

### Profile System

#### Personal Profile (`/profile`)
- **Tabbed interface**:
  - **Info tab**: Name editing, language selector, warnings list, unique ID display (with copy button)
  - **Security tab**: Change password
  - **Comments tab**: List of user's own comments on tests with delete option
- **Stats display**:
  - Tests created (links to `/my-tests`)
  - Tests taken (links to `/my-results`)
  - Average score percentage
- Avatar upload with camera icon overlay
- Member since date

#### Public User Profile (`/user-profile/:userId`)
- View other users' public info: name, avatar, role, join date
- Stats: tests created, tests taken, average score
- List of public tests created by user
- Report button (for inappropriate behavior)

### Commenting System

#### Test Profile Page (`/test-profile/:shareLink`)
- Displays test info: title, description, creator (clickable to their profile), tags, question count, settings
- Leaderboard for this specific test (top 10 students)
- Comment section:
  - Threaded replies (one level deep — replies to replies flattened to avoid nesting)
  - Each comment shows: author avatar, name, text, timestamp
  - Reply button, delete (own comments only)
  - Comments sorted by newest first

### Notification System
- Bell icon in navbar with unread count badge
- Dropdown list of notifications:
  - Test result notifications (when student completes teacher's test)
  - Comment reply notifications
  - Admin warnings
- Mark as read functionality
- Click to navigate to relevant page (result, test profile, etc.)

### Reporting & Moderation

#### Report Submission
- Users can report:
  - Other users (spam, harassment, etc.)
  - Tests (inappropriate content)
  - Comments (offensive language)
- Report form: target type, target ID, reason text
- Stores reporter reference

#### Admin Reports Panel (`/admin` → Reports tab)
- Sub-tabs: All / Users / Tests / Comments
- Status filter: Pending / Resolved / Rejected
- Each report card shows:
  - Type badge (User/Test/Comment)
  - Status badge (Pending/Resolved/Rejected)
  - Reason text
  - Reporter info
  - Reported content preview/link
  - Admin actions: Resolve (with optional note) or Reject
- After action, report updates status and stores admin note

### Admin Panel (`/admin`)

#### Users Tab
- Table view: avatar, name, email, role, join date, status (active/banned)
- Search by name/email
- Actions per user:
  - Ban/Unban toggle
  - Issue warning (modal with text input)
  - Change role (dropdown: student/teacher/admin)
  - Delete account (confirmation dialog)

#### Tests Tab
- Table view: title, creator name, question count, created date
- Search by title
- Actions:
  - View test details
  - Delete test (confirmation dialog)

#### Stats Cards (top of admin panel)
- **Total Users** (clickable → users tab)
- **Total Tests** (clickable → tests tab)
- **Banned Users** (clickable → users tab with filter)
- Each stat card shows count and growth/change indicator

### Additional Features

#### Zhuz System (Cultural Context)
- Each user optionally belongs to a Zhuz (regional tribal confederation in Kazakhstan):
  - **Senior Zhuz**: Dulat, Uysin, Jalayir, and others
  - **Middle Zhuz**: Argyn, Naiman, Kypchak, Kerei
  - **Junior Zhuz**: Alimuly, Baiuly, Zhetyru sub-groups
- Used for cultural/educational context in Kazakhstan
- No functional impact on platform logic

#### Email Notifications (Optional)
- If SMTP configured (.env), sends email to teacher when student completes their test
- Email includes: student name, test title, score, percentage
- Styled HTML email with grade-based color coding

#### CSV/Excel Import
- Teachers can bulk-import questions from CSV
- Format: Question, Type, CorrectAnswer, Option1, Option2, Option3, Option4
- System matches CorrectAnswer to options and sets `isCorrect` flags automatically

---

## Page Structure & Navigation

### Public Pages (No Auth Required)
- `/` — Landing/Home page with app description
- `/login` — Login form
- `/register` — Registration form
- `/test/:shareLink` — Take test (prompts login if not authenticated)
- `/test-profile/:shareLink` — View test info, comments, leaderboard

### Student Pages
- `/dashboard` — Personal dashboard with quick stats and recent activity
- `/my-results` — List of all test results
- `/result/:resultId` — Detailed result view
- `/profile` — Personal profile management
- `/user-profile/:userId` — View other users' public profiles
- `/leaderboard` — Global leaderboard

### Teacher Pages (Additional)
- `/create-test` — Create/edit test interface
- `/my-tests` — List of created tests with actions (edit, delete, view results, copy link)
- `/test-results/:testId` — View all submissions for a test
- `/question-bank` — Manage reusable questions

### Admin Pages (Additional)
- `/admin` — Admin panel with users/tests/reports management

### Navbar (Authenticated)
- Logo/Brand (links to `/dashboard`)
- Navigation links based on role
- Notification bell with badge
- Theme toggle (dark/light mode)
- User avatar dropdown:
  - Profile
  - My Tests (if teacher)
  - Admin Panel (if admin)
  - Logout

---

## Technical Implementation Notes

### State Management
- React Context for: Authentication, Theme (dark/light), Language (en/ru/kz)
- Local state for page-specific data

### Data Fetching
- Axios for API calls
- Base URL configured in `services/api.js`
- JWT token attached to all authenticated requests via interceptor

### Form Handling
- Controlled components with React state
- Validation before submission
- Toast notifications for feedback (react-hot-toast)

### File Uploads
- Images/videos/audio converted to base64 strings
- Stored directly in MongoDB documents
- Display via data URLs

### Pagination
- Reusable `Pagination` component
- Used in: test lists, results lists, question bank, leaderboards

### Confirmation Dialogs
- Reusable `ConfirmDialog` component
- Used for: delete actions, ban actions, draft restoration

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Collapsible navigation on mobile

---

## Data Models Reference

### User
```
{
  firstName, lastName, middleName (optional),
  email, password (hashed),
  role: 'student'|'teacher'|'admin',
  avatar: base64 string,
  uniqueId: alphanumeric,
  preferredLanguage: 'en'|'ru'|'kz',
  zhuz: { type: string, subGroup: string },
  warnings: [{ message, createdAt }],
  isBanned: boolean,
  createdAt, updatedAt
}
```

### Test
```
{
  title, description,
  creator: User reference,
  tags: [string],
  shareLink: unique code,
  questions: [{
    type, questionText, points,
    options: [{ text, isCorrect, media }],
    correctAnswer, explanation,
    media: { type, url }
  }],
  settings: {
    timeLimit, shuffleQuestions, shuffleOptions,
    showResults, allowReview, maxAttempts, isPublic,
    antiCheat: { blockTabSwitch, blockCopyPaste, blockScreenshot, maxViolations }
  },
  createdAt, updatedAt
}
```

### Result
```
{
  test: Test reference,
  user: User reference,
  answers: [{ questionIndex, answer, isCorrect, pointsEarned }],
  score: number,
  totalPoints: number,
  percentage: number,
  antiCheatViolations: number,
  timeSpent: seconds,
  createdAt
}
```

### BankQuestion
```
{
  creator: User reference,
  type, questionText, points,
  options, correctAnswer, explanation,
  tags: [string],
  category: string,
  usageCount: number,
  createdAt, updatedAt
}
```

### Comment
```
{
  test: Test reference,
  user: User reference,
  text: string,
  replyTo: Comment reference (null for root comments),
  createdAt, updatedAt
}
```

### Notification
```
{
  user: User reference,
  type: 'test_result'|'comment_reply'|'warning',
  title, message,
  link: URL to navigate,
  isRead: boolean,
  meta: object (additional data),
  createdAt
}
```

### Report
```
{
  reporter: User reference,
  targetType: 'user'|'test'|'comment',
  targetId: ObjectId,
  reason: string,
  status: 'pending'|'resolved'|'rejected',
  adminNote: string,
  createdAt, updatedAt
}
```

---

## UX Flow Examples

### Teacher Creates Test
1. Navigate to `/create-test`
2. Fill title, description, tags
3. Add questions one by one:
   - Select type
   - Enter question text
   - Upload media (optional)
   - Add options/correct answer based on type
   - Set points value
4. Configure settings (time, attempts, anti-cheat, public/private)
5. Draft auto-saves every 2 seconds
6. Click "Save Test" → Generate share link
7. Share link with students or publish publicly

### Student Takes Test
1. Access via share link or find in public listing
2. Click "Start Test" → Timer starts (if applicable)
3. Answer questions sequentially or jump via navigation
4. Anti-cheat monitor tracks violations
5. Submit when done (or auto-submit on time expire)
6. See results immediately (if allowed) or "pending grading" for essays
7. Notification sent to teacher about completion

### Admin Moderates Report
1. Go to `/admin` → Reports tab
2. Filter by type (Users/Tests/Comments) and status (Pending)
3. Click on a report card to expand details
4. Review reported content and reason
5. Decide: Resolve (with note like "Warning issued to user") or Reject (with note like "Not a violation")
6. Report updates to Resolved/Rejected status
7. Take additional action if needed (ban user, delete test, etc.)

---

## Performance Considerations

- Lazy load images and media
- Paginate large lists (users, tests, results, questions)
- Debounce search inputs
- Cache static data (question types, language options)
- Optimize MongoDB queries with indexes (createdAt, email, shareLink, etc.)

---

## Accessibility & Internationalization

- All text externalized to language files (keys like `t('testTitle')`)
- Keyboard navigation support
- Screen reader friendly labels
- Color contrast meeting WCAG AA standards
- Focus indicators for interactive elements

---

## Final Note for Designer

You have complete freedom in visual execution within these constraints:
- **Minimalist, premium aesthetic** — think luxury, sophistication, space
- **NO neon colors or glow effects** — muted, professional palette only
- **NO emojis** — use icons from lucide-react instead
- **Consistency** — unified design language throughout

Focus on creating an experience that feels expensive, professional, and effortlessly usable. The platform should convey trust, intelligence, and modernity.
