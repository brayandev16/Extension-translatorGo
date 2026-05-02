import React, { useEffect, useState, useCallback } from 'react';
import { getSettings, saveSettings, type ExtensionSettings, type Engine, type AiProvider } from '../lib/storage';
import type { TranslatePageRequest, RestorePageRequest } from '../lib/messages';

type PageStatus = 'idle' | 'translating' | 'done' | 'error';

function looksLikePdf(url: string | undefined): boolean {
    if (!url) return false;
    try {
        if (!url.startsWith('http') && !url.startsWith('file://')) return false;
        return new URL(url).pathname.toLowerCase().endsWith('.pdf');
    } catch {
        return false;
    }
}

export const Popup: React.FC = () => {
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);
    const [pageStatus, setPageStatus] = useState<PageStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [apiStatus, setApiStatus] = useState<'connected' | 'missing'>('missing');
    const [currentTabUrl, setCurrentTabUrl] = useState<string | undefined>(undefined);

    // Load settings on mount + grab current tab URL
    useEffect(() => {
        getSettings().then((s) => {
            setSettings(s);
            updateApiStatus(s);
        });
        chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            setCurrentTabUrl(tab?.url);
        });
    }, []);

    // Listen for progress updates from content script
    useEffect(() => {
        const handler = (message: { type: string; status?: PageStatus; progress?: number }) => {
            if (message.type === 'PAGE_TRANSLATE_STATUS') {
                setPageStatus(message.status ?? 'idle');
                setProgress(message.progress ?? 0);
            }
        };
        chrome.runtime.onMessage.addListener(handler);
        return () => chrome.runtime.onMessage.removeListener(handler);
    }, []);

    function updateApiStatus(s: ExtensionSettings) {
        const hasKey =
            (s.engine === 'google' && !!s.googleApiKey) ||
            (s.engine === 'ai' && s.aiProvider === 'gemini' && !!s.geminiApiKey) ||
            (s.engine === 'ai' && s.aiProvider === 'openai' && !!s.openaiApiKey);
        setApiStatus(hasKey ? 'connected' : 'missing');
    }

    const update = useCallback(async (patch: Partial<ExtensionSettings>) => {
        if (!settings) return;
        const updated = { ...settings, ...patch };
        setSettings(updated);
        updateApiStatus(updated);
        await saveSettings(patch);
    }, [settings]);

    const handleTranslatePage = async () => {
        if (!settings) return;
        setPageStatus('translating');
        setProgress(0);

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        const req: TranslatePageRequest = {
            type: 'TRANSLATE_PAGE',
        };

        chrome.tabs.sendMessage(tab.id, req);
    };

    const handleRestorePage = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        const req: RestorePageRequest = { type: 'RESTORE_PAGE' };
        chrome.tabs.sendMessage(tab.id, req);
        setPageStatus('idle');
        setProgress(0);
    };

    const openOptions = () => chrome.runtime.openOptionsPage();

    const handleOpenInPdfViewer = async () => {
        if (!currentTabUrl) return;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        const viewerUrl = chrome.runtime.getURL('src/pdf-viewer/index.html') +
            '?url=' + encodeURIComponent(currentTabUrl);
        chrome.tabs.update(tab.id, { url: viewerUrl });
        window.close();
    };

    if (!settings) {
        return (
            <div className="w-[340px] bg-surface-dark flex items-center justify-center p-8">
                <svg className="animate-spin w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="#1e293b" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#2b6cee" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
        );
    }

    const engineLabel = settings.engine === 'google'
        ? 'Google Translate'
        : settings.aiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI';

    return (
        <div className="w-[340px] bg-surface-dark text-slate-100 font-display flex flex-col overflow-hidden rounded-xl border border-border-dark shadow-2xl">
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-border-dark px-5 py-3.5 bg-surface-darker">
                <span className="material-symbols-outlined text-primary text-2xl">translate</span>
                <h1 className="text-base font-bold tracking-tight text-white flex-1">Doc Translator</h1>
                <button
                    onClick={openOptions}
                    className="text-text-muted hover:text-slate-300 transition-colors"
                    title="Settings"
                >
                    <span className="material-symbols-outlined text-xl">settings</span>
                </button>
            </header>

            <div className="p-4 flex flex-col gap-4">
                {/* Enable toggle */}
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border-dark bg-surface-darker p-4">
                    <div>
                        <p className="text-sm font-semibold text-white">Enable Extension</p>
                        <p className="text-xs text-text-muted mt-0.5">Toggle translation on/off</p>
                    </div>
                    <label className="relative flex h-7 w-12 cursor-pointer items-center rounded-full p-0.5 transition-colors"
                        style={{ background: settings.enabled ? '#2b6cee' : '#1e293b', border: '1px solid #334155' }}>
                        <div
                            className="h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-200"
                            style={{ transform: settings.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={settings.enabled}
                            onChange={(e) => update({ enabled: e.target.checked })}
                        />
                    </label>
                </div>

                {/* Engine selector */}
                <div className="flex flex-col gap-2">
                    <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Engine</h2>
                    <div className="flex h-10 w-full rounded-xl bg-surface-darker p-0.5 border border-border-dark">
                        {(['google', 'ai'] as Engine[]).map((eng) => (
                            <button
                                key={eng}
                                onClick={() => update({ engine: eng })}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all ${settings.engine === eng
                                        ? 'bg-background-dark text-primary shadow-sm border border-border-dark'
                                        : 'text-text-muted hover:text-slate-300'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {eng === 'google' ? 'g_translate' : 'auto_awesome'}
                                </span>
                                {eng === 'google' ? 'Google' : 'AI'}
                            </button>
                        ))}
                    </div>

                    {/* AI provider sub-selector */}
                    {settings.engine === 'ai' && (
                        <div className="flex h-9 w-full rounded-lg bg-surface-darker p-0.5 border border-border-dark">
                            {(['gemini', 'openai'] as AiProvider[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => update({ aiProvider: p })}
                                    className={`flex flex-1 items-center justify-center rounded-md text-xs font-medium transition-all ${settings.aiProvider === p
                                            ? 'bg-primary/20 text-primary'
                                            : 'text-text-muted hover:text-slate-300'
                                        }`}
                                >
                                    {p === 'gemini' ? '✦ Gemini' : '⬡ OpenAI'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Open in PDF Viewer — shown when the current tab is a PDF */}
                {looksLikePdf(currentTabUrl) && (
                    <button
                        onClick={handleOpenInPdfViewer}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border-dark bg-surface-darker hover:bg-surface-dark text-slate-300 hover:text-white font-semibold text-sm transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        Open in PDF Viewer
                    </button>
                )}

                {/* Translate / Restore page */}
                <div className="flex flex-col gap-2">
                    {pageStatus === 'idle' || pageStatus === 'error' ? (
                        <button
                            onClick={handleTranslatePage}
                            disabled={!settings.enabled || apiStatus === 'missing'}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-md"
                        >
                            <span className="material-symbols-outlined text-[18px]">language</span>
                            Translate Page
                        </button>
                    ) : pageStatus === 'done' ? (
                        <button
                            onClick={handleRestorePage}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">undo</span>
                            Restore Original
                        </button>
                    ) : (
                        /* translating */
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs text-text-muted mb-0.5">
                                <span>Translating page…</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-darker rounded-full overflow-hidden border border-border-dark">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer status */}
            <div className="border-t border-border-dark bg-surface-darker px-5 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${apiStatus === 'connected'
                                ? 'bg-background-dark border-border-dark text-primary'
                                : 'bg-background-dark border-border-dark text-amber-400'
                            }`}>
                            <span className="material-symbols-outlined text-[16px]">
                                {apiStatus === 'connected' ? 'check_circle' : 'warning'}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-white">
                            {apiStatus === 'connected'
                                ? `Connected to ${engineLabel}`
                                : 'Missing API Key'}
                        </p>
                    </div>
                    {/* Pulsing dot */}
                    <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                        <span className={`absolute inline-flex h-full w-full rounded-full opacity-30 ${apiStatus === 'connected' ? 'bg-primary animate-ping' : 'bg-amber-400'
                            }`} />
                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${apiStatus === 'connected' ? 'bg-primary' : 'bg-amber-400'
                            }`} />
                    </div>
                </div>
            </div>
        </div>
    );
};
