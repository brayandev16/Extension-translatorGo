window.addEventListener('error', (e) => {
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;z-index:9999;background:red;color:white;padding:20px;font-family:monospace;width:100%;">
        <h3>Global Error:</h3>
        <p>${e.message}</p>
        <pre>${e.error?.stack}</pre>
    </div>`;
});

window.addEventListener('unhandledrejection', (e) => {
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;z-index:9999;background:orange;color:white;padding:20px;font-family:monospace;width:100%;">
        <h3>Unhandled Promise:</h3>
        <p>${e.reason?.message ?? e.reason}</p>
        <pre>${e.reason?.stack}</pre>
    </div>`;
});

// Use dynamic imports so that any top-level error in PdfViewer or its imports is caught
// by our event listeners above!
Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./PdfViewer.tsx'),
    import('../content/index.tsx'),
    import('pdfjs-dist/web/pdf_viewer.css')
]).then(([React, ReactDOM, { PdfViewer }]) => {
    const root = document.getElementById('root')!;
    ReactDOM.createRoot(root).render(
        <React.default.StrictMode>
            <PdfViewer />
        </React.default.StrictMode>
    );
}).catch(err => {
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;z-index:9999;background:blue;color:white;padding:20px;font-family:monospace;width:100%;">
        <h3>Dynamic Import Error:</h3>
        <p>${err.message}</p>
        <pre>${err.stack}</pre>
    </div>`;
});

