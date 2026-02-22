'use client';

import { Delete } from 'lucide-react';

interface NumericKeypadProps {
    value: string;
    onChange: (value: string) => void;
    onConfirm?: () => void;
    mode?: 'quantity' | 'price' | 'tableNumber';
    className?: string;
}

const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'DEL'],
];

export function NumericKeypad({
    value,
    onChange,
    onConfirm,
    mode = 'quantity',
    className = '',
}: NumericKeypadProps) {
    const handleKey = (key: string) => {
        if (key === 'DEL') {
            onChange(value.slice(0, -1));
            return;
        }
        if (key === '.' && mode === 'quantity') return; // 数量模式不允许小数点
        if (key === '.' && value.includes('.')) return;  // 已有小数点
        if (mode === 'quantity' && value.length >= 3) return; // 数量最大 999

        onChange(value + key);
    };

    const handleClear = () => onChange('');

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {/* 显示区 */}
            <div className="input-numpad text-right pr-4">
                {value || '0'}
            </div>

            {/* 键盘网格 */}
            <div className="grid grid-cols-3 gap-1">
                {KEYS.flat().map((key) => (
                    <button
                        key={key}
                        onClick={() => handleKey(key)}
                        className={`flex items-center justify-center rounded-sm font-mono text-lg font-bold transition-colors duration-75 select-none
                            ${key === 'DEL'
                                ? 'bg-surface-sunken text-text-primary hover:bg-border'
                                : key === '.' && mode === 'quantity'
                                    ? 'bg-surface-sunken text-text-disabled cursor-not-allowed'
                                    : 'bg-surface-raised text-text-primary border border-border hover:bg-surface-sunken active:bg-action active:text-action-fg'
                            }`}
                        style={{ minHeight: '56px' }}
                        disabled={key === '.' && mode === 'quantity'}
                    >
                        {key === 'DEL' ? <Delete size={20} /> : key}
                    </button>
                ))}
            </div>

            {/* 底部操作 */}
            <div className="grid grid-cols-2 gap-1 mt-1">
                <button
                    onClick={handleClear}
                    className="btn-ghost text-sm"
                    style={{ minHeight: '44px' }}
                >
                    清空
                </button>
                {onConfirm && (
                    <button
                        onClick={onConfirm}
                        className="btn-action text-sm"
                        style={{ minHeight: '44px' }}
                    >
                        确认
                    </button>
                )}
            </div>
        </div>
    );
}
