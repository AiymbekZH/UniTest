# UniTest Mobile App (Flutter)

Нативное мобильное приложение для UniTest на Flutter. Поддерживает iOS и Android из одного codebase. Backend (Express + MongoDB) общий с web-версией на `unitest.page`.

## Стек

- **Flutter 3.19+** / Dart 3.3+
- **State**: `flutter_riverpod`
- **HTTP**: `dio` (с auth interceptor для JWT)
- **Routing**: `go_router`
- **Real-time**: `socket_io_client` (полная совместимость с серверным `socket.io`)
- **Storage**: `flutter_secure_storage` (JWT) + `shared_preferences` (settings)
- **Push** (Phase 3): `firebase_messaging`
- **Images**: `cached_network_image` + `image_picker`
- **Rich-text** (Phase 2 viewer / Phase 5 editor): `flutter_widget_from_html` + `flutter_quill`

## Первая установка (один раз)

### 1. Установить Flutter SDK

**Windows:**

```pwsh
# Скачай Flutter SDK с https://docs.flutter.dev/get-started/install/windows
# Распакуй в C:\src\flutter
# Добавь C:\src\flutter\bin в PATH через системные переменные

flutter --version
flutter doctor
```

`flutter doctor` подскажет что докрутить (Android Studio, Android SDK, лицензии).

### 2. Установить Android Studio

С https://developer.android.com/studio. После установки запусти и установи через SDK Manager:

- Android SDK Platform (API 34+)
- Android SDK Command-line Tools
- Android SDK Build-Tools
- Android Emulator

Затем:

```pwsh
flutter doctor --android-licenses
```

### 3. Для iOS (только на Mac)

iOS-сборку **невозможно** делать на Windows. Варианты:

- **Mac физический** — Xcode из App Store + `xcode-select --install` + `sudo gem install cocoapods`.
- **Codemagic** ($28/мес) — облачная сборка iOS из этого репозитория.
- **MacInCloud** ($30/мес) — аренда Mac.

На Windows можно полноценно разрабатывать и собирать **Android-версию**, iOS-сборку оставить на потом.

### 4. Создать native-папки

В этой папке (`Unitest_app/`) есть только Dart-код и конфиг. Нужно сгенерировать `android/`, `ios/`:

```pwsh
cd Unitest_app
flutter create . --project-name unitest_app --platforms=android,ios --org com.unitest.app
flutter pub get
```

`flutter create .` в существующей папке **НЕ перезапишет** наши `lib/` и `pubspec.yaml` — добавит только missing native-папки.

### 5. Запуск

```pwsh
# Подключи Android-устройство по USB или запусти эмулятор из Android Studio
flutter devices

# Запуск в debug-режиме (hot reload)
flutter run

# Release-сборка APK
flutter build apk --release

# Release-сборка App Bundle (для Play Store)
flutter build appbundle --release
```

## Конфигурация API

API base URL читается из `lib/core/api/api_endpoints.dart`. Для локальной разработки против локального backend измени `_baseUrl` в этом файле или используй `--dart-define`:

```pwsh
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
```

(Android emulator видит хост-машину как `10.0.2.2`, а не `localhost`.)

По умолчанию приложение бьёт в production: `https://unitest.page/api`.

## Структура проекта

```
lib/
├── main.dart             # bootstrap: ProviderScope + runApp
├── app.dart              # MaterialApp.router + theme
├── core/
│   ├── api/              # dio_client, api_endpoints
│   ├── auth/             # token_storage, auth_repository, auth_state
│   ├── socket/           # arena/notifications socket clients
│   ├── theme/            # app_colors, app_typography, app_theme
│   ├── router/           # go_router config
│   ├── widgets/          # ChunkyButton, ChunkyCard, Avatar, ...
│   └── utils/
├── features/
│   ├── auth/             # login, register, forgot, reset
│   ├── dashboard/        # feed
│   ├── tests/            # browse, take, profile
│   ├── results/          # result page, my results
│   ├── leaderboard/
│   ├── profile/          # own + other user profiles
│   ├── creator/          # CreateTest + QuestionBank (Phase 5)
│   ├── arena/            # hub, code, host, gameplay (Phase 4)
│   ├── groups/           # list, detail, chat (Phase 3)
│   ├── messages/         # DM (Phase 3)
│   ├── notifications/    # (Phase 3)
│   └── admin/            # WebView wrapper (Phase 6)
└── l10n/                 # ARB files: ru, kk, en
```

## Дизайн-система

Сохраняем визуальный язык web-версии:

- Палитра: orange-500 primary, warm-dark `#0f0d0a`/`#181410`/`#1f1a14`, кремовый `#FFF8EE`.
- **Chunky кнопки** — реализованы через `ChunkyButton` с `BoxShadow(offset: Offset(0,6))` и `translateY(6)` на нажатие.
- Bottom nav (5 табов): Главная / Тесты / Арена / Сообщения / Профиль.
- Pull-to-refresh, skeleton loaders, modal sheets — стандарты mobile UX.

См. `lib/core/theme/` и `lib/core/widgets/`.

## Текущий прогресс

- [x] **Phase 0** — Setup (skeleton, theme, базовые виджеты, dio client, auth state)
- [ ] **Phase 1** — Auth + Profile
- [ ] **Phase 2** — Browse + Take Test + Result
- [ ] **Phase 3** — Social (comments, groups, DM, push)
- [ ] **Phase 4** — Real-time Arena
- [ ] **Phase 5** — Creator (CreateTest, QuestionBank)
- [ ] **Phase 6** — Admin (WebView wrapper)
- [ ] **Phase 7** — Polish + Release

См. подробный план: `C:\Users\aiymb\.windsurf\plans\unitest-flutter-app-3c5dd1.md`

## Полезные команды

```pwsh
# Анализ кода (lints)
flutter analyze

# Форматирование
dart format lib/

# Тесты
flutter test

# Очистить build кеш
flutter clean

# Обновить зависимости
flutter pub upgrade
```
