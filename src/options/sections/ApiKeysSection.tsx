import React, { useState } from 'react';
import type { ExtensionSettings, AiProvider } from '../../lib/storage';

interface Props {
    settings: ExtensionSettings;
    onChange: (patch: Partial<ExtensionSettings>) => void;
    onSave: () => void;
    saved: boolean;
}

interface KeyFieldProps {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
}

const KeyField: React.FC<KeyFieldProps> = ({ label, value, placeholder, onChange }) => {
    const [show, setShow] = useState(false);

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-300">{label}</span>
            <div className="flex w-full items-stretch rounded-lg shadow-sm">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    placeholder={placeholder ?? '••••••••••••••••••••••••'}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex w-full min-w-0 flex-1 rounded-l-lg border border-slate-700 bg-background-dark text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-11 px-4 text-sm placeholder:text-slate-600 transition-colors font-mono"
                    autoComplete="off"
                    spellCheck={false}
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="flex items-center justify-center px-3.5 border border-l-0 border-slate-700 bg-background-dark rounded-r-lg text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                    title={show ? 'Hide key' : 'Show key'}
                >
                    <span className="material-symbols-outlined text-[20px]">
                        {show ? 'visibility_off' : 'visibility'}
                    </span>
                </button>
            </div>
        </label>
    );
};

export const ApiKeysSection: React.FC<Props> = ({ settings, onChange, onSave, saved }) => {
    return (
        <section className="flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-1">API Configuration</h2>
                <p className="text-sm text-slate-400">
                    Configure your API keys for translation services. Keys are stored securely in your browser.
                </p>
            </div>

            {/* Google Cloud */}
            <div className="flex flex-col gap-4 max-w-md">
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">g_translate</span>
                    Google Cloud Translation
                </h3>
                <KeyField
                    label="Google Cloud API Key"
                    value={settings.googleApiKey}
                    onChange={(v) => onChange({ googleApiKey: v })}
                />
                <p className="text-xs text-slate-500">
                    Create a key at{' '}
                    <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                    >
                        Google Cloud Console
                    </a>
                    {' '}with Cloud Translation API enabled.
                </p>
            </div>

            {/* AI divider */}
            <div className="border-t border-slate-800 pt-6 flex flex-col gap-4 max-w-md">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px] text-primary">auto_awesome</span>
                        AI Provider
                    </h3>
                    {/* Provider toggle */}
                    <div className="flex h-8 rounded-lg bg-surface-darker p-0.5 border border-border-dark">
                        {(['gemini', 'openai'] as AiProvider[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => onChange({ aiProvider: p })}
                                className={`px-3 rounded-md text-xs font-medium transition-all ${settings.aiProvider === p
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-text-muted hover:text-slate-300'
                                    }`}
                            >
                                {p === 'gemini' ? 'Gemini' : 'OpenAI'}
                            </button>
                        ))}
                    </div>
                </div>

                {settings.aiProvider === 'gemini' ? (
                    <>
                        <KeyField
                            label="Google Gemini API Key"
                            value={settings.geminiApiKey}
                            placeholder="AIza••••••••••••••••••••••••"
                            onChange={(v) => onChange({ geminiApiKey: v })}
                        />
                        <p className="text-xs text-slate-500">
                            Get your key at{' '}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                            >
                                Google AI Studio
                            </a>
                            . Uses <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">gemini-2.0-flash</code>.
                        </p>
                    </>
                ) : (
                    <>
                        <KeyField
                            label="OpenAI API Key"
                            value={settings.openaiApiKey}
                            placeholder="sk-••••••••••••••••••••••••"
                            onChange={(v) => onChange({ openaiApiKey: v })}
                        />
                        <p className="text-xs text-slate-500">
                            Get your key at{' '}
                            <a
                                href="https://platform.openai.com/api-keys"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                            >
                                OpenAI Platform
                            </a>
                            . Uses <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">gpt-4o-mini</code>.
                        </p>
                    </>
                )}
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onSave}
                    className="bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-6 rounded-lg shadow-sm transition-colors text-sm"
                >
                    Save Changes
                </button>
                {saved && (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Saved securely!
                    </span>
                )}
            </div>
        </section>
    );
};
