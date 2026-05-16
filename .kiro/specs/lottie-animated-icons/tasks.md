# Implementation Plan: Lottie Animated Icons

## Overview

Реализация выполняется по принципу «фундамент → ядро → интеграции → CI». Сначала готовится инфраструктура (зависимости, структура папок, реестр, CREDITS), затем чистые модули и хуки (`applyColorOverride`, `useReducedMotionLive`, `useInView`, `useLottieAnimation`), затем сборка `LottiePlayer` (lazy) и `LottieIcon` (eager-обёртка) с `LottieErrorBoundary` и `computeAria`. После этого выполняются 6 точечных интеграций в UI (NotificationBell, PublicAchievementsTab, LoadingIndicator, EmptyState, TakeTest success, MessageBubble reaction). В конце — Vite-плагин валидации реестра/CREDITS, CI-скрипт контроля размера бандла и snapshot-тесты публичного API существующих компонентов (`AnimatedFlame`, `AnimatedIcon`, `AnimatedHero`).

Property-тесты на основе fast-check встраиваются в задачи параллельно с реализацией соответствующего модуля. Каждый property-тест помечен номером свойства (P1–P20) и пунктами требований из `requirements.md`. Каждая property-задача создаёт собственный тест-файл — это упрощает параллельную работу нескольких агентов и обеспечивает соблюдение правила «один файл — одна задача за волну».

Стек реализации: React 18 + Vite 5 + JavaScript/JSX (соответствует существующему `client/`).

## Tasks

- [x] 1. Подготовка инфраструктуры
  - [x] 1.1 Установить devDependencies и runtime-зависимость Lottie
    - В `client/package.json` добавить devDependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `happy-dom`, `fast-check`
    - В `client/package.json` добавить dependency: `lottie-web` (используется light-сборка `lottie-web/build/player/lottie_light` через динамический импорт)
    - В `client/package.json` добавить scripts: `"test": "vitest --run"`, `"test:watch": "vitest"`, `"check:bundle": "node scripts/check-bundle-size.mjs"`
    - Запустить `npm install` в `client/`
    - _Requirements: 3.1, 3.4_

  - [x] 1.2 Создать конфигурацию Vitest для клиента
    - Создать `client/vitest.config.js`: environment `happy-dom`, globals true, setupFiles `./vitest.setup.js`, fast-check `numRuns: 100`
    - Создать `client/vitest.setup.js`: импорт `@testing-library/jest-dom`, моки `window.matchMedia` и `window.IntersectionObserver` по умолчанию, helper для сброса модульных кэшей между тестами
    - _Requirements: 3.1, 3.4_

  - [x] 1.3 Создать структуру каталогов и плейсхолдеры
    - Создать `client/src/components/LottieIcon/` с подкаталогом `__tests__/`
    - Создать `client/src/assets/lottie/` с подкаталогом `__tests__/`
    - Создать `client/scripts/`
    - В `client/src/components/LottieIcon/index.js` создать пустой реэкспорт-стаб (обновится в задаче 5.3)
    - _Requirements: 4.1_

- [x] 2. Чистые функции работы с цветом
  - [x] 2.1 Реализовать `parseColor`
    - В `client/src/components/LottieIcon/applyColorOverride.js` реализовать `parseColor(input)` и `normalizeMappingKey`
    - Поддержка форматов `#RRGGBB` и `rgb(R, G, B)`; возврат `[r/255, g/255, b/255]`
    - Бросок в DEV (`import.meta.env.DEV`) при невалидной строке, тихий пропуск ключа в production
    - _Requirements: 5.3, 5.4_

  - [ ]* 2.2 Property-тест: эквивалентность hex/rgb представлений
    - **Property 14: Color parsing equivalence**
    - **Validates: Requirement 5.3**
    - Файл: `client/src/components/LottieIcon/__tests__/parseColor.property.test.js`
    - Генератор: `fc.tuple(fc.integer({min:0,max:255}), fc.integer({min:0,max:255}), fc.integer({min:0,max:255}))`
    - Утверждение: `parseColor('#RRGGBB')` и `parseColor('rgb(R, G, B)')` для одного цвета дают идентичные кортежи с допуском `≤ 1e-9`

  - [x] 2.3 Реализовать `applyColorOverride(animationData, mapping)`
    - В том же файле `client/src/components/LottieIcon/applyColorOverride.js`
    - `structuredClone` исходного объекта (immutable вход)
    - Рекурсивный обход слоёв `layers[i].shapes[*].it[*].c.k` (статический и анимированный цвет)
    - Сравнение нормализованного цвета с ключами mapping с допуском `≤ 1/255`
    - Возврат `{ data, meta: { unmatchedKeys: string[] } }`
    - DEV-only `console.warn` для unmatchedKeys
    - _Requirements: 5.1, 5.4_

  - [ ]* 2.4 Property-тест: completeness `applyColorOverride`
    - **Property 12: ColorOverride completeness**
    - **Validates: Requirements 5.1, 5.4**
    - Файл: `client/src/components/LottieIcon/__tests__/applyColorOverride.property.test.js`
    - Генератор синтезирует валидный Lottie JSON с произвольным набором слоёв и цветов; mapping — `fc.dictionary` пар цветов
    - Утверждения (a)–(d): подмена нужных цветов, идентичность остальных, отсутствие исключений, отсутствие мутаций исходного объекта (через `JSON.stringify` snapshot до и после)

- [x] 3. React-хуки
  - [x] 3.1 Реализовать `useReducedMotionLive`
    - В `client/src/components/LottieIcon/useReducedMotionLive.js`
    - `useSyncExternalStore` поверх `window.matchMedia('(prefers-reduced-motion: reduce)')`; SSR-safe `getServerSnapshot`
    - _Requirements: 2.1, 2.3_

  - [ ]* 3.2 Property-тест: live-обновление reduce-motion
    - **Property 8: Reduce-motion live update**
    - **Validates: Requirement 2.3**
    - Файл: `client/src/components/LottieIcon/__tests__/useReducedMotionLive.property.test.jsx`
    - Генератор: `fc.array(fc.boolean(), { minLength: 1, maxLength: 10 })` — последовательность смен `matches`
    - Использует управляемый mock `matchMedia` с явным `dispatchChange`; после каждого изменения проверяет, что DOM соответствует новому значению в том же commit (через `act`)

  - [x] 3.3 Реализовать `useInView(ref, options)`
    - В `client/src/components/LottieIcon/useInView.js`
    - Один `IntersectionObserver` на инстанс; возврат `boolean`
    - Feature detection: при отсутствии `IntersectionObserver` возвращать `true` (деградация к autoplay), DEV-only warn
    - Очистка observer в cleanup
    - _Requirements: 1.9, 11.1_

  - [x] 3.4 Реализовать `useLottieAnimation`
    - В `client/src/components/LottieIcon/useLottieAnimation.js`
    - Динамический импорт `lottie-web/build/player/lottie_light` (исключительно динамический)
    - Создание `lottie.loadAnimation` после `applyColorOverride` на клоне `animationData`
    - Реакция на смену `speed` через `animation.setSpeed`
    - Реакция на смену `colorOverride` через повторный патч живых слоёв (без `loadAnimation` повторно)
    - Cleanup: `animation.destroy()` синхронно
    - Возврат `{ play, stop, goToFirstFrame, isReady }`
    - _Requirements: 1.10, 5.2, 11.2_

  - [ ]* 3.5 Property-тест: распространение скорости
    - **Property 5: Speed propagation**
    - **Validates: Requirement 1.10**
    - Файл: `client/src/components/LottieIcon/__tests__/speed.property.test.jsx`
    - Mock `lottie-web` с записью вызовов `setSpeed`; генератор `fc.float({min:0.01, max:100, noNaN:true})`
    - После монтирования с `speed=s` зафиксирован ровно один `setSpeed(s)`; после rerender со `speed=s'` — новый `setSpeed(s')`, без новых `loadAnimation`

  - [ ]* 3.6 Property-тест: cleanup при unmount
    - **Property 19: Cleanup on unmount**
    - **Validates: Requirement 11.2**
    - Файл: `client/src/components/LottieIcon/__tests__/cleanup.property.test.jsx`
    - Mock `lottie-web` с подсчётом `destroy()`; генератор `fc.commands`: `mount → wait? → unmount`
    - (a) при достижении Ready `destroy` вызван ровно один раз; (b) до Ready `destroy` не вызван и нет необработанного rejection (через перехват `unhandledrejection`)

- [x] 4. Error boundary, ARIA-логика, реестр и ассеты
  - [x] 4.1 Реализовать `LottieErrorBoundary` и набор `failedNames`
    - В `client/src/components/LottieIcon/LottieErrorBoundary.jsx` реализовать класс с `getDerivedStateFromError`, `componentDidCatch` (DEV-only `console.error`)
    - Экспорт модульного `failedNames: Set<string>` и хелперов `markFailed(name)`, `hasFailed(name)`
    - Render `this.props.fallback` при `state.failed === true`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 4.2 Реализовать `computeAria`
    - В `client/src/components/LottieIcon/computeAria.js` реализовать `computeAria({ ariaLabel, trigger, onClick })`
    - Возврат объекта атрибутов: `role`/`aria-label`/`aria-hidden`/`tabIndex`/`onKeyDown`
    - Приоритет `role="button"` при `trigger==='click'` + `onClick`
    - Обработчик клавиатуры: вызов `onClick` и `event.preventDefault()` тогда и только тогда, когда `key === 'Enter' || key === ' '`
    - DEV-only `console.warn` если `trigger==='click'` без `ariaLabel`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 4.3 Property-тест: корректность ARIA-атрибутов
    - **Property 15: ARIA correctness**
    - **Validates: Requirements 6.1, 6.2**
    - Файл: `client/src/components/LottieIcon/__tests__/aria.property.test.js`
    - Генератор: `fc.option(fc.string())` для `ariaLabel` (включая `undefined`, пустую строку, whitespace)
    - Проверка таблицы решений: непустая trim-строка → `role:'img'` + `aria-label`, без `aria-hidden`; иначе `aria-hidden:'true'`, без `role`/`aria-label`

  - [ ]* 4.4 Property-тест: parity клавиатуры с кликом
    - **Property 16: Keyboard activation parity**
    - **Validates: Requirement 6.3**
    - Файл: `client/src/components/LottieIcon/__tests__/keyboard.property.test.js`
    - Генератор: произвольный `key: fc.string()` (включая `'Enter'`, `' '`, и шум)
    - Утверждение: `onClick` вызывается ⇔ `key==='Enter' || key===' '`; в этом случае `event.preventDefault` тоже вызван

  - [x] 4.5 Реализовать `client/src/assets/lottie/registry.js`
    - Экспорт объекта `lottieRegistry` с записями `{ loader, fallback, defaultSize?, description? }` для всех 6 имён: `bell`, `trophy`, `loading`, `empty`, `testSuccess`, `reactionFire`
    - Каждая запись: `loader: () => import('./<name>.json')`, `fallback` — иконка из `lucide-react` (`Bell`, `Trophy`, `Loader2`, `Inbox`, `CheckCircle2`, `Smile`)
    - `Object.freeze(lottieRegistry)` и runtime-guard уникальности ключей
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 4.6 Создать `client/src/assets/lottie/CREDITS.md`
    - Шаблон с разделом на каждый из 6 ассетов; обязательные поля: Source, Author, License (SPDX), Commercial use, UI attribution required, Date added, Notes
    - Все 6 записей с корректными метаданными (`Commercial use: yes`; `UI attribution required: no`)
    - _Requirements: 10.1, 10.2_

  - [x] 4.7 Добавить 6 файлов JSON-ассетов в `client/src/assets/lottie/`
    - Файлы: `bell.json`, `trophy.json`, `loading.json`, `empty.json`, `test-success.json`, `reaction-fire.json`
    - Каждый файл соответствует контракту ассета (поля `v`, `fr`, `w`, `h`, `layers: any[]`, без expressions, без внешних `assets[*].u`)
    - Лицензии и атрибуции согласно `CREDITS.md`
    - _Requirements: 4.3, 10.1_

  - [ ]* 4.8 Property-тест: форма реестра
    - **Property 11: Registry shape**
    - **Validates: Requirement 4.2**
    - Файл: `client/src/assets/lottie/__tests__/registry.property.test.js`
    - Генератор: `fc.constantFrom(...Object.keys(lottieRegistry))`
    - Утверждение: для каждого ключа `typeof loader === 'function'`, `loader()` возвращает `Promise`, `typeof fallback === 'function'`

- [x] 5. `LottiePlayer` (lazy) и `LottieIcon` (публичная eager-обёртка)
  - [x] 5.1 Реализовать `LottiePlayer`
    - В `client/src/components/LottieIcon/LottiePlayer.jsx`
    - Принимает уже разрешённый `animationData`, `fallback`, plus все `LottieIconProps`
    - Использует `useLottieAnimation`, `useInView` (для off-screen pause независимо от триггера), state-machine для `trigger ∈ {hover, click, inView, autoplay}`
    - `try/catch` вокруг загрузки и валидации Lottie JSON (поля `v`, `fr`, `w`, `h`, `layers: any[]`); при ошибке throw → ловится `LottieErrorBoundary`, `markFailed(name)`
    - Применение `computeAria` к корневому `<div>`
    - _Requirements: 1.4–1.10, 5.2, 6.1–6.3, 7.2, 7.3, 11.1, 11.2_

  - [x] 5.2 Реализовать `LottieIcon` (eager-обёртка)
    - В `client/src/components/LottieIcon/LottieIcon.jsx`
    - Проверка `useReducedMotionLive()` и `hasFailed(name)` → ранний рендер Static_Fallback_Icon (props `fallbackIcon` либо `lottieRegistry[name].fallback`) с правильными размерами и `className`
    - Проверка отсутствия `name` в реестре → fallback + DEV `console.error`
    - `React.lazy(() => import('./LottiePlayer.jsx'))` + `Suspense fallback={<Placeholder size={size} className={className} />}` (placeholder невидим, той же ширины/высоты — anti-CLS)
    - Обёртка `<LottieErrorBoundary fallback={<FallbackIcon size=... className=... />}>...</LottieErrorBoundary>`
    - Module-scope `Map<name, animationData>`-кэш (мемоизация распарсенного JSON), используется `LottiePlayer` через переданный аргумент или общий модуль
    - Применяет `computeAria` к корневому элементу как fallback-режим тоже (важно для правильного aria/role в reduce-motion)
    - Пропс `size` дефолтит к 24, `className` пробрасывается
    - _Requirements: 1.1–1.3, 1.11, 2.1, 2.2, 2.4, 3.2, 3.3, 3.5, 7.1_

  - [x] 5.3 Обновить `client/src/components/LottieIcon/index.js`
    - Реэкспорт `LottieIcon` по умолчанию и как named-экспорт
    - _Requirements: 1.1_

  - [ ]* 5.4 Property-тест: visual size invariant
    - **Property 1: Visual size invariant**
    - **Validates: Requirement 1.2**
    - Файл: `client/src/components/LottieIcon/__tests__/visual-size.property.test.jsx`
    - Генератор: `fc.integer({min:1, max:512})` × `fc.constantFrom(...Object.keys(lottieRegistry))`
    - Утверждение: `getBoundingClientRect()` возвращает width/height, равные `size`, как в reduce-motion path, так и в Lottie-path (с моком `matchMedia`)

  - [ ]* 5.5 Property-тест: сохранение className
    - **Property 2: ClassName preservation**
    - **Validates: Requirement 1.3**
    - Файл: `client/src/components/LottieIcon/__tests__/className.property.test.jsx`
    - Генератор: `fc.array(fc.stringMatching(/^[a-z][a-z0-9-]*$/), {minLength:0, maxLength:5}).map(arr => arr.join(' '))`
    - Утверждение: каждый токен присутствует в `classList` корня; внутренние токены компонента сохраняются

  - [ ]* 5.6 Property-тест: согласованность дефолтов trigger
    - **Property 3: Trigger defaults consistency**
    - **Validates: Requirements 1.4, 1.5, 1.6**
    - Файл: `client/src/components/LottieIcon/__tests__/trigger-defaults.property.test.jsx`
    - Генератор: `fc.record({ trigger: fc.constantFrom('autoplay','hover','click','inView'), loop: fc.option(fc.boolean()), autoplay: fc.option(fc.boolean()) })`
    - Mock `lottie-web` фиксирует параметры `loadAnimation`; утверждение: значения совпадают с таблицей дефолтов из design.md

  - [ ]* 5.7 Property-тест: state-machine триггеров
    - **Property 4: Trigger state machine**
    - **Validates: Requirements 1.7, 1.8, 1.9, 11.1**
    - Файл: `client/src/components/LottieIcon/__tests__/trigger-state-machine.property.test.jsx`
    - `fc.commands` (model-based testing) для каждого `trigger`: команды `mouseEnter`, `mouseLeave`, `click`, `viewportEnter`, `viewportExit`
    - Модель: для `hover` — играет ⇔ последнее событие enter; для `click` — играет один раз после каждого click; для `inView` — играет ⇔ внутри viewport
    - При `viewportExit` любая анимация уходит в pause

  - [ ]* 5.8 Property-тест: независимость множественных экземпляров
    - **Property 6: Multiple instances independence**
    - **Validates: Requirement 1.11**
    - Файл: `client/src/components/LottieIcon/__tests__/multi-instance.property.test.jsx`
    - Генератор: `fc.integer({min:1, max:20})` и `fc.array(fc.constantFrom(...names))`
    - Mock `lottie-web` фиксирует число вызовов `loadAnimation` и уникальность возвращаемых объектов; утверждение: ровно `n` вызовов, `n` уникальных объектов

  - [ ]* 5.9 Property-тест: reduce-motion shortcut
    - **Property 7: Reduce-motion shortcut**
    - **Validates: Requirements 2.1, 2.2**
    - Файл: `client/src/components/LottieIcon/__tests__/reduce-motion-shortcut.property.test.jsx`
    - Mock `matchMedia` с `matches:true`, mock `lottieRegistry[name].loader` как spy
    - Утверждение: (a) DOM содержит fallback (lucide иконка); (b) `loader` не вызывается; (c) Lottie_Chunk не запрашивается (динамический импорт `LottiePlayer` не запускается — проверяется через mock `import.meta.glob` или через слежение за `React.lazy` resolve)

  - [ ]* 5.10 Property-тест: custom fallback override
    - **Property 9: Custom fallback override**
    - **Validates: Requirement 2.4**
    - Файл: `client/src/components/LottieIcon/__tests__/custom-fallback.property.test.jsx`
    - Генератор: `name` × произвольный stub-компонент `FallbackIcon`
    - Утверждение: при `matchMedia=true` или error-path в DOM рендерится `FallbackIcon` (помеченный `data-testid`), а не `lottieRegistry[name].fallback`

  - [ ]* 5.11 Property-тест: мемоизация ассетов
    - **Property 10: Asset memoization**
    - **Validates: Requirement 3.5**
    - Файл: `client/src/components/LottieIcon/__tests__/asset-memoization.property.test.jsx`
    - Spy на `lottieRegistry[name].loader`; `fc.commands`: mount → unmount → mount; mount; mount (включая параллельные)
    - Утверждение: `loader` вызван ровно один раз для одного и того же `name`

  - [ ]* 5.12 Property-тест: ColorOverride no-reload
    - **Property 13: ColorOverride no-reload**
    - **Validates: Requirement 5.2**
    - Файл: `client/src/components/LottieIcon/__tests__/color-override-no-reload.property.test.jsx`
    - Mock `lottie-web` с подсчётом `loadAnimation`; rerender с двумя разными `colorOverride`
    - Утверждение: ровно один `loadAnimation`; цвета слоёв в живом объекте обновляются (через mock-метод `getLayers()` или прямую инспекцию переданного `animationData` reference)

  - [ ]* 5.13 Property-тест: fault-tolerance
    - **Property 17: Fault-tolerance to fallback**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Файл: `client/src/components/LottieIcon/__tests__/fault-tolerance.property.test.jsx`
    - Генератор: `fc.constantFrom('chunk-load-failed','asset-load-failed','invalid-lottie-json')` × валидные props
    - В каждом сценарии моки заставляют соответствующий путь упасть; утверждения: нет runtime exception в родительском дереве (отсутствие в `console.error` записи unhandled), DOM содержит fallback

  - [ ]* 5.14 Property-тест: no retry after error
    - **Property 18: No retry after error**
    - **Validates: Requirement 7.4**
    - Файл: `client/src/components/LottieIcon/__tests__/no-retry.property.test.jsx`
    - После одного провала `name`: следующие mounts того же `name` не должны вызывать `lottieRegistry[name].loader` (spy с `mock.calls.length === 1`)

- [x] 6. Checkpoint: ядро готово и зелёное
  - Запустить `npm run test` в `client/`. Все unit и property-тесты для `applyColorOverride`, хуков, `computeAria`, `LottieIcon`, `LottiePlayer` должны быть зелёными. Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Базовые unit/example тесты
  - [ ]* 7.1 Smoke-тест: компонент монтируется для каждого ключа реестра
    - Файл: `client/src/components/LottieIcon/__tests__/smoke.unit.test.jsx`
    - Итерация по `Object.keys(lottieRegistry)`: рендер `<LottieIcon name={key} />` без ошибок
    - _Requirements: 1.1, 4.4_

  - [ ]* 7.2 Unit-тест: дефолты props и минимальное поведение
    - Файл: `client/src/components/LottieIcon/__tests__/defaults.unit.test.jsx`
    - Проверка `size=24` по умолчанию, `role/aria-hidden` по дефолтным props, ARIA при наличии `ariaLabel`
    - _Requirements: 1.2, 6.1, 6.2_

- [x] 8. Интеграция в UI (6 точек)
  - [x] 8.1 Интегрировать `LottieIcon` в `NotificationBell`
    - В `client/src/components/NotificationBell.jsx` заменить статичную `Bell`-иконку на `<LottieIcon name="bell" trigger="inView" loop={false} size={16} ariaLabel={t('notifications')} />` (где `t` — текущий локализатор; если его нет — захардкодить «Уведомления»)
    - Сохранить существующее поведение клика (открытие dropdown) на родительском элементе/кнопке, не на `LottieIcon`
    - Сохранить `framer-motion` и поведение анимации dropdown без изменений
    - _Requirements: 8.1, 8.2, 8.4, 9.1_

  - [x] 8.2 Интегрировать `LottieIcon` в `PublicAchievementsTab`
    - В `client/src/components/profile/settings/public/PublicAchievementsTab.jsx` рядом с заголовком вкладки и/или каждой разблокированной ачивкой добавить `<LottieIcon name="trophy" trigger="inView" loop={false} size={22} ariaLabel="Trophy" />`
    - Не трогать `AnimatedIcon`/`AnimatedFlame`, если они используются внутри
    - _Requirements: 8.1, 8.4, 9.2_

  - [x] 8.3 Создать `LoadingIndicator` на базе `LottieIcon`
    - Создать `client/src/components/LoadingIndicator.jsx` — обёртка `<LottieIcon name="loading" trigger="autoplay" loop={true} size={48} ariaLabel="Loading" />`
    - Применить компонент в верхнеуровневых page-loaders (как минимум один существующий маршрутный suspense-fallback или page-level loader; конкретный файл выбирает реализатор, существующие spinner'ы `Loader2` сохраняются)
    - _Requirements: 9.3_

  - [x] 8.4 Создать `EmptyState` на базе `LottieIcon`
    - Создать `client/src/components/EmptyState.jsx` с props `{ illustration?: string, caption: string }`; по умолчанию `illustration='empty'`
    - Внутри: `<LottieIcon name={illustration} trigger="autoplay" loop={true} size={120} />` + подпись
    - Применить хотя бы в одном существующем месте «нет данных» (например, список тестов или сообщений)
    - _Requirements: 9.4_

  - [x] 8.5 Интегрировать `LottieIcon` в success-экран `TakeTest`
    - В `client/src/pages/TakeTest.jsx` (или эквивалентном — реализатор уточняет путь) на экране «успешно отправлено» добавить `<LottieIcon name="testSuccess" trigger="autoplay" loop={false} size={72} ariaLabel="Тест отправлен" />`
    - _Requirements: 9.5_

  - [x] 8.6 Интегрировать `LottieIcon` в reaction picker `MessageBubble`
    - В `client/src/components/chat/MessageBubble.jsx` для emoji `🔥` в `QUICK_REACTIONS` отрендерить `<LottieIcon name="reactionFire" trigger="hover" loop={false} size={24} ariaLabel="Fire reaction" />`
    - Остальные emoji остаются обычным текстом emoji (по требованию первой итерации)
    - Сохранить существующее поведение клика (отправка реакции)
    - _Requirements: 9.6, 9.7_

- [x] 9. Build-time гарантии и CI
  - [x] 9.1 Реализовать Vite-плагин валидации реестра/CREDITS
    - Создать `client/vite-plugins/lottie-registry-guard.js` (CommonJS/ESM-совместимо для `vite.config.js`)
    - Экспортировать чистую функцию `validateRegistryAndCredits({ assetFiles, registryKeys, creditsEntries })` — для тестируемости отдельно от Vite-runtime
    - В `buildStart` плагин: читает все `*.json` в `client/src/assets/lottie/`, импортирует `registry.js`, парсит `CREDITS.md` regex'ом (поля License, Commercial use, UI attribution required)
    - Условия ошибки сборки (через `this.error`): (a) дубликаты ключей в registry; (b) множества имён файлов и ключей не совпадают; (c) ключ отсутствует в CREDITS; (d) запись CREDITS имеет `Commercial use !== 'yes'` или `UI attribution required !== 'no'`
    - Подключить плагин в `client/vite.config.js`
    - _Requirements: 4.5, 10.1, 10.2, 10.3_

  - [ ]* 9.2 Property-тест: корректность валидатора реестра/CREDITS
    - **Property 20: Registry/CREDITS validator correctness**
    - **Validates: Requirements 4.5, 10.1, 10.2, 10.3**
    - Файл: `client/src/assets/lottie/__tests__/registry-validator.property.test.js`
    - Тестирует чистую функцию `validateRegistryAndCredits` из плагина
    - Генераторы: `fc.array(fc.string())` для имён файлов и ключей, `fc.array(fc.record({ name, license, commercial, uiAttribution }))`
    - Утверждение: ошибка ⇔ выполнено хотя бы одно из условий (a)–(d)

  - [x] 9.3 ESLint правило: запрет статического импорта lottie в Initial_Bundle
    - В `client/.eslintrc.cjs` (создать если отсутствует) добавить `no-restricted-imports` для путей `lottie-web` и `./components/LottieIcon/LottiePlayer*` в `client/src/main.jsx` и любых файлах, на которые ссылается граф eager-импортов
    - В комментарии конфига указать связь с Requirement 3.1
    - _Requirements: 3.1_

  - [x] 9.4 CI-скрипт контроля размера бандла
    - Создать `client/scripts/check-bundle-size.mjs`
    - Запускает `vite build` (или ожидает уже сделанный), читает `client/dist/assets/*.js`
    - Подсчитывает gzip-размер entry-чанков (исключая lazy-чанки `LottiePlayer`/`lottie-web`/JSON-ассетов)
    - Сравнивает с baseline в `client/scripts/bundle-size-baseline.json`
    - При превышении +10 KB gzip — exit code 1 с понятным сообщением; при первичном запуске — записывает baseline
    - _Requirements: 3.1, 3.4_

- [ ] 10. Snapshot-тесты публичного API существующих компонентов и контракт зависимостей
  - [ ]* 10.1 Snapshot-тест: `AnimatedFlame` props и DOM
    - Файл: `client/src/components/__tests__/AnimatedFlame.snapshot.test.jsx`
    - Snapshot рендера с типичными props; проверка, что компонент не использует `LottieIcon` в первой итерации
    - _Requirements: 8.1, 8.3, 8.4_

  - [ ]* 10.2 Snapshot-тест: `AnimatedIcon` props и DOM
    - Файл: `client/src/components/__tests__/AnimatedIcon.snapshot.test.jsx`
    - _Requirements: 8.1, 8.4_

  - [ ]* 10.3 Snapshot-тест: `AnimatedHero` props и DOM
    - Файл: `client/src/components/__tests__/AnimatedHero.snapshot.test.jsx`
    - _Requirements: 8.1, 8.4_

  - [ ]* 10.4 Контракт-тест `package.json`: наличие `framer-motion` и `lucide-react`
    - Файл: `client/__tests__/package.contract.test.js`
    - Чтение `client/package.json`; ассерт наличия обоих в `dependencies`
    - _Requirements: 8.2_

- [ ] 11. Integration-тест сборки
  - [ ]* 11.1 Тест после `vite build`: отдельные chunk-файлы для рантайма и каждого ассета
    - Файл: `client/__tests__/build-chunks.integration.test.js`
    - Запуск через `child_process` `vite build`, парсинг манифеста/имён файлов в `client/dist/assets`
    - Ассерты: присутствует chunk с подстрокой `lottie_light` (или эквивалент); для каждого `name` в реестре — отдельный JS/JSON-чанк ассета
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 12. Final checkpoint
  - Запустить `npm run test`, `npm run build` и `npm run check:bundle` в `client/`. Убедиться: все тесты зелёные; сборка валится при нарушении контракта реестра/CREDITS; размер entry-бандла не превышает baseline + 10 KB gzip. Ensure all tests pass, ask the user if questions arise.

## Notes

- Задачи, отмеченные `*`, относятся к тестам и могут быть пропущены для ускоренного MVP, но крайне рекомендуются: каждое отмеченное property-тест-задание реализует ровно одно из свойств P1–P20 из `design.md` и валидирует конкретные пункты `requirements.md`.
- Каждая задача ссылается на конкретные пункты требований (например, _Requirements: 1.7, 1.8, 1.9, 11.1_), что обеспечивает трассируемость до спецификации.
- Property-тесты используют исключительно `fast-check` (model-based testing через `fc.commands` для state-machine задач). Минимум `numRuns: 100`, фиксированный seed через `FC_SEED` в CI.
- Каждый property-тест размещён в собственном файле — это устраняет конфликт записи между задачами и позволяет параллельное выполнение.
- Чекпоинты (задачи 6 и 12) служат точками валидации: ядро + тесты должно быть зелёным до интеграций; сборка и контроль бандла — после.
- Все integration-точки (8.1–8.6) ограничиваются 6 местами, перечисленными в Requirement 9 — расширения этого списка в первой итерации не выполняются (Req 9.7).
- Vite-плагин (9.1) и CI-скрипт (9.4) реализуют build-time гарантии Req 3.1, 3.4, 4.5, 10.1, 10.2, 10.3 — это «defense in depth» поверх unit-тестов.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "3.3", "4.1", "4.2", "4.6", "4.7"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.4", "4.3", "4.4", "4.5", "9.3"] },
    { "id": 3, "tasks": ["2.4", "3.5", "3.6", "4.8", "5.1", "9.1"] },
    { "id": 4, "tasks": ["5.2", "9.2"] },
    { "id": 5, "tasks": ["5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12", "5.13", "5.14"] },
    { "id": 6, "tasks": ["7.1", "7.2", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "9.4", "10.1", "10.2", "10.3", "10.4"] },
    { "id": 7, "tasks": ["11.1"] }
  ]
}
```
