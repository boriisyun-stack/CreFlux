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
            primary: '#FF006E',    // Vibrant Pink / Neon Rose
            secondary: '#3A86FF',  // Vibrant Blue / Electric Indigo
            accent: '#8338EC',     // Electric Violet
            background: '#F8F9FA', // Clean light base
            surface: 'rgba(255, 255, 255, 0.75)', // Glass surface
            surfaceHover: 'rgba(255, 255, 255, 0.92)',
            border: 'rgba(131, 56, 236, 0.18)', // Harmonious purple border (#8338EC)
            borderHover: 'rgba(58, 134, 255, 0.35)',
            text: '#111827',       // Deep rich charcoal for crisp readability
            textMuted: '#64748B',  // Slate gray (clean modern muted)
            success: '#10B981',    // Emerald
            warning: '#F59E0B',    // Amber
            error: '#EF4444',      // Red
            errorBg: 'rgba(239, 68, 68, 0.08)',
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
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(131, 56, 236, 0.25) transparent',
    },
    body: {
        fontFamily: '$body',
        backgroundColor: '$background',
        color: '$text',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        padding: '0',
        backgroundImage: 'radial-gradient(circle at 15% 35%, rgba(255, 0, 110, 0.12) 0%, transparent 45%), radial-gradient(circle at 85% 25%, rgba(58, 134, 255, 0.14) 0%, transparent 50%), radial-gradient(circle at 50% 85%, rgba(131, 56, 236, 0.10) 0%, transparent 50%)',
        backgroundAttachment: 'fixed',
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
        background: 'rgba(131, 56, 236, 0.25)',
        borderRadius: '9999px',
        border: '2px solid transparent',
        backgroundClip: 'content-box',
    },
    '::-webkit-scrollbar-thumb:hover': {
        background: 'linear-gradient(135deg, #FF006E, #8338EC, #3A86FF)',
        borderRadius: '9999px',
        border: '2px solid transparent',
        backgroundClip: 'content-box',
    },
});
