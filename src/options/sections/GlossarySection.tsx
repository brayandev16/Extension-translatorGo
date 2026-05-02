import React, { useState, useRef, KeyboardEvent } from 'react';
import type { ExtensionSettings } from '../../lib/storage';

interface Props {
    settings: ExtensionSettings;
    onChange: (patch: Partial<ExtensionSettings>) => void;
    onSave: () => void;
    saved: boolean;
}

export const GlossarySection: React.FC<Props> = ({ settings, onChange, onSave, saved }) => {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addTerm = () => {
        const term = input.trim();
        if (!term) return;
        if (settings.glossary.includes(term)) {
            setInput('');
            return;
        }
        onChange({ glossary: [...settings.glossary, term] });
        setInput('');
        inputRef.current?.focus();
    };

    const removeTerm = (term: string) => {
        onChange({ glossary: settings.glossary.filter((t) => t !== term) });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTerm();
        }
    };

    return (
        <section className="flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-1">Exclusion Glossary</h2>
                <p className="text-sm text-slate-400">
                    Terms that should <strong className="text-slate-300">never be translated</strong> — e.g. variable names, hooks, library identifiers.
                </p>
            </div>

            <div className="flex flex-col gap-4 max-w-md">
                {/* Input row */}
                <div className="flex items-stretch rounded-lg shadow-sm">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a term and press Enter…"
                        className="flex w-full min-w-0 flex-1 rounded-l-lg border border-slate-700 bg-background-dark text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-11 px-4 text-sm placeholder:text-slate-600 transition-colors font-mono"
                        spellCheck={false}
                    />
                    <button
                        onClick={addTerm}
                        className="flex items-center justify-center gap-1.5 px-5 bg-slate-800 border border-l-0 border-slate-700 rounded-r-lg text-slate-300 font-medium hover:bg-slate-700 hover:text-white transition-colors text-sm"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Add
                    </button>
                </div>

                {/* Chip list */}
                {settings.glossary.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {settings.glossary.map((term) => (
                            <span
                                key={term}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium font-mono bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors group"
                            >
                                {term}
                                <button
                                    onClick={() => removeTerm(term)}
                                    className="text-slate-500 hover:text-slate-100 focus:outline-none flex items-center justify-center transition-colors"
                                    title={`Remove "${term}"`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-600 px-1">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        No terms added yet. Glossary terms won't be translated by the AI.
                    </div>
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
                        Saved!
                    </span>
                )}
            </div>

            {/* Note */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 max-w-md text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">How it works:</strong> For AI providers (Gemini / OpenAI), these terms are listed in the system prompt so the model skips them. For Google Translate, they are replaced with placeholder tokens before translation and restored afterwards.
            </div>
        </section>
    );
};
