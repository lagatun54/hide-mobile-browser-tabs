# iOS: WKWebView + element fullscreen

Нативная оболочка подгружает собранный сайт из папки **`FullscreenShell/www`** внутри бандла приложения.

## Что нужно установить

- **Node.js** (для Vite).
- **Xcode** из App Store (не только *Command Line Tools* — для `xcodebuild` и симулятора активной должна быть полная Xcode:  
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`).

## Сборка «веб → www → приложение»

Все команды из **корня репозитория** (`hide-mobile-browser-tabs/`).

1. Зависимости (один раз или после смены `package.json`):

   ```bash
   npm ci
   ```

2. Собрать фронт и скопировать **`dist/`** в **`ios/FullscreenShell/FullscreenShell/www/`** одной командой:

   ```bash
   npm run ios:www
   ```

   Это то же самое, что `npm run build` и затем `./ios/sync-www.sh`.

3. Открыть проект в Xcode:

   ```bash
   open ios/FullscreenShell/FullscreenShell.xcodeproj
   ```

4. В Xcode: **Signing & Capabilities** → выберите **Team** (свой Apple ID / команда), иначе сборка на устройство не подпишется.

5. Запуск: **⌘R** (симулятор или iPhone). Сборка без запуска: **⌘B**.

Папка **`www`** в git по умолчанию пустая (в репозитории только `.gitkeep`); перед каждой сборкой IPA в Xcode снова выполняйте **`npm run ios:www`**, иначе в приложении останется старая или пустая веб-часть.

## Сборка из терминала (без кнопки Run)

После `npm run ios:www`, из каталога с `.xcodeproj`:

```bash
cd ios/FullscreenShell
xcodebuild -scheme FullscreenShell -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' -configuration Debug build
```

Имя симулятора (`iPhone 16`) подставьте своё: `xcrun simctl list devices available`.

## Только веб (без iOS)

Для деплоя на GitHub Pages и локальной проверки:

```bash
npm run build
```

Артефакты в **`dist/`** (в CI это делает workflow **Build**).

---

**Поведение в коде:** `defaultWebpagePreferences.isElementFullscreenEnabled = true` + флаг `window.__WK_SHELL_ELEMENT_FULLSCREEN__` через `WKUserScript`; запрос полноэкранного режима на элемент — из **`main.js`**. KVO на `WKWebView.fullscreenState` пишет переходы в консоль Xcode.
