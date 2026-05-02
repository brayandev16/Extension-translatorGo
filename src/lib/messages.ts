// ─── Request / Response types ─────────────────────────────────────────────────

export interface TranslateRequest {
    type: 'TRANSLATE';
    text: string;
}

export interface TranslateResponse {
    success: boolean;
    translation?: string;
    error?: string;
}

/** Sent from popup → content script to trigger full page translation. */
export interface TranslatePageRequest {
    type: 'TRANSLATE_PAGE';
}

/** Sent from popup → content script to restore the page to its original state. */
export interface RestorePageRequest {
    type: 'RESTORE_PAGE';
}

/** Sent from content script → popup to report page translation status. */
export interface PageTranslateStatusRequest {
    type: 'PAGE_TRANSLATE_STATUS';
    status: 'idle' | 'translating' | 'done' | 'error';
    progress?: number; // 0-100
    error?: string;
}

export type ExtMessage =
    | TranslateRequest
    | TranslatePageRequest
    | RestorePageRequest
    | PageTranslateStatusRequest;
