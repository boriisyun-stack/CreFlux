import { createStitches } from '@stitches/react';

export const {
    styled,
    css,
    globalCss,
    keyframes,
    getCssText,
    theme,
    createTheme,
    config,
} = createStitches({
    theme: {
        colors: {
            primary: '#f72585',    // Vibrant Pink/Magenta
            secondary: '#4361ee',  // Vibrant Blue
            background: '#f4f5f7', // Solid light grey background
            surface: '#ffffff',    // Solid white cards
            surfaceHover: '#fafafa',
            border: '#e4e7eb', // Soft light gray borders
            text: '#374151', // Dark grey for text
            textMuted: '#9ca3af', // Light grey for labels/placeholders
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            errorBg: 'rgba(239, 68, 68, 0.1)',
        },
        space: {
            1: '0.25rem',
            2: '0.5rem',
            3: '1rem',
            4: '1.5rem',
            5: '2rem',
            6: '3rem',
        },
        fontSizes: {
            1: '0.75rem',
            2: '0.875rem',
            3: '1rem',
            4: '1.125rem',
            5: '1.25rem',
            6: '1.5rem',
            7: '2rem',
            8: '3rem',
        },
        fonts: {
            body: '"Inter", sans-serif',
            heading: '"Outfit", sans-serif',
        },
        radii: {
            1: '8px',
            2: '12px',
            3: '16px',
            4: '20px',
            5: '32px',
            6: '40px',
            7: '48px',
            round: '9999px',
        },
    },
});

export const globalStyles = globalCss({
    '@import': [
        "url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Inter:wght@400;500;700&display=swap')"
    ],
    '*': {
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
    },
    body: {
        fontFamily: '$body',
        backgroundColor: '$background',
        color: '$text',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        padding: '0',
    },
    'h1, h2, h3, h4': {
        fontFamily: '$heading',
    },
    // Custom scrollbar
    '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
    },
    '::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
        background: '#e4e7eb',
        borderRadius: '9999px',
        border: '2px solid transparent',
        backgroundClip: 'content-box',
    },
    '::-webkit-scrollbar-thumb:hover': {
        background: '#d1d5db',
        borderRadius: '9999px',
        border: '2px solid transparent',
        backgroundClip: 'content-box',
    },
    '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: '#e4e7eb transparent',
    },
});
