# Requirements Document

## Introduction

Документ описывает требования к внедрению анимированных иконок на основе формата Lottie в клиентское приложение UniTest. Цель — обогатить визуальный язык интерфейса (геймификация, уведомления, ачивки, состояния загрузки и пустые состояния) выразительной векторной анимацией, при этом сохранить контролируемый размер бандла, поддержать предпочтение пользователя по уменьшенной анимации (`prefers-reduced-motion`), обеспечить доступность и предоставить единый переиспользуемый компонент. Существующие шаблоны `AnimatedFlame`, `AnimatedIcon` и `AnimatedHero` сохраняются и не заменяются на Lottie без явного указания.

## Glossary

- **UniTest_Client**: React-приложение в каталоге `client/` (React 18, Vite 5, Tailwind 3).
- **Lottie_Icon_Component**: новый универсальный React-компонент `LottieIcon`, отображающий Lottie-анимацию.
- **Lottie_Asset**: файл анимации в формате `.lottie` (dotLottie) или `.json` (классический Bodymovin).
- **Lottie_Runtime**: JavaScript-библиотека выполнения Lottie-анимации в браузере (конкретный пакет выбирается на этапе Design).
- **Asset_Registry**: программный каталог зарегистрированных Lottie-ассетов, сопоставляющий логическое имя с функцией ленивой загрузки файла.
- **Reduced_Motion_Mode**: состояние браузера, при котором `window.matchMedia('(prefers-reduced-motion: reduce)').matches === true`.
- **Static_Fallback_Icon**: статичная иконка из `lucide-react`, отображаемая вместо анимации (например, при ошибке загрузки или в Reduced_Motion_Mode).
- **Initial_Bundle**: содержимое JavaScript-чанков, загружаемых при первом открытии любой страницы UniTest_Client до взаимодействия пользователя.
- **Lottie_Chunk**: отдельный JavaScript-чанк, содержащий код Lottie_Runtime.
- **Asset_Chunk**: отдельный сетевой ресурс, содержащий данные одного Lottie_Asset.
- **Color_Override**: набор пар «исходный цвет → целевой цвет», применяемый к слоям Lottie_Asset во время выполнения.

## Requirements

### Requirement 1: Универсальный компонент LottieIcon

**User Story:** Как разработчик клиентского кода UniTest_Client, я хочу использовать единый компонент `LottieIcon` для отображения Lottie-анимаций, чтобы избежать дублирования логики и обеспечить единообразное поведение во всём приложении.

#### Acceptance Criteria

1. THE Lottie_Icon_Component SHALL принимать имя зарегистрированной анимации через props `name` типа `string`.
2. THE Lottie_Icon_Component SHALL принимать размер иконки в пикселях через props `size` типа `number` со значением по умолчанию 24.
3. THE Lottie_Icon_Component SHALL принимать опциональную CSS-строку класса через props `className` и применять её к корневому DOM-элементу компонента.
4. WHEN props `loop` имеет значение `true`, THE Lottie_Icon_Component SHALL воспроизводить анимацию циклически.
5. WHEN props `loop` имеет значение `false`, THE Lottie_Icon_Component SHALL воспроизводить анимацию не более одного раза за один запуск.
6. WHEN props `autoplay` имеет значение `true` и Lottie_Asset загружен, THE Lottie_Icon_Component SHALL начать воспроизведение анимации без действий пользователя.
7. WHEN props `trigger` имеет значение `"hover"`, THE Lottie_Icon_Component SHALL запускать анимацию при наведении курсора и возвращать анимацию к первому кадру при уходе курсора.
8. WHEN props `trigger` имеет значение `"click"`, THE Lottie_Icon_Component SHALL воспроизводить анимацию один раз при клике пользователя.
9. WHEN props `trigger` имеет значение `"inView"`, THE Lottie_Icon_Component SHALL запускать анимацию при пересечении компонента с видимой областью просмотра.
10. WHERE задан props `speed` со значением больше 0, THE Lottie_Icon_Component SHALL применять переданное значение скорости к воспроизведению.
11. THE Lottie_Icon_Component SHALL поддерживать одновременную работу не менее 5 экземпляров на одной странице без визуальных артефактов наложения.

### Requirement 2: Поддержка предпочтения уменьшенной анимации

**User Story:** Как пользователь UniTest, чувствительный к движению, я хочу, чтобы интерфейс уважал моё системное предпочтение `prefers-reduced-motion: reduce`, чтобы не получать дискомфорт от анимаций.

#### Acceptance Criteria

1. WHILE Reduced_Motion_Mode активен, THE Lottie_Icon_Component SHALL отрисовывать Static_Fallback_Icon вместо Lottie-анимации.
2. WHILE Reduced_Motion_Mode активен, THE Lottie_Icon_Component SHALL не загружать Asset_Chunk для соответствующего Lottie_Asset.
3. WHEN значение `prefers-reduced-motion` изменяется во время сессии пользователя, THE Lottie_Icon_Component SHALL обновлять отрисованный результат в течение одного цикла рендеринга React.
4. WHERE передан props `fallbackIcon` со ссылкой на компонент `lucide-react`, THE Lottie_Icon_Component SHALL использовать переданный компонент в качестве Static_Fallback_Icon.

### Requirement 3: Ленивая загрузка и контроль размера бандла

**User Story:** Как пользователь UniTest на медленном соединении, я хочу, чтобы первая загрузка приложения не замедлялась из-за анимаций, чтобы видеть содержимое страницы как можно быстрее.

#### Acceptance Criteria

1. THE UniTest_Client SHALL изолировать Lottie_Runtime в отдельный Lottie_Chunk, отсутствующий в Initial_Bundle.
2. THE UniTest_Client SHALL загружать Lottie_Chunk только при первом монтировании любого экземпляра Lottie_Icon_Component на странице.
3. THE UniTest_Client SHALL загружать каждый Asset_Chunk в виде отдельного сетевого ресурса по требованию при первом монтировании Lottie_Icon_Component с соответствующим именем.
4. THE UniTest_Client SHALL увеличивать суммарный размер Initial_Bundle (gzip) не более чем на 10 КБ относительно версии без поддержки Lottie.
5. WHEN Asset_Chunk уже был загружен в текущей сессии браузера, THE UniTest_Client SHALL переиспользовать загруженный ресурс из кэша без повторного сетевого запроса.

### Requirement 4: Реестр анимаций и хранение ассетов

**User Story:** Как разработчик UniTest_Client, я хочу иметь единый источник правды о доступных Lottie-анимациях, чтобы не дублировать пути и упростить добавление новых иконок.

#### Acceptance Criteria

1. THE UniTest_Client SHALL хранить файлы Lottie_Asset в каталоге `client/src/assets/lottie/`.
2. THE UniTest_Client SHALL предоставлять Asset_Registry в виде модуля, экспортирующего сопоставление имени анимации с функцией динамического импорта Lottie_Asset.
3. THE UniTest_Client SHALL принимать Lottie_Asset в формате `.lottie` или `.json`.
4. WHEN разработчик добавляет имя в Asset_Registry, THE UniTest_Client SHALL делать это имя доступным для props `name` компонента Lottie_Icon_Component без изменений в самом компоненте.
5. IF в Asset_Registry присутствуют два ассета с одинаковым именем, THEN THE UniTest_Client SHALL прерывать сборку Vite с сообщением об ошибке, идентифицирующим конфликтующие пути.

### Requirement 5: Переопределение цвета во время выполнения

**User Story:** Как разработчик UniTest_Client, я хочу применять цвета из дизайн-системы (Tailwind primary, slate и др.) к Lottie-анимации без редактирования файла анимации, чтобы поддержать тёмную/светлую тему и брендовые цвета.

#### Acceptance Criteria

1. WHERE задан props `colorOverride` в виде объекта пар «исходный цвет → целевой цвет», THE Lottie_Icon_Component SHALL применить Color_Override к слоям Lottie_Asset перед воспроизведением.
2. WHEN значение props `colorOverride` изменяется, THE Lottie_Icon_Component SHALL переотрисовывать анимацию с новым Color_Override без полной перезагрузки Asset_Chunk.
3. THE Lottie_Icon_Component SHALL принимать целевые цвета в формате CSS hex (`#RRGGBB`) и в формате `rgb(R, G, B)`.
4. IF Color_Override содержит исходный цвет, отсутствующий в Lottie_Asset, THEN THE Lottie_Icon_Component SHALL продолжить воспроизведение анимации без модификации цвета и записать предупреждение в консоль только в режиме разработки Vite (`import.meta.env.DEV`).

### Requirement 6: Доступность

**User Story:** Как пользователь, использующий программу чтения с экрана, я хочу, чтобы анимированные иконки были корректно описаны или скрыты от ассистивных технологий, чтобы получать осмысленный контекст без шума.

#### Acceptance Criteria

1. WHEN props `ariaLabel` содержит непустую строку, THE Lottie_Icon_Component SHALL устанавливать атрибуты `role="img"` и `aria-label` на корневом DOM-элементе.
2. WHEN props `ariaLabel` отсутствует или равен пустой строке, THE Lottie_Icon_Component SHALL устанавливать атрибут `aria-hidden="true"` на корневом DOM-элементе.
3. WHEN props `trigger` имеет значение `"click"` и props `onClick` передан, THE Lottie_Icon_Component SHALL делать корневой DOM-элемент фокусируемым с клавиатуры (`tabIndex=0`) и реагировать на клавиши Enter и Space так же, как на клик мышью.
4. THE Lottie_Icon_Component SHALL не использовать мерцания с частотой более 3 Гц во встроенных пресетах анимации.

### Requirement 7: Обработка ошибок загрузки и отказоустойчивость

**User Story:** Как пользователь UniTest, я хочу, чтобы интерфейс оставался работоспособным даже при сбое загрузки анимации, чтобы продолжать пользоваться приложением.

#### Acceptance Criteria

1. IF загрузка Lottie_Chunk завершается ошибкой, THEN THE Lottie_Icon_Component SHALL отрисовать Static_Fallback_Icon.
2. IF загрузка Asset_Chunk завершается ошибкой, THEN THE Lottie_Icon_Component SHALL отрисовать Static_Fallback_Icon для соответствующего экземпляра.
3. IF Asset_Chunk содержит данные, не соответствующие схеме Lottie/dotLottie, THEN THE Lottie_Icon_Component SHALL отрисовать Static_Fallback_Icon и записать ошибку в консоль только в режиме разработки Vite.
4. WHEN отрисовывается Static_Fallback_Icon из-за ошибки, THE Lottie_Icon_Component SHALL не повторять автоматически попытку загрузки Asset_Chunk в течение текущей сессии страницы.

### Requirement 8: Сосуществование с существующими анимированными компонентами

**User Story:** Как разработчик UniTest_Client, я хочу, чтобы новый компонент Lottie не сломал текущее поведение `AnimatedFlame`, `AnimatedIcon` и `AnimatedHero`, чтобы избежать регрессий в геймификации (streaks) и hero-баннерах.

#### Acceptance Criteria

1. THE UniTest_Client SHALL сохранять компоненты `AnimatedFlame`, `AnimatedIcon` и `AnimatedHero` в их текущем публичном API.
2. THE UniTest_Client SHALL не удалять зависимости `framer-motion` и `lucide-react` из `client/package.json`.
3. THE UniTest_Client SHALL продолжать использовать существующие ассеты `client/src/assets/flame/flame.gif` и `flame.webp` в качестве источника streak-иконки до явного решения о миграции, принятого на этапе Design.
4. WHERE компонент UniTest_Client уже использует `AnimatedFlame` или `AnimatedIcon`, THE UniTest_Client SHALL не заменять данные компоненты на Lottie_Icon_Component в рамках первичного внедрения.

### Requirement 9: Точки интеграции в пользовательском интерфейсе

**User Story:** Как пользователь UniTest, я хочу видеть анимированные иконки в местах, где они подчёркивают изменение состояния или результата, чтобы интерфейс ощущался живым и обратная связь была заметной.

#### Acceptance Criteria

1. WHEN пользователь получает новое уведомление и колокольчик в `Navbar` отображается, THE UniTest_Client SHALL воспроизводить Lottie-анимацию колокольчика один раз с триггером `"inView"`.
2. WHEN пользователь открывает разблокированную ачивку в `PublicAchievementsTab`, THE UniTest_Client SHALL воспроизводить Lottie-анимацию трофея один раз через триггер `"inView"`.
3. WHILE происходит асинхронная загрузка данных страницы и применяется индикатор загрузки, THE UniTest_Client SHALL отображать Lottie-анимацию загрузки с `loop=true`.
4. WHILE отображается «пустое состояние» (отсутствие тестов, групп, сообщений), THE UniTest_Client SHALL отображать одну Lottie-иллюстрацию с `loop=true` и подписью.
5. WHEN пользователь успешно отправляет результат теста, THE UniTest_Client SHALL воспроизводить Lottie-анимацию подтверждения один раз через триггер `"autoplay"`.
6. WHERE в reaction-меню чата отображаются эмодзи-реакции, THE UniTest_Client SHALL отображать соответствующие Lottie-эмодзи с триггером `"hover"`.
7. THE UniTest_Client SHALL ограничивать первичный набор интеграционных точек пятью, перечисленными в пунктах 1–6 настоящего требования.

### Requirement 10: Источник анимаций и лицензионная чистота

**User Story:** Как владелец продукта UniTest, я хочу, чтобы используемые Lottie-анимации имели понятный источник и совместимую с проектом лицензию, чтобы избежать юридических рисков при коммерческом использовании.

#### Acceptance Criteria

1. THE UniTest_Client SHALL хранить рядом с каждым файлом Lottie_Asset запись об источнике и лицензии в файле `client/src/assets/lottie/CREDITS.md`.
2. THE UniTest_Client SHALL принимать только те Lottie_Asset, лицензия которых разрешает коммерческое использование без обязательной атрибуции в UI или с атрибуцией, размещённой в `CREDITS.md`.
3. IF исходный Lottie_Asset требует обязательной атрибуции в UI, THEN THE UniTest_Client SHALL отклонить добавление такого ассета в Asset_Registry.

### Requirement 11: Производительность во время выполнения

**User Story:** Как пользователь UniTest на ноутбуке среднего класса, я хочу, чтобы анимации не приводили к ощутимому замедлению интерфейса, чтобы прокрутка и взаимодействие оставались плавными.

#### Acceptance Criteria

1. WHILE Lottie_Icon_Component не виден в области просмотра пользователя, THE Lottie_Icon_Component SHALL приостанавливать воспроизведение анимации.
2. WHEN Lottie_Icon_Component демонтируется, THE Lottie_Icon_Component SHALL освобождать ресурсы Lottie_Runtime, связанные с экземпляром, в течение того же цикла размонтирования React.
3. THE Lottie_Icon_Component SHALL ограничивать частоту обновления отрисовки значением, не превышающим частоту обновления экрана пользователя.
