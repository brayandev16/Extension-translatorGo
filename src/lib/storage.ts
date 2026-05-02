// ─── Types ────────────────────────────────────────────────────────────────────

export type AiProvider = 'gemini' | 'openai';
export type Engine = 'google' | 'ai';

export interface ExtensionSettings {
    /** Whether the extension is active (tooltip + page translate). */
    enabled: boolean;
    /** Primary translation engine. */
    engine: Engine;
    /** Which AI provider to use when engine === 'ai'. */
    aiProvider: AiProvider;
    /** Google Cloud Translation API key. */
    googleApiKey: string;
    /** Google Gemini API key. */
    geminiApiKey: string;
    /** OpenAI API key. */
    openaiApiKey: string;
    /** Words/phrases that must NOT be translated. */
    glossary: string[];
    /** BCP-47 source language code, e.g. "en". */
    sourceLang: string;
    /** BCP-47 target language code, e.g. "es". */
    targetLang: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

/**
 * Detect a reasonable default target language from the browser locale.
 * Falls back to 'es' (Spanish) if the browser isn't already set to a
 * non-English language.
 */
function detectDefaultTargetLang(): string {
    const lang = navigator.language?.split('-')[0] ?? 'es';
    // If the browser UI is English, default target to Spanish.
    return lang === 'en' ? 'es' : lang;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
    enabled: true,
    engine: 'ai',
    aiProvider: 'gemini',
    googleApiKey: '',
    geminiApiKey: '',
    openaiApiKey: '',
    glossary: [],
    sourceLang: 'en',
    targetLang: detectDefaultTargetLang(),
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

/** Always use chrome.storage.sync (secure, encrypted, synced via Google account). */
const store = chrome.storage.sync;

/**
 * Read all settings from storage, merging with defaults for any missing keys.
 */
export async function getSettings(): Promise<ExtensionSettings> {
    return new Promise((resolve) => {
        store.get(DEFAULT_SETTINGS, (result) => {
            resolve(result as ExtensionSettings);
        });
    });
}

/**
 * Persist a partial settings object — only the provided keys are overwritten.
 */
export async function saveSettings(
    partial: Partial<ExtensionSettings>
): Promise<void> {
    return new Promise((resolve, reject) => {
        store.set(partial, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}
