import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            // 语义色彩体系 — 色彩即状态，没有例外
            colors: {
                // 主操作（品牌红）
                action: {
                    DEFAULT: '#BB0000',
                    fg: '#FFFFFF',
                    hover: '#990000',
                },
                // 成功/完成/上架/已支付/已上菜
                success: {
                    DEFAULT: '#00A550',
                    fg: '#FFFFFF',
                    bg: '#003300',
                },
                // 处理中/待接单/制作中
                warning: {
                    DEFAULT: '#FF8C00',
                    fg: '#000000',
                    bg: '#331A00',
                },
                // 报错/缺货/下架/催单/取消
                danger: {
                    DEFAULT: '#CC1100',
                    fg: '#FFFFFF',
                    bg: '#330000',
                },
                // 信息提示/平台标识
                info: {
                    DEFAULT: '#005BBB',
                    fg: '#FFFFFF',
                    bg: '#001133',
                },
                // 表面色（全黑底主题）
                surface: {
                    base: '#111111',
                    raised: '#1E1E1E',
                    sunken: '#0A0A0A',
                    dark: '#1A1A1A',
                    'dark-2': '#2A2A2A',
                    'dark-3': '#363636',
                },
                // 文字色（浅色，适配深色底）
                text: {
                    primary: '#EEEEEE',
                    secondary: '#BBBBBB',
                    muted: '#777777',
                    disabled: '#444444',
                    inverse: '#111111',
                },
                // 边框色（深色底可见）
                border: {
                    DEFAULT: '#333333',
                    strong: '#555555',
                    focus: '#FFFFFF',
                    light: '#222222',
                },
            },
            // 扁平工业风圆角
            borderRadius: {
                'xs': '2px',
                'sm': '4px',
                'md': '6px',
                'lg': '8px',
            },
            // 克制的阴影
            boxShadow: {
                'card': '0 1px 3px rgba(0, 0, 0, 0.6)',
                'raised': '0 2px 8px rgba(0, 0, 0, 0.7)',
            },
            // 字体
            fontFamily: {
                sans: ['SynapseFont', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            // 动画
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'kds-blink': 'kdsBlink 1s ease-in-out infinite',
                'edge-flash': 'edgeFlash 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                kdsBlink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.4' },
                },
                edgeFlash: {
                    '0%, 100%': { boxShadow: 'inset 0 0 0 0px transparent' },
                    '50%': { boxShadow: 'inset 0 0 0 4px #CC1100' },
                },
            },
        },
    },
    plugins: [
        plugin(function ({ addUtilities }) {
            addUtilities({
                '.tabular-nums': {
                    'font-variant-numeric': 'tabular-nums',
                },
            });
        }),
    ],
};

export default config;
