# Doc Translator

Doc Translator is a Chrome extension that allows you to translate technical documentation in-place using Google Cloud Translation, Google Gemini, or OpenAI. It follows a BYOK (Bring Your Own Key) model, meaning you control your own API credentials.

## Features

- **In-Place Translation**: Select any text on a webpage to see a translated tooltip instantly.
- **Full Page Translation**: Translate entire technical articles or documentation pages with a single click.
- **PDF Support**: Intercepts local and remote PDF files to provide translation capabilities within a custom PDF viewer.
- **Glossary Support**: Define specific technical terms that should *not* be translated (e.g., variable names, specific library names) to maintain technical accuracy.
- **Multiple Engines**: Choose between traditional translation (Google Translate API) or AI-powered contextual translation (Gemini 2.0 Flash or OpenAI GPT-4o-mini).
- **Secure Architecture**: API keys are securely stored in `chrome.storage.sync` and are only ever accessed within the isolated Background Script, preventing leakage to webpages or content scripts.

## Architecture & Tech Stack

- **Framework**: [React 18](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/) with [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin) for seamless Chrome Extension development and HMR.
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/doc-translator.git
   cd doc-translator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer mode** in the top right.
   - Click **Load unpacked**.
   - Select the `dist` folder located in your project directory.

Vite and CRXJS will automatically reload the extension when you make changes to the code.

### Production Build

To build the extension for production (e.g., to publish to the Chrome Web Store):

```bash
npm run build
```

This will run the TypeScript compiler and bundle the optimized files into the `dist` folder.

## Configuration (BYOK)

After loading the extension, click on the Doc Translator icon in your toolbar and open the **Settings** (gear icon). You will need to provide at least one API key to use the extension:

1. **Google Cloud Translation**: Requires an API key with access to the Cloud Translation API.
2. **Google Gemini**: Requires an API key from Google AI Studio.
3. **OpenAI**: Requires an API key from OpenAI.

You can also configure your source/target languages and add terms to your glossary from the settings page.

## Security Considerations

This extension is designed with security in mind. API keys are handled strictly within the background service worker. They are never injected into the DOM or passed through message payloads to the content scripts. This prevents malicious scripts on websites from accessing your keys.

## License

MIT License. Feel free to fork and modify for your own needs.
