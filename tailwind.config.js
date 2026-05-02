/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './src/**/*.{ts,tsx,html}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#2b6cee',
                'background-dark': '#101622',
                'surface-dark': '#0F172A',
                'surface-darker': '#1E293B',
                'border-dark': '#334155',
                'text-muted': '#94a3b8',
            },
            fontFamily: {
                display: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.25rem',
                lg: '0.5rem',
                xl: '0.75rem',
                full: '9999px',
            },
        },
    },
    plugins: [],
};
