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
                // 主操作（近黑色）
                action: {
                    DEFAULT: '#1A1A1A',
                    fg: '#FFFFFF',
                    hover: '#333333',
                },
                // 成功/完成/上架/已支付/已上菜
                success: {
                    DEFAULT: '#00A550',
                    fg: '#FFFFFF',
                    bg: 'rgba(0, 165, 80, 0.12)',
                },
                // 处理中/待接单/制作中
                warning: {
                    DEFAULT: '#FF8C00',
                    fg: '#1A1A1A',
                    bg: 'rgba(255, 140, 0, 0.12)',
                },
                // 报错/缺货/下架/催单/取消
                danger: {
                    DEFAULT: '#CC1100',
                    fg: '#FFFFFF',
                    bg: 'rgba(204, 17, 0, 0.12)',
                },
                // 信息提示/平台标识
                info: {
                    DEFAULT: '#005BBB',
                    fg: '#FFFFFF',
                    bg: 'rgba(0, 91, 187, 0.12)',
                },
                // 表面色
                surface: {
                    base: '#F0EFEB',
                    raised: '#FFFFFF',
                    sunken: '#E4E3DF',
                    dark: '#1A1A1A',
                    'dark-2': '#2A2A2A',
                    'dark-3': '#363636',
                },
                // 文字色
                text: {
                    primary: '#1A1A1A',
                    secondary: '#5A5A5A',
                    muted: '#8A8A8A',
                    disabled: '#BBBBBB',
                    inverse: '#FFFFFF',
                },
                // 边框色
                border: {
                    DEFAULT: '#CECECE',
                    strong: '#8A8A8A',
                    focus: '#1A1A1A',
                    light: '#E4E3DF',
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
                'card': '0 1px 3px rgba(0, 0, 0, 0.12)',
                'raised': '0 2px 8px rgba(0, 0, 0, 0.16)',
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
