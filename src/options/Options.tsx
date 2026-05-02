import React, { useEffect, useState, useCallback } from 'react';
import { getSettings, saveSettings, type ExtensionSettings } from '../lib/storage';
import { GeneralSection } from './sections/GeneralSection';
import { ApiKeysSection } from './sections/ApiKeysSection';
import { GlossarySection } from './sections/GlossarySection';

type NavSection = 'general' | 'apikeys' | 'glossary';

const NAV_ITEMS: { id: NavSection; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'apikeys', label: 'API Keys', icon: 'key' },
    { id: 'glossary', label: 'Glossary', icon: 'menu_book' },
];

export const Options: React.FC = () => {
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);
    const [activeSection, setActiveSection] = useState<NavSection>('apikeys');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getSettings().then(setSettings);
    }, []);

    const handleChange = useCallback((patch: Partial<ExtensionSettings>) => {
        setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
        setSaved(false);
    }, []);

    const handleSave = useCallback(async () => {
        if (!settings) return;
        await saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }, [settings]);

    if (!settings) {
        return (
            <div className="min-h-screen bg-background-dark flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="#1e293b" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#2b6cee" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 font-display">
            {/* Top bar */}
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-slate-800 bg-background-dark/90 backdrop-blur px-8 py-3.5">
                <span className="material-symbols-outlined text-primary text-2xl">translate</span>
                <h1 className="text-lg font-bold tracking-tight text-white">DocTranslate</h1>
                <span className="text-slate-600 text-sm ml-0.5">· Options</span>
            </header>

            <div className="flex gap-0 max-w-5xl mx-auto min-h-[calc(100vh-57px)]">
                {/* Sidebar */}
                <aside className="w-56 flex-shrink-0 flex flex-col gap-2 px-5 py-8 border-r border-slate-800">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
                            <span className="material-symbols-outlined text-primary text-[20px]">translate</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-100">DocTranslate</p>
                            <p className="text-xs text-slate-500">Browser Extension</p>
                        </div>
                    </div>

                    {/* Nav */}
                    {NAV_ITEMS.map(({ id, label, icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveSection(id)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeSection === id
                                    ? 'bg-primary/15 text-primary border border-primary/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${activeSection === id ? 'text-primary' : 'text-slate-500'}`}>
                                {icon}
                            </span>
                            {label}
                        </button>
                    ))}

                    {/* Version */}
                    <div className="mt-auto pt-6 px-2">
                        <p className="text-xs text-slate-600">v1.0.0 · BYOK Model</p>
                    </div>
                </aside>

                {/* Content area */}
                <main className="flex-1 px-10 py-10">
                    {activeSection === 'general' && (
                        <GeneralSection
                            settings={settings}
                            onChange={handleChange}
                            onSave={handleSave}
                            saved={saved}
                        />
                    )}
                    {activeSection === 'apikeys' && (
                        <ApiKeysSection
                            settings={settings}
                            onChange={handleChange}
                            onSave={handleSave}
                            saved={saved}
                        />
                    )}
                    {activeSection === 'glossary' && (
                        <GlossarySection
                            settings={settings}
                            onChange={handleChange}
                            onSave={handleSave}
                            saved={saved}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};
