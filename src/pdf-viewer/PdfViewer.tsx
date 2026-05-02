import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// ─── PDF.js worker ─────────────────────────────────────────────────────────
// Reference the worker file copied to dist/ by the Vite plugin.
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
    'pdf.worker.min.mjs'
);

// ─── Helpers ──────────────────────────────────────────────────────────────

function getPdfUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('url');
}

// ─── Single Page Component ─────────────────────────────────────────────────

const PdfPage: React.FC<{
    page: PDFPageProxy;
    scale: number;
    pageNumber: number;
}> = ({ page, scale, pageNumber }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        if (!canvas || !textLayerDiv) return;

        let cancelled = false;

        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Clear previous text layer content
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.setProperty('--scale-factor', viewport.scale.toString());

        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) return;

        // --- Render canvas ---
        const renderTask = page.render({ canvasContext, viewport });

        renderTask.promise
            .then(() => {
                if (cancelled) return;
                // --- Render text layer using pdfjs-dist v4 TextLayer class ---
                const textLayer = new pdfjsLib.TextLayer({
                    textContentSource: page.streamTextContent(),
                    container: textLayerDiv,
                    viewport,
                });
                return textLayer.render();
            })
            .catch((err) => {
                if (err?.name !== 'RenderingCancelledException') {
                    console.error(`[PDF Viewer] Page ${pageNumber} render error:`, err);
                }
            });

        return () => {
            cancelled = true;
            renderTask.cancel();
        };
    }, [page, scale, pageNumber]);

    return (
        <div
            style={{
                position: 'relative',
                display: 'inline-block',
                marginBottom: '16px',
                boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            <div
                ref={textLayerRef}
                className="textLayer"
                style={{ position: 'absolute', top: 0, left: 0 }}
            />
        </div>
    );
};

// ─── Main Viewer Component ─────────────────────────────────────────────────

export const PdfViewer: React.FC = () => {
    const [pages, setPages] = useState<PDFPageProxy[]>([]);
    const [scale, setScale] = useState(1.4);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Load PDF ──────────────────────────────────────────────────────────
    useEffect(() => {
        const url = getPdfUrl();
        if (!url) {
            setError(
                'No PDF URL provided. Navigate to a .pdf link and it will open here automatically.'
            );
            setLoading(false);
            return;
        }
        setPdfUrl(url);
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({
            url,
            cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
            cMapPacked: true,
        });

        loadingTask.promise
            .then(async (doc: PDFDocumentProxy) => {
                setTotalPages(doc.numPages);

                const pagesArr: PDFPageProxy[] = [];
                for (let i = 1; i <= doc.numPages; i++) {
                    pagesArr.push(await doc.getPage(i));
                }
                setPages(pagesArr);
                setLoading(false);
            })
            .catch((err: Error) => {
                setError(`Failed to load PDF: ${err?.message ?? 'Unknown error'}`);
                setLoading(false);
            });

        return () => {
            loadingTask.destroy();
        };
    }, []);

    // ── Scroll-based current page tracking ────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const scrollMid = container.scrollTop + container.clientHeight / 2;
            let closest = 0;
            let closestDist = Infinity;
            pageRefs.current.forEach((ref, i) => {
                if (!ref) return;
                const mid = ref.offsetTop + ref.offsetHeight / 2;
                const dist = Math.abs(mid - scrollMid);
                if (dist < closestDist) {
                    closest = i;
                    closestDist = dist;
                }
            });
            setCurrentPage(closest + 1);
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [pages]);

    const goToPage = useCallback(
        (p: number) => {
            const clamped = Math.max(1, Math.min(p, totalPages));
            const ref = pageRefs.current[clamped - 1];
            ref?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setCurrentPage(clamped);
        },
        [totalPages]
    );

    const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
    const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
    const zoomReset = () => setScale(1.4);

    const filename = pdfUrl
        ? decodeURIComponent(
              pdfUrl.split('/').pop()?.split('?')[0] ?? 'document.pdf'
          )
        : 'document.pdf';

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div style={styles.root}>
            {/* ── Toolbar ─────────────────────────────────────────── */}
            <div style={styles.toolbar}>
                <div style={styles.toolbarLeft}>
                    <span style={styles.logo}>📄</span>
                    <span style={styles.filename} title={pdfUrl ?? ''}>
                        {filename}
                    </span>
                </div>

                <div style={styles.toolbarCenter}>
                    <button
                        style={styles.btn}
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        title="Previous page"
                    >
                        ‹
                    </button>
                    <span style={styles.pageInfo}>
                        <input
                            type="number"
                            value={currentPage}
                            min={1}
                            max={totalPages}
                            style={styles.pageInput}
                            onChange={(e) => goToPage(Number(e.target.value))}
                        />
                        <span style={styles.pageTotal}>&nbsp;/ {totalPages}</span>
                    </span>
                    <button
                        style={styles.btn}
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        title="Next page"
                    >
                        ›
                    </button>
                </div>

                <div style={styles.toolbarRight}>
                    <button style={styles.btn} onClick={zoomOut} title="Zoom out">
                        −
                    </button>
                    <button style={styles.zoomLabel} onClick={zoomReset} title="Reset zoom">
                        {Math.round(scale * 100)}%
                    </button>
                    <button style={styles.btn} onClick={zoomIn} title="Zoom in">
                        +
                    </button>
                    {pdfUrl && (
                        <a
                            href={pdfUrl}
                            download
                            style={styles.downloadBtn}
                            title="Download original PDF"
                        >
                            ⬇ Download
                        </a>
                    )}
                </div>
            </div>

            {/* ── Page Area ───────────────────────────────────────── */}
            <div ref={containerRef} style={styles.pageArea}>
                {loading && (
                    <div style={styles.centered}>
                        <div style={styles.spinner} />
                        <p style={styles.loadingText}>Loading PDF…</p>
                    </div>
                )}

                {error && (
                    <div style={styles.centered}>
                        <p style={styles.errorText}>⚠️ {error}</p>
                    </div>
                )}

                {!loading &&
                    !error &&
                    pages.map((page, i) => (
                        <div
                            key={i}
                            ref={(el) => {
                                pageRefs.current[i] = el;
                            }}
                            style={styles.pageWrapper}
                        >
                            <PdfPage page={page} scale={scale} pageNumber={i + 1} />
                            <div style={styles.pageLabel}>Page {i + 1}</div>
                        </div>
                    ))}
            </div>
        </div>
    );
};


// ─── Inline styles ─────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#1a1a2e',
        color: '#e0e0f0',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        height: '52px',
        flexShrink: 0,
        zIndex: 10,
    },
    toolbarLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: 0,
        flex: 1,
    },
    toolbarCenter: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
    },
    toolbarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        justifyContent: 'flex-end',
    },
    logo: { fontSize: '20px', flexShrink: 0 },
    filename: {
        fontSize: '13px',
        color: '#a0b4d0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '260px',
    },
    btn: {
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#e0e0f0',
        borderRadius: '6px',
        padding: '4px 12px',
        cursor: 'pointer',
        fontSize: '16px',
        lineHeight: '1.5',
    },
    pageInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
    },
    pageInput: {
        width: '48px',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.16)',
        color: '#e0e0f0',
        borderRadius: '4px',
        padding: '3px 6px',
        fontSize: '13px',
        textAlign: 'center',
    },
    pageTotal: { color: '#a0b4d0', fontSize: '13px' },
    zoomLabel: {
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#e0e0f0',
        borderRadius: '6px',
        padding: '4px 10px',
        cursor: 'pointer',
        fontSize: '13px',
        minWidth: '52px',
        textAlign: 'center',
    },
    downloadBtn: {
        background: 'linear-gradient(135deg, #533483, #e94560)',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        padding: '5px 12px',
        fontSize: '12px',
        cursor: 'pointer',
        textDecoration: 'none',
        fontWeight: 600,
    },
    pageArea: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        gap: '8px',
    },
    pageWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
    },
    pageLabel: {
        fontSize: '11px',
        color: 'rgba(255,255,255,0.3)',
        marginBottom: '8px',
    },
    centered: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '16px',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid #e94560',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    loadingText: { color: '#a0b4d0', fontSize: '14px' },
    errorText: {
        color: '#ff6b6b',
        fontSize: '14px',
        textAlign: 'center',
        maxWidth: '480px',
        lineHeight: 1.6,
    },
};

// ─── Spinner keyframes ─────────────────────────────────────────────────────
// Injected once on module load (can't use @keyframes inside CSSProperties).
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(spinnerStyle);
