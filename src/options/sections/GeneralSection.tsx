import React, { useState } from 'react';
import type { ExtensionSettings } from '../../lib/storage';

// ─── Language list ────────────────────────────────────────────────────────────
const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'ko', name: 'Korean' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'hi', name: 'Hindi' },
];

interface Props {
    settings: ExtensionSettings;
    onChange: (patch: Partial<ExtensionSettings>) => void;
    onSave: () => void;
    saved: boolean;
}

const selectClass =
    'w-full rounded-lg border border-slate-700 bg-background-dark text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none cursor-pointer';

export const GeneralSection: React.FC<Props> = ({ settings, onChange, onSave, saved }) => {
    return (
        <section className="flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-1">General Settings</h2>
                <p className="text-sm text-slate-400">Configure how the extension behaves.</p>
            </div>

            {/* Language pair */}
            <div className="flex flex-col gap-5 max-w-md">
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">language</span>
                    Translation Languages
                </h3>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-300">Source Language</span>
                    <div className="relative">
                        <select
                            value={settings.sourceLang}
                            onChange={(e) => onChange({ sourceLang: e.target.value })}
                            className={selectClass}
                        >
                            {LANGUAGES.map((l) => (
                                <option key={l.code} value={l.code}>{l.name}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[18px]">
                            expand_more
                        </span>
                    </div>
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-300">Target Language</span>
                    <div className="relative">
                        <select
                            value={settings.targetLang}
                            onChange={(e) => onChange({ targetLang: e.target.value })}
                            className={selectClass}
                        >
                            {LANGUAGES.map((l) => (
                                <option key={l.code} value={l.code}>{l.name}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[18px]">
                            expand_more
                        </span>
                    </div>
                </label>

                {/* Preview badge */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 self-start">
                    <span className="material-symbols-outlined text-primary text-[16px]">swap_horiz</span>
                    <span className="text-sm text-primary font-medium">
                        {LANGUAGES.find((l) => l.code === settings.sourceLang)?.name ?? settings.sourceLang}
                        {' → '}
                        {LANGUAGES.find((l) => l.code === settings.targetLang)?.name ?? settings.targetLang}
                    </span>
                </div>
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
                        Saved!
                    </span>
                )}
            </div>
        </section>
    );
};
