import type { TranslateRequest, TranslateResponse } from '../lib/messages';
import { getSettings, type ExtensionSettings } from '../lib/storage';

// ─── PDF Viewer URL ───────────────────────────────────────────────────────────

function getPdfViewerUrl() {
    return chrome.runtime.getURL('src/pdf-viewer/index.html');
}

// ─── Intercept PDF navigation via tabs.onUpdated ──────────────────────────────
// DNR can only redirect http/https and has URL-encoding limitations.
// Using tabs.onUpdated handles both http/https AND file:// PDFs reliably.

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const url = tab.url ?? changeInfo.url;
    if (!url) return;

    const viewerBase = getPdfViewerUrl();

    // Already in our viewer → inject content script when fully loaded
    if (url.startsWith(viewerBase)) {
        if (changeInfo.status !== 'complete') return;
        chrome.scripting
            .executeScript({
                target: { tabId },
                files: ['src/content/index.tsx'],
            })
            .catch(() => {
                // Script may already be injected; ignore.
            });
        return;
    }

    // Skip if the tab is loading (we only redirect on 'loading' phase to avoid loops)
    if (changeInfo.status !== 'loading') return;

    // Check if this looks like a PDF URL
    const isPdf = isPdfUrl(url);
    if (!isPdf) return;

    // Redirect to our custom viewer
    const viewerUrl = `${viewerBase}?url=${encodeURIComponent(url)}`;
    chrome.tabs.update(tabId, { url: viewerUrl }).catch(() => {});
});

function isPdfUrl(url: string): boolean {
    try {
        // Skip chrome://, chrome-extension://, about:, data:, etc.
        if (!url.startsWith('http') && !url.startsWith('file://')) return false;

        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();

        // Check pathname ends with .pdf
        if (pathname.endsWith('.pdf')) return true;

        // Also check query string for inline PDFs (e.g. ?file=document.pdf)
        // Only if Content-Type sniffing is unavailable — keep conservative here.
        return false;
    } catch {
        return false;
    }
}


// ─── System prompt template ───────────────────────────────────────────────────

function buildSystemPrompt(
    glossary: string[],
    sourceLang: string,
    targetLang: string
): string {
    const glossaryNote =
        glossary.length > 0
            ? `Do NOT translate these technical terms, leave them exactly as-is: ${glossary.join(', ')}.`
            : '';
    return (
        `You are a professional technical documentation translator. ` +
        `Your task is to translate text from ${sourceLang} to ${targetLang}. ` +
        `Translate accurately while preserving all code syntax, variable names, function names, and technical identifiers. ` +
        `${glossaryNote} ` +
        `Return ONLY the translated text — no explanations, no extra formatting, no quotes around the result.`
    ).trim();
}

// ─── Google Cloud Translation ─────────────────────────────────────────────────

async function translateWithGoogle(text: string, settings: ExtensionSettings): Promise<string> {
    if (!settings.googleApiKey) throw new Error('Missing Google Cloud API key.');

    const url = `https://translation.googleapis.com/language/translate/v2?key=${settings.googleApiKey}`;

    // Google Translate does not support glossary-based exclusions natively via
    // the free REST API, so we implement a simple glossary workaround:
    // replace glossary terms with unique placeholders, translate, then restore.
    const placeholders: Record<string, string> = {};
    let processedText = text;
    settings.glossary.forEach((term, i) => {
        const placeholder = `GLOSSARYTERM${i}`;
        placeholders[placeholder] = term;
        // Replace all occurrences (case-sensitive)
        processedText = processedText.split(term).join(placeholder);
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            q: processedText,
            source: settings.sourceLang,
            target: settings.targetLang,
            format: 'text',
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
            errData?.error?.message ?? `Google API error: ${response.status}`
        );
    }

    const data = await response.json();
    let translated: string =
        data?.data?.translations?.[0]?.translatedText ?? '';

    // Restore glossary placeholders
    Object.entries(placeholders).forEach(([placeholder, original]) => {
        translated = translated.split(placeholder).join(original);
    });

    return translated;
}

// ─── Google Gemini ────────────────────────────────────────────────────────────

async function translateWithGemini(text: string, settings: ExtensionSettings): Promise<string> {
    if (!settings.geminiApiKey) throw new Error('Missing Gemini API key.');

    const systemPrompt = buildSystemPrompt(
        settings.glossary,
        settings.sourceLang,
        settings.targetLang
    );

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: text }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
            },
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
            errData?.error?.message ?? `Gemini API error: ${response.status}`
        );
    }

    const data = await response.json();
    return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    );
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function translateWithOpenAI(text: string, settings: ExtensionSettings): Promise<string> {
    if (!settings.openaiApiKey) throw new Error('Missing OpenAI API key.');

    const systemPrompt = buildSystemPrompt(
        settings.glossary,
        settings.sourceLang,
        settings.targetLang
    );

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.openaiApiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.1,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
            ],
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
            errData?.error?.message ?? `OpenAI API error: ${response.status}`
        );
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? '';
}

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
    (
        message: TranslateRequest,
        _sender,
        sendResponse: (r: TranslateResponse) => void
    ) => {
        if (message.type !== 'TRANSLATE') return false;

        (async () => {
            try {
                const settings = await getSettings();
                let translation: string;

                if (settings.engine === 'google') {
                    translation = await translateWithGoogle(message.text, settings);
                } else if (settings.aiProvider === 'gemini') {
                    translation = await translateWithGemini(message.text, settings);
                } else {
                    translation = await translateWithOpenAI(message.text, settings);
                }

                sendResponse({ success: true, translation });
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                sendResponse({ success: false, error: msg });
            }
        })();

        // Return true to signal we'll respond asynchronously.
        return true;
    }
);
