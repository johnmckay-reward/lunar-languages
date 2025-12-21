# Lunar Languages 🌑🗣️

Lunar Languages is a modern, cross-platform mobile application designed to help users learn essential phrases and vocabulary in multiple languages. Built with the latest web technologies, it provides a seamless learning experience on iOS, Android, and the Web.

## 🚀 Features

- **Multi-Language Support**: Learn 11 different languages including Mandarin, Spanish, French, German, Japanese, and more.
- **Essential Vocabulary**: Curated lists of essential phrases ("Hello", "Thank you"), conversation starters, and common nouns.
- **Audio Pronunciation**: High-quality audio playback for every phrase to master pronunciation.
- **Phonetic Guides**: Native phonetic transcriptions to help you read and speak correctly.
- **Offline Ready**: Designed to work without an internet connection for on-the-go learning.
- **Smart UI**: Clean, intuitive interface built with Ionic components.

## 🛠️ Tech Stack

- **Framework**: [Ionic 8](https://ionicframework.com/)
- **Core**: [Angular 20](https://angular.io/)
- **Mobile Runtime**: [Capacitor 8](https://capacitorjs.com/)
- **Styling**: SCSS with Ionic CSS Utilities
- **Tooling**: Node.js scripts for AI content generation

## 🌍 Supported Languages

The app currently supports the following languages:

- 🇨🇳 Mandarin (zh)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇯🇵 Japanese (ja)
- 🇮🇹 Italian (it)
- 🇵🇹 Portuguese (pt)
- 🇺🇦 Ukrainian (uk)
- 🇷🇺 Russian (ru)
- 🇵🇱 Polish (pl)
- 🇬🇧 English (en) - *Base language*

## 🏁 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- NPM or Yarn
- Ionic CLI (`npm install -g @ionic/cli`)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/lunar-languages.git
    cd lunar-languages
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

**Web / Development Server:**
```bash
ionic serve
# or
ng serve
```

**Build for Production:**
```bash
ionic build --prod
```

**Mobile Deployment (iOS/Android):**
First, sync your web assets:
```bash
npx cap sync
```

Then open the native IDE:
```bash
npx cap open ios
# or
npx cap open android
```

## 🤖 AI Content Generation

This project includes a powerful script (`generate-audio.js`) to automate the creation of translation assets and audio files using OpenAI.

### Features of the Generator:
- **Translation & Transliteration**: Automatically translates English phrases and generates phonetic guides.
- **Text-to-Speech**: Uses OpenAI's TTS models (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`) with smart voice mapping for each language.
- **Quality Control**: Implements Levenshtein distance checks to verify that the generated audio matches the text.
- **Self-Repair**: Automatically retries and repairs failed generations.

### Usage:
Ensure you have a `.env` file with your OpenAI API key:
```env
OPENAI_API_KEY=sk-...
```

Run the generator:
```bash
node generate-audio.js
```

## 📂 Project Structure

```
lunar-languages/
├── src/
│   ├── app/
│   │   ├── home/          # Main application logic and UI
│   │   └── data-service.ts # Data handling and state management
│   ├── assets/
│   │   ├── audio/         # Generated audio files
│   │   └── i18n/          # JSON translation files
│   └── theme/             # Global styles and variables
├── generate-audio.js      # AI content generation script
├── capacitor.config.ts    # Capacitor configuration
└── ionic.config.json      # Ionic configuration
```

## 📄 License

[MIT](LICENSE)
