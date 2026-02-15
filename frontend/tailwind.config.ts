import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            // FlymeOS / Apple Style Colors
            colors: {
                // Flyme Blue / Apple Blue (Vibrant & Trustworthy)
                primary: {
                    DEFAULT: '#007AFF', // Apple Blue preference
                    light: '#47A1FF',
                    dark: '#0055B3',
                    50: '#F0F7FF',
                    100: '#E0F0FF',
                    200: '#BAE0FF',
                },
                // Status Colors (Softer, Pastel-like)
                success: {
                    DEFAULT: '#34C759', // Apple Green
                    bg: '#EAF9ED',
                },
                warning: {
                    DEFAULT: '#FF9F0A', // Apple Orange
                    bg: '#FFF5E5',
                },
                error: {
                    DEFAULT: '#FF3B30', // Apple Red
                    bg: '#FFEBEA',
                },
                // Backgrounds (Clean, Minimalist)
                bg: {
                    primary: '#FFFFFF',
                    secondary: '#F5F5F7', // Apple System Gray 6
                    tertiary: '#FFFFFF', // Cards are white on gray bg
                    hover: '#F2F2F7',
                    active: '#E5E5EA',
                },
                // Text (High Contrast but Soft)
                text: {
                    primary: '#1D1D1F', // Apple Gray
                    secondary: '#86868B',
                    muted: '#AEAEB2',
                    placeholder: '#C7C7CC',
                },
                // Borders
                border: {
                    DEFAULT: '#E5E5EA',
                    light: '#F2F2F7',
                    dark: '#C7C7CC',
                },
            },
            // Radius: Squircle-like
            borderRadius: {
                'xs': '4px',
                'sm': '8px',
                'md': '12px',
                'lg': '16px',
                'xl': '20px',
                '2xl': '24px',
                '3xl': '32px',
            },
            // Shadows: Diffused & Multi-layer
            boxShadow: {
                'card': '0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.01)',
                'hover': '0 8px 24px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.02)',
                'lg': '0 12px 32px rgba(0, 0, 0, 0.08)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            },
            // Font - Synapse OS 品牌字体
            fontFamily: {
                sans: ['SynapseFont', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
            },
            // Animation
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
