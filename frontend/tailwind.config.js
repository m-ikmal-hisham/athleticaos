/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Inter', 'sans-serif'],
            },
            opacity: {
                4: '0.04',
                6: '0.06',
                12: '0.12',
                24: '0.24',
                28: '0.28',
                72: '0.72',
                92: '0.92',
            },
            colors: {
                // Semantic Tokens (§8)
                brand: {
                    DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
                    hover: 'rgb(var(--brand-hover) / <alpha-value>)',
                    text: 'rgb(var(--brand-text) / <alpha-value>)',
                },
                accent: {
                    DEFAULT: 'var(--surface-sunken)',
                    hover: 'var(--surface-sunken)',
                    text: 'rgb(var(--accent-text) / <alpha-value>)',
                    foreground: 'var(--content-primary)',
                },
                'accent-foreground': 'var(--content-primary)',
                surface: {
                    page: 'var(--surface-page)',
                    card: 'var(--surface-card)',
                    sunken: 'var(--surface-sunken)',
                },
                content: {
                    primary: 'var(--content-primary)',
                    secondary: 'var(--content-secondary)',
                    tertiary: 'var(--content-tertiary)',
                },
                line: {
                    subtle: 'var(--line-subtle)',
                    strong: 'var(--line-strong)',
                },

                // Shadcn / Compatibility tokens
                input: 'var(--line-strong)',
                background: 'var(--surface-page)',
                foreground: 'var(--content-primary)',
                muted: 'var(--content-secondary)',
                'muted-foreground': 'var(--content-secondary)',
                border: 'var(--line-subtle)',

                // Glass & Panels
                'glass-bg': 'var(--bg-glass)',
                'glass-border': 'var(--border-glass)',

                // Palette tokens
                navy: '#0047AB',
                crimson: '#C1121F',
                'deep-navy': '#0D1B2A',
                'navy-tint': '#8CACD9',
                'crimson-tint': '#D7656D',
                'card-yellow': '#FFC800',

                // Brand Colors (AthleticaOS Rugby) - Remapped to palette
                primary: {
                    50: '#EEF3FB',
                    100: '#D9E4F5',
                    200: '#B3C8EA',
                    300: '#8CACD9',
                    400: '#4F7FC6',
                    500: '#0047AB',
                    600: '#0047AB',
                    700: '#003A8C',
                    800: '#0D1B2A',
                    900: '#0D1B2A',
                    950: '#0D1B2A',
                },
                secondary: {
                    DEFAULT: 'var(--brand-secondary)',
                    foreground: 'var(--brand-accent)',
                    50: '#FCEDEE',
                    100: '#F7D4D6',
                    200: '#EFA9AE',
                    300: '#E37E85',
                    400: '#D7656D',
                    500: '#C1121F',
                    600: '#C1121F',
                    700: '#9E0F19',
                    800: '#7A0C14',
                    900: '#56080E',
                    950: '#3A050A',
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glass': 'var(--shadow-glass)',
                'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.08)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-in': 'slideIn 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideIn: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
            },
        },
    },
    plugins: [],
}
