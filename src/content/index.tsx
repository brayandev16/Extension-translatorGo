import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { getSettings } from '../lib/storage';
import type { TranslateRequest, TranslatePageRequest, RestorePageRequest, PageTranslateStatusRequest } from '../lib/messages';
import { Tooltip, type TooltipState } from './components/Tooltip';

// ─── Material Symbols font (needed in the host page shadow DOM) ───────────────
const FONT_LINK_HREF =
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap';

function injectFontIfNeeded() {
    if (!document.getElementById('doc-translator-font')) {
        const link = document.createElement('link');
        link.id = 'doc-translator-font';
        link.rel = 'stylesheet';
        link.href = FONT_LINK_HREF;
        document.head.appendChild(link);
    }
}

// ─── Code-node detection ──────────────────────────────────────────────────────
const CODE_TAGS = new Set(['CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'TT']);
const CODE_CLASSES = ['highlight', 'hljs', 'code', 'prism', 'CodeMirror', 'token'];

function isInsideCodeNode(node: Node | null): boolean {
    let current: Node | null = node;
    while (current && current !== document.body) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            const el = current as Element;
            if (CODE_TAGS.has(el.tagName)) return true;
            for (const cls of CODE_CLASSES) {
                if (el.classList.contains(cls)) return true;
            }
        }
        current = current.parentNode;
    }
    return false;
}

// ─── Tooltip portal setup ─────────────────────────────────────────────────────

interface TooltipData {
    state: TooltipState;
    position: { top: number; left: number };
    sourceLang: string;
    targetLang: string;
}

function createTooltipHost() {
    const host = document.createElement('div');
    host.id = 'doc-translator-root';
    host.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;';
    document.body.appendChild(host);
    return host;
}

const TooltipApp: React.FC<{
    data: TooltipData | null;
    onClose: () => void;
}> = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <div style={{ pointerEvents: 'auto' }}>
            <Tooltip
                state={data.state}
                position={data.position}
                sourceLang={data.sourceLang}
                targetLang={data.targetLang}
                onClose={onClose}
            />
        </div>
    );
};

// ─── Page Translation state ───────────────────────────────────────────────────
// Maps original TextNode → original text, for restore support.
const originalTexts = new Map<Text, string>();

async function translatePage(req: TranslatePageRequest): Promise<void> {
    // Collect all translatable text nodes (not inside code)
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const text = node.textContent?.trim() ?? '';
                if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
                if (isInsideCodeNode(node.parentNode)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        }
    );

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
    }

    // Group into chunks of ~500 chars to stay within API limits
    const chunks: { nodes: Text[]; combined: string }[] = [];
    let currentNodes: Text[] = [];
    let currentLength = 0;

    for (const textNode of textNodes) {
        const content = textNode.textContent ?? '';
        if (currentLength + content.length > 500 && currentNodes.length > 0) {
            chunks.push({ nodes: currentNodes, combined: currentNodes.map((n) => n.textContent).join('\n|||SPLIT|||\n') });
            currentNodes = [];
            currentLength = 0;
        }
        currentNodes.push(textNode);
        currentLength += content.length;
    }
    if (currentNodes.length > 0) {
        chunks.push({ nodes: currentNodes, combined: currentNodes.map((n) => n.textContent).join('\n|||SPLIT|||\n') });
    }

    let processed = 0;
    for (const chunk of chunks) {
        // Save originals for restore
        chunk.nodes.forEach((n) => {
            if (!originalTexts.has(n)) {
                originalTexts.set(n, n.textContent ?? '');
            }
        });

        const translateReq: TranslateRequest = {
            type: 'TRANSLATE',
            text: chunk.combined,
        };

        const response = await chrome.runtime.sendMessage(translateReq);
        if (response?.success && response.translation) {
            const parts = (response.translation as string).split('|||SPLIT|||');
            chunk.nodes.forEach((n, i) => {
                n.textContent = parts[i]?.trim() ?? n.textContent;
            });
        }

        processed += chunk.nodes.length;
        const progress = Math.round((processed / textNodes.length) * 100);
        chrome.runtime.sendMessage({
            type: 'PAGE_TRANSLATE_STATUS',
            status: 'translating',
            progress,
        } as PageTranslateStatusRequest);
    }

    chrome.runtime.sendMessage({
        type: 'PAGE_TRANSLATE_STATUS',
        status: 'done',
        progress: 100,
    } as PageTranslateStatusRequest);
}

function restorePage() {
    originalTexts.forEach((original, node) => {
        node.textContent = original;
    });
    originalTexts.clear();
    chrome.runtime.sendMessage({
        type: 'PAGE_TRANSLATE_STATUS',
        status: 'idle',
    } as PageTranslateStatusRequest);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

let tooltipDataState: TooltipData | null = null;
let reactRoot: ReturnType<typeof createRoot> | null = null;

function renderTooltip(data: TooltipData | null) {
    tooltipDataState = data;
    reactRoot?.render(
        <React.StrictMode>
            <TooltipApp
                data={tooltipDataState}
                onClose={() => renderTooltip(null)}
            />
        </React.StrictMode>
    );
}

async function handleMouseUp() {
    const settings = await getSettings();
    if (!settings.enabled) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) return;

    // Check if selection overlaps any code node
    const range = selection.getRangeAt(0);
    if (isInsideCodeNode(range.commonAncestorContainer)) return;

    // Calculate tooltip position
    const rect = range.getBoundingClientRect();
    const position = {
        top: rect.bottom + 10,
        left: Math.max(8, rect.left),
    };

    // Show loading state
    renderTooltip({
        state: { status: 'loading' },
        position,
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang,
    });

    // Request translation from background
    const req: TranslateRequest = {
        type: 'TRANSLATE',
        text: selectedText,
    };

    try {
        const response = await chrome.runtime.sendMessage(req);
        if (response?.success) {
            renderTooltip({
                state: { status: 'success', translation: response.translation, original: selectedText },
                position,
                sourceLang: settings.sourceLang,
                targetLang: settings.targetLang,
            });
        } else {
            renderTooltip({
                state: { status: 'error', error: response?.error ?? 'Translation failed.' },
                position,
                sourceLang: settings.sourceLang,
                targetLang: settings.targetLang,
            });
        }
    } catch (err) {
        renderTooltip({
            state: { status: 'error', error: 'Could not reach background service.' },
            position,
            sourceLang: settings.sourceLang,
            targetLang: settings.targetLang,
        });
    }
}

function init() {
    injectFontIfNeeded();

    // Mount React root
    const host = createTooltipHost();
    reactRoot = createRoot(host);
    renderTooltip(null);

    // Tooltip on text selection
    document.addEventListener('mouseup', handleMouseUp);

    // Listen for messages from popup (page translate / restore)
    chrome.runtime.onMessage.addListener(
        (message: TranslatePageRequest | RestorePageRequest, _sender, sendResponse) => {
            if (message.type === 'TRANSLATE_PAGE') {
                translatePage(message).catch((err) => {
                    chrome.runtime.sendMessage({
                        type: 'PAGE_TRANSLATE_STATUS',
                        status: 'error',
                        error: err instanceof Error ? err.message : 'Unknown error',
                    } as PageTranslateStatusRequest);
                });
                sendResponse({ received: true });
                return true;
            }
            if (message.type === 'RESTORE_PAGE') {
                restorePage();
                sendResponse({ received: true });
                return true;
            }
        }
    );
}

// Only run once per page
if (!document.getElementById('doc-translator-root')) {
    init();
}
