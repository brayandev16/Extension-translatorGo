import React, { useEffect, useRef } from 'react';

export type TooltipState =
    | { status: 'loading' }
    | { status: 'success'; translation: string; original: string }
    | { status: 'error'; error: string };

interface TooltipProps {
    state: TooltipState;
    position: { top: number; left: number };
    sourceLang: string;
    targetLang: string;
    onClose: () => void;
}

const LANG_NAMES: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    pt: 'Portuguese', it: 'Italian', ja: 'Japanese', zh: 'Chinese',
    ko: 'Korean', ru: 'Russian', ar: 'Arabic', nl: 'Dutch',
    pl: 'Polish', sv: 'Swedish', tr: 'Turkish', hi: 'Hindi',
};

function getLangName(code: string) {
    return LANG_NAMES[code.split('-')[0]] ?? code.toUpperCase();
}

export const Tooltip: React.FC<TooltipProps> = ({
    state,
    position,
    sourceLang,
    targetLang,
    onClose,
}) => {
    const ref = useRef<HTMLDivElement>(null);

    // Close on click-outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler, true);
        return () => document.removeEventListener('mousedown', handler, true);
    }, [onClose]);

    const copyToClipboard = async () => {
        if (state.status === 'success') {
            await navigator.clipboard.writeText(state.translation);
        }
    };

    return (
        <div
            ref={ref}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 2147483647,
                width: '360px',
                maxWidth: 'calc(100vw - 24px)',
                fontFamily: 'Inter, system-ui, sans-serif',
            }}
        >
            {/* Caret */}
            <div
                style={{
                    position: 'absolute',
                    top: '-7px',
                    left: '24px',
                    width: '14px',
                    height: '14px',
                    background: 'rgb(30 41 59 / 0.97)',
                    border: '1px solid rgb(51 65 85 / 0.6)',
                    borderRight: 'none',
                    borderBottom: 'none',
                    transform: 'rotate(45deg)',
                    borderRadius: '2px',
                }}
            />

            {/* Card */}
            <div
                style={{
                    background: 'rgb(30 41 59 / 0.97)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgb(51 65 85 / 0.6)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '12px 14px 10px',
                        borderBottom: '1px solid rgb(51 65 85 / 0.5)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                            className="material-symbols-outlined"
                            style={{ color: '#2b6cee', fontSize: '16px' }}
                        >
                            translate
                        </span>
                        <span
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#2b6cee',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {getLangName(sourceLang)} → {getLangName(targetLang)}
                        </span>
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            style={{
                                marginLeft: 'auto',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px',
                                borderRadius: '4px',
                            }}
                            title="Close"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                close
                            </span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '12px 14px' }}>
                    {state.status === 'loading' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
                            <svg
                                style={{ animation: 'doc-translator-spin 1s linear infinite', width: '18px', height: '18px' }}
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle cx="12" cy="12" r="10" stroke="#334155" strokeWidth="3" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="#2b6cee" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            <span style={{ fontSize: '14px' }}>Translating…</span>
                        </div>
                    )}

                    {state.status === 'error' && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '18px', flexShrink: 0 }}>
                                error
                            </span>
                            <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                                {state.error}
                            </p>
                        </div>
                    )}

                    {state.status === 'success' && (
                        <p
                            style={{
                                color: '#f1f5f9',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                margin: 0,
                            }}
                        >
                            {state.translation}
                        </p>
                    )}
                </div>

                {/* Footer (only when success) */}
                {state.status === 'success' && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 14px',
                            background: 'rgb(15 23 42 / 0.5)',
                            borderTop: '1px solid rgb(51 65 85 / 0.4)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '11px',
                                color: '#64748b',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '220px',
                            }}
                            title={`Original: ${state.original}`}
                        >
                            <span style={{ color: '#475569' }}>Orig:</span> {state.original}
                        </div>
                        <button
                            onClick={copyToClipboard}
                            title="Copy translation"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                transition: 'color 0.15s, background 0.15s',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9';
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgb(51 65 85 / 0.5)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                                (e.currentTarget as HTMLButtonElement).style.background = 'none';
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                content_copy
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Inline keyframes for the spinner */}
            <style>{`
        @keyframes doc-translator-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};
