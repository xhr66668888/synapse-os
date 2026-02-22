'use client';

import { useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface DataTableColumn<T> {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'currency' | 'badge' | 'actions';
    width?: string;
    sortable?: boolean;
    render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    rowKey: (row: T) => string | number;
    selectable?: boolean;
    selectedKeys?: Set<string | number>;
    onSelectionChange?: (keys: Set<string | number>) => void;
    onSort?: (key: string, direction: 'asc' | 'desc') => void;
    emptyMessage?: string;
    className?: string;
}

export function DataTable<T>({
    columns,
    data,
    rowKey,
    selectable = false,
    selectedKeys,
    onSelectionChange,
    onSort,
    emptyMessage = '暂无数据',
    className = '',
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const handleSort = (key: string) => {
        const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
        setSortKey(key);
        setSortDir(newDir);
        onSort?.(key, newDir);
    };

    const handleSelectAll = () => {
        if (!onSelectionChange) return;
        if (selectedKeys && selectedKeys.size === data.length) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(data.map(rowKey)));
        }
    };

    const handleSelectRow = (key: string | number) => {
        if (!onSelectionChange || !selectedKeys) return;
        const next = new Set(selectedKeys);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        onSelectionChange(next);
    };

    const allSelected = selectedKeys ? selectedKeys.size === data.length && data.length > 0 : false;

    const getAlignClass = (type?: string) => {
        if (type === 'number' || type === 'currency') return 'text-right';
        return 'text-left';
    };

    const getValueClass = (type?: string) => {
        if (type === 'currency') return 'font-mono tabular-nums';
        if (type === 'number') return 'font-mono tabular-nums';
        return '';
    };

    return (
        <div className={`w-full overflow-auto ${className}`}>
            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                    <tr className="bg-surface-sunken border-b border-border">
                        {selectable && (
                            <th className="w-10 px-3 py-2 text-left">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 accent-action cursor-pointer"
                                />
                            </th>
                        )}
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-3 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider ${getAlignClass(col.type)} ${
                                    col.sortable ? 'cursor-pointer select-none hover:text-text-primary' : ''
                                }`}
                                style={col.width ? { width: col.width } : undefined}
                                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                            >
                                <span className="inline-flex items-center gap-1">
                                    {col.label}
                                    {col.sortable && sortKey === col.key && (
                                        sortDir === 'asc'
                                            ? <ChevronUp size={12} />
                                            : <ChevronDown size={12} />
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length + (selectable ? 1 : 0)}
                                className="px-3 py-12 text-center text-text-muted text-sm"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, index) => {
                            const key = rowKey(row);
                            const isSelected = selectedKeys?.has(key) ?? false;

                            return (
                                <tr
                                    key={key}
                                    className={`border-b border-border-light transition-colors duration-75 ${
                                        isSelected
                                            ? 'bg-info-bg border-l-[3px] border-l-action'
                                            : 'hover:bg-surface-sunken'
                                    }`}
                                    style={{ height: '36px' }}
                                >
                                    {selectable && (
                                        <td className="px-3 py-1.5">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectRow(key)}
                                                className="w-4 h-4 accent-action cursor-pointer"
                                            />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`px-3 py-1.5 text-sm text-text-primary ${getAlignClass(col.type)} ${getValueClass(col.type)}`}
                                        >
                                            {col.render
                                                ? col.render(row, index)
                                                : String((row as Record<string, unknown>)[col.key] ?? '')
                                            }
                                        </td>
                                    ))}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
