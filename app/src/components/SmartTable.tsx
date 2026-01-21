import React, { useState, useRef, useEffect } from 'react';
import { formatDateVN, normalizeDateValue } from '../utils/dateUtils';

// Interfaces for props
export interface ColumnDef {
    field: string;
    headerName: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    renderCell?: (value: any, row: any) => React.ReactNode;
    editable?: boolean;
    type?: 'text' | 'number' | 'select' | 'date'; // Added 'date'
    selectOptions?: { value: string; label: string }[];
    dataListId?: string;
    validator?: (value: any) => string | null; // Custom validator
    numberFormat?: { locale?: string; decimals?: number }; // Optional config for numbers
    fontClass?: string; // CSS classes for font styling
}

export interface TraceableValue {
    value: any;
    formula?: string;
    source?: {
        type: 'link' | 'modal';
        target: string;
        label?: string;
    };
}

export interface ContextMenuItem {
    label: string | React.ReactNode;
    icon?: string;
    action: (row: any, colId?: string) => void;
    checkDisabled?: (row: any) => boolean;
}


interface SmartTableProps {
    data: any[];
    columns: ColumnDef[];
    keyField: string;
    onCellChange?: (id: string, field: string, value: any) => void;
    onSelectionChange?: (row: any | null) => void; // New callback
    onRowDoubleClick?: (row: any) => void; // New callback for double click
    onRowCommit?: (rowData: any) => Promise<void>; // New: Commit draft row
    isCoreEditable?: boolean;
    loading?: boolean;
    emptyMessage?: string;
    getRowClassName?: (row: any) => string;
    // Config
    minRows?: number;
    extraCols?: number;
    showAddButton?: boolean;
    lockedUntil?: string; // New: YYYY-MM-DD
    dateField?: string;   // New: Field to check date
    showTotalRow?: boolean; // New: Toggle Total Row
    contextMenuItems?: ContextMenuItem[]; // New: Custom Context Menu
    selectedRow?: any; // New: Selected row to highlight
    onRowClick?: (row: any) => void; // Alias for consistency
}

export const SmartTable: React.FC<SmartTableProps> = ({
    data,
    columns,
    keyField,
    onCellChange,
    onSelectionChange,
    onRowDoubleClick,
    onRowCommit,
    loading = false,
    emptyMessage = "No data",
    minRows = 0,
    extraCols = 0,
    showAddButton = false,
    getRowClassName,
    lockedUntil,
    dateField = 'trx_date',
    showTotalRow = true,
    contextMenuItems,
    selectedRow,
    onRowClick
}) => {
    // --- Types for Interleaved Structure ---
    type TableColType = {
        id: string; // Unique ID (Real: field name, Draft: UUID)
        type: 'real' | 'draft';
        def?: ColumnDef; // Only if real
    };

    type TableRowType = {
        id: string; // Unique ID (Real: keyField value, Draft: UUID)
        type: 'real' | 'draft';
        data?: any; // Only if real
        dataIndex?: number; // Index in original props.data (for updates)
    };

    // --- State ---
    const [tableCols, setTableCols] = useState<TableColType[]>([]);
    const [tableRows, setTableRows] = useState<TableRowType[]>([]);
    const [scratchpadData, setScratchpadData] = useState<Record<string, string>>({}); // Key: `${RowID}:${ColID}`

    // Selection & Error State
    const [selectedPos, setSelectedPos] = useState<{ rIdx: number, cIdx: number } | null>(null);
    const [cellErrors, setCellErrors] = useState<Record<string, string>>({});

    // Trigger onSelectionChange when selectedPos updates
    useEffect(() => {
        const handler = onRowClick || onSelectionChange;
        if (!handler) return;
        if (selectedPos) {
            const row = tableRows[selectedPos.rIdx];
            handler(row?.type === 'real' ? row.data : null);
        } else {
            handler(null);
        }
    }, [selectedPos, tableRows, onRowClick, onSelectionChange]);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, rIdx: number, cIdx: number } | null>(null);

    // Sort & Filter State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [filters, setFilters] = useState<Record<string, string[]>>({});
    const [filterConditions, setFilterConditions] = useState<Record<string, { operator: string; value: string } | null>>({});
    const [activeMenuCol, setActiveMenuCol] = useState<string | null>(null);
    const [tempFilterSelection, setTempFilterSelection] = useState<Set<string>>(new Set());
    const [tempCondition, setTempCondition] = useState<{ operator: string; value: string } | null>(null);
    const [filterSearchTerm, setFilterSearchTerm] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 1. Build Columns
        const initCols: TableColType[] = columns.map(c => ({ id: c.field, type: 'real', def: c }));
        // Add defaults drafts
        for (let i = 0; i < extraCols; i++) {
            initCols.push({ id: `draft-col-${Date.now()}-${i}`, type: 'draft' });
        }
        setTableCols(initCols);
    }, [columns, extraCols]);

    useEffect(() => {
        // 2. Build Rows (Apply Sort/Filter here?)
        // Let's process data first
        let processed = [...data];

        // Filter
        // 1. Value List Filters
        Object.keys(filters).forEach(key => {
            const allowedValues = filters[key];
            if (allowedValues && allowedValues.length > 0) {
                processed = processed.filter(item => {
                    const itemVal = String(item[key] === undefined || item[key] === null ? '' : item[key]);
                    return allowedValues.includes(itemVal);
                });
            }
        });

        // 2. Conditional Filters
        Object.keys(filterConditions).forEach(key => {
            const cond = filterConditions[key];
            if (cond && cond.value !== '') {
                processed = processed.filter(item => {
                    const itemVal = item[key];
                    const filterVal = cond.value;
                    const numItem = Number(itemVal);
                    const numFilter = Number(filterVal);
                    const isNum = !isNaN(numItem) && !isNaN(numFilter) && filterVal.trim() !== '';

                    switch (cond.operator) {
                        case 'eq': return isNum ? numItem === numFilter : String(itemVal) === filterVal;
                        case 'neq': return isNum ? numItem !== numFilter : String(itemVal) !== filterVal;
                        case 'gt': return isNum ? numItem > numFilter : String(itemVal) > filterVal;
                        case 'gte': return isNum ? numItem >= numFilter : String(itemVal) >= filterVal;
                        case 'lt': return isNum ? numItem < numFilter : String(itemVal) < filterVal;
                        case 'lte': return isNum ? numItem <= numFilter : String(itemVal) <= filterVal;
                        case 'contains': return String(itemVal || '').toLowerCase().includes(filterVal.toLowerCase());
                        case 'starts': return String(itemVal || '').toLowerCase().startsWith(filterVal.toLowerCase());
                        case 'ends': return String(itemVal || '').toLowerCase().endsWith(filterVal.toLowerCase());
                        default: return true;
                    }
                });
            }
        });

        // Sort
        if (sortConfig) {
            processed.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Map to TableRows
        const initRows: TableRowType[] = processed.map((item, idx) => ({
            id: String(item[keyField] || `row-${idx}`),
            type: 'real',
            data: item,
            dataIndex: idx
        }));

        // Append min draft rows
        const needed = Math.max(0, minRows - initRows.length);
        for (let i = 0; i < needed; i++) {
            initRows.push({ id: `draft-row-${Date.now()}-${i}`, type: 'draft' });
        }

        setTableRows(initRows);
    }, [data, minRows, sortConfig, filters, keyField]); // Re-run on sort/filter change

    // --- Helpers ---
    const getColumnLabel = (index: number) => {
        let label = "";
        let i = index;
        while (i >= 0) {
            label = String.fromCharCode(65 + (i % 26)) + label;
            i = Math.floor(i / 26) - 1;
        }
        return label;
    };

    // --- Context Menu Handlers ---
    const handleInsertRow = (atIndex: number) => {
        const newRow: TableRowType = { id: `draft-row-${Date.now()}`, type: 'draft' };
        setTableRows(prev => {
            const clone = [...prev];
            clone.splice(atIndex, 0, newRow);
            return clone;
        });
        setContextMenu(null);
    };

    const handleInsertCol = (atIndex: number) => {
        const newCol: TableColType = { id: `draft-col-${Date.now()}`, type: 'draft' };
        setTableCols(prev => {
            const clone = [...prev];
            clone.splice(atIndex, 0, newCol);
            return clone;
        });
        setContextMenu(null);
    };

    // --- Validation Logic ---
    const validateValue = (value: any, col: ColumnDef): string | null => {
        if (!value && value !== 0) return null;

        if (col.validator) {
            return col.validator(value);
        }

        if (col.type === 'number') {
            if (isNaN(Number(value))) {
                return "Giá trị phải là số";
            }
        }

        if (col.type === 'date') {
            const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
            const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (typeof value === 'string' && !dateRegex.test(value) && !isoRegex.test(value)) {
                return "Định dạng ngày không hợp lệ (DD/MM/YYYY)";
            }
        }

        return null;
    };

    // --- Draft Row Validation ---
    const isDraftRowValid = (rIdx: number) => {
        return tableCols.some((col, cIdx) => {
            if (col.type !== 'real') return false; // meaningful data usually in real cols? or just any change?
            const val = getCellValue(rIdx, cIdx);
            return val && val.trim() !== '';
        });
    };

    const handleCommitRow = async (rIdx: number) => {
        if (!onRowCommit) return;
        const row = tableRows[rIdx];
        if (!row) return;

        // Construct row data
        const rowData: any = {};
        tableCols.forEach((col, cIdx) => {
            if (col.type === 'real') {
                rowData[col.id] = getCellValue(rIdx, cIdx);
            }
        });

        await onRowCommit(rowData);

        // Cleanup? For now assume parent updates data prop which triggers "Sync" effect
        // If we want immediate UI feedback, we'd convert this `draft` row to `real` in state, 
        // but `useEffect` sync will likely overwrite it anyway.
    };

    // --- Handlers ---
    const handleSort = (field: string, direction: 'asc' | 'desc') => {
        setSortConfig({ key: field, direction });
        setActiveMenuCol(null);
    };

    const handleFilterChange = (field: string, values: string[]) => {
        setFilters(prev => {
            if (values.length === 0) {
                const { [field]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [field]: values };
        });
    };

    // Helper to get unique values for a column
    const getUniqueValues = (colId: string) => {
        const unique = new Set<string>();
        data.forEach(item => {
            const val = item[colId];
            unique.add(String(val === undefined || val === null ? '' : val));
        });
        return Array.from(unique).sort();
    };

    const handleMenuOpen = (colId: string) => {
        setActiveMenuCol(colId);
        setFilterSearchTerm('');

        // Init List Selection
        const currentList = filters[colId];
        if (currentList) {
            setTempFilterSelection(new Set(currentList));
        } else {
            setTempFilterSelection(new Set(getUniqueValues(colId)));
        }

        // Init Condition
        const currentCond = filterConditions[colId];
        if (currentCond) {
            setTempCondition(currentCond);
        } else {
            // Default operator based on col type?
            const colDef = tableCols.find(c => c.id === colId)?.def;
            const defaultOp = colDef?.type === 'number' ? 'gt' : 'contains';
            setTempCondition({ operator: defaultOp, value: '' });
        }
    };

    const toggleFilterItem = (val: string) => {
        setTempFilterSelection(prev => {
            const next = new Set(prev);
            if (next.has(val)) next.delete(val);
            else next.add(val);
            return next;
        });
        // Clear condition if interacting with list? Optional.
        // setTempCondition(prev => ({ ...prev!, value: '' })); 
    };

    const handleSelectAll = (allValues: string[], search: string) => {
        const visibleValues = allValues.filter(v => v.toLowerCase().includes(search.toLowerCase()));
        setTempFilterSelection(prev => {
            const next = new Set(prev);
            const allVisibleSelected = visibleValues.every(v => prev.has(v));

            if (allVisibleSelected) {
                // Deselect only visible
                visibleValues.forEach(v => next.delete(v));
            } else {
                // Select all visible
                visibleValues.forEach(v => next.add(v));
            }
            return next;
        });
    };

    const applyFilter = (colId: string) => {
        // 1. Apply Condition if value exists
        if (tempCondition && tempCondition.value.trim() !== '') {
            setFilterConditions(prev => ({ ...prev, [colId]: tempCondition }));
            // Clear list filter to avoid conflict?
            handleFilterChange(colId, []);
        } else {
            // Remove condition
            setFilterConditions(prev => {
                const { [colId]: _, ...rest } = prev;
                return rest;
            });

            // 2. Apply List Filter
            const allValues = getUniqueValues(colId);
            if (tempFilterSelection.size === allValues.length) {
                handleFilterChange(colId, []);
            } else {
                handleFilterChange(colId, Array.from(tempFilterSelection));
            }
        }
        setActiveMenuCol(null);
    };

    // Dismiss Context Menu
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Dismiss Dropdown Menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuCol(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // --- Input Masking Handlers ---
    const formatNumberDisplay = (value: string | number, localeOverride?: string, decimals = 2) => {
        if (!value && value !== 0) return '';
        const locale = localeOverride || localStorage.getItem('decimalFormat') || 'vi-VN';

        // Robust numeric parsing: remove all non-numeric chars except dot and comma
        // This is still a bit naive but better than just replacing comma
        const cleanValue = String(value).replace(/[^0-9.,-]/g, '');

        // Handle swap of . and , based on locale
        let num: number;
        if (locale === 'vi-VN') {
            // vi-VN: 1.234.567,89 -> change . to nothing and , to . for JS parseFloat
            num = parseFloat(cleanValue.replace(/\./g, '').replace(/,/g, '.'));
        } else {
            // en-US: 1,234,567.89 -> change , to nothing
            num = parseFloat(cleanValue.replace(/,/g, ''));
        }

        if (isNaN(num)) return String(value);
        return new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(num);
    };

    const isTraceable = (val: any): val is TraceableValue => {
        return val && typeof val === 'object' && 'value' in val && 'formula' in val;
    };

    const getRawValue = (rIdx: number, cIdx: number): any => {
        const row = tableRows[rIdx];
        const col = tableCols[cIdx];

        if (!row || !col) return '';

        // If both are Real -> Data Props
        if (row.type === 'real' && col.type === 'real') {
            return row.data?.[col.id] ?? '';
        }

        // Else -> Scratchpad
        const key = `${row.id}:${col.id}`;
        return scratchpadData[key] || '';
    };

    const getCellValue = (rIdx: number, cIdx: number): string => {
        const raw = getRawValue(rIdx, cIdx);
        if (isTraceable(raw)) return String(raw.value);
        return String(raw);
    };

    // --- Formula Engine ---
    const colLetterToIndex = (letter: string) => {
        let column = 0;
        const length = letter.length;
        for (let i = 0; i < length; i++) {
            column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
        }
        return column - 1;
    };

    const evaluateMathExpression = (expression: string): string => {
        type Token = { type: 'number' | 'operator' | 'paren'; value: number | string };
        const tokens: Token[] = [];
        const isOperator = (ch: string) => '+-*/%'.includes(ch);

        let i = 0;
        while (i < expression.length) {
            const ch = expression[i];
            if (/\s/.test(ch)) {
                i += 1;
                continue;
            }

            const prevToken = tokens.length ? tokens[tokens.length - 1] : null;
            const prevType = prevToken ? prevToken.type : 'start';
            const prevIsOpenParen = prevToken?.type === 'paren' && prevToken.value === '(';
            const nextIsUnary = (ch === '+' || ch === '-') && (prevType === 'operator' || prevType === 'start' || prevIsOpenParen);

            if (nextIsUnary || /\d|\./.test(ch)) {
                let numStr = '';
                if (nextIsUnary) {
                    numStr += ch;
                    i += 1;
                }
                while (i < expression.length && /[\d.]/.test(expression[i])) {
                    numStr += expression[i];
                    i += 1;
                }
                const value = Number.parseFloat(numStr);
                if (Number.isNaN(value)) return '#ERROR';
                tokens.push({ type: 'number', value });
                continue;
            }

            if (isOperator(ch)) {
                tokens.push({ type: 'operator', value: ch });
                i += 1;
                continue;
            }

            if (ch === '(' || ch === ')') {
                tokens.push({ type: 'paren', value: ch });
                i += 1;
                continue;
            }

            return '#ERROR';
        }

        const output: Token[] = [];
        const ops: Token[] = [];
        const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };

        for (const token of tokens) {
            if (token.type === 'number') {
                output.push(token);
                continue;
            }
            if (token.type === 'operator') {
                const op = token.value as string;
                while (ops.length) {
                    const top = ops[ops.length - 1];
                    if (top.type === 'operator' && precedence[top.value as string] >= precedence[op]) {
                        output.push(ops.pop() as Token);
                        continue;
                    }
                    break;
                }
                ops.push(token);
                continue;
            }
            if (token.value === '(') {
                ops.push(token);
                continue;
            }
            if (token.value === ')') {
                let foundParen = false;
                while (ops.length) {
                    const top = ops.pop() as Token;
                    if (top.type === 'paren' && top.value === '(') {
                        foundParen = true;
                        break;
                    }
                    output.push(top);
                }
                if (!foundParen) return '#ERROR';
            }
        }

        while (ops.length) {
            const top = ops.pop() as Token;
            if (top.type === 'paren') return '#ERROR';
            output.push(top);
        }

        const stack: number[] = [];
        for (const token of output) {
            if (token.type === 'number') {
                stack.push(token.value as number);
                continue;
            }
            if (stack.length < 2) return '#ERROR';
            const b = stack.pop() as number;
            const a = stack.pop() as number;
            const op = token.value as string;
            let result = 0;
            if (op === '+') result = a + b;
            else if (op === '-') result = a - b;
            else if (op === '*') result = a * b;
            else if (op === '/') {
                if (b === 0) return '#DIV/0!';
                result = a / b;
            } else if (op === '%') {
                if (b === 0) return '#DIV/0!';
                result = a % b;
            }
            stack.push(result);
        }

        if (stack.length !== 1 || !Number.isFinite(stack[0])) return '#ERROR';
        return String(stack[0]);
    };

    const evaluateFormulaWithRefs = (expression: string, currentIsReal: boolean): string => {
        let processedExp = expression.toUpperCase();

        // Regex for Cell Ref: ([A-Z]+)([0-9]+)
        processedExp = processedExp.replace(/([A-Z]+)([0-9]+)/g, (_, colStr, rowStr) => {
            const rIdx = parseInt(rowStr, 10) - 1; // 1-based -> 0-based
            const cIdx = colLetterToIndex(colStr); // Visual Index

            if (rIdx < 0 || cIdx < 0) return "#ERR";
            if (rIdx >= tableRows.length) return "#REF!";

            const targetCol = tableCols[cIdx];
            if (!targetCol) return "#REF!"; // Visual col out of bounds

            // Constraint: Real Cells cannot ref Draft Cells
            // "Draft Cell" here means a Draft COLUMN. (Row status generally ignored for formula safety, but could enforce too).
            if (currentIsReal && targetCol.type === 'draft') {
                return "#BLOCK!";
            }

            const valStr = getCellValue(rIdx, cIdx);

            if (valStr.startsWith('=')) return "0"; // No recursion for MVP
            return valStr === '' ? "0" : valStr;
        });

        // Evaluate Math
        try {
            if (/[^0-9+\-*/().\s%#]/.test(processedExp)) {
                return processedExp.includes('#') ? processedExp : "#ERR";
            }
            return evaluateMathExpression(processedExp);
        } catch {
            return "#ERROR";
        }
    };


    const setCellValue = (rIdx: number, cIdx: number, value: string) => {
        const row = tableRows[rIdx];
        const col = tableCols[cIdx];
        if (!row || !col) return;

        let nextValue = value;
        if (col.type === 'real' && col.def?.type === 'date') {
            nextValue = normalizeDateValue(value);
        }

        // Validation (Real Cols only)
        if (col.type === 'real' && col.def) {
            const error = validateValue(nextValue, col.def);
            const key = `ERR-${row.id}-${col.id}`; // Error Key

            setCellErrors(prev => {
                if (error) return { ...prev, [key]: error };
                const { [key]: _, ...rest } = prev;
                return rest;
            });
        }

        // Write Logic
        if (row.type === 'real' && col.type === 'real' && onCellChange) {
            onCellChange(row.id, col.id, nextValue);
        } else {
            // Scratchpad
            const key = `${row.id}:${col.id}`;
            setScratchpadData(prev => ({ ...prev, [key]: nextValue }));
        }
    };

    const getCellDisplayValue = (rIdx: number, cIdx: number) => {
        const col = tableCols[cIdx];
        const raw = getCellValue(rIdx, cIdx);

        if (raw.startsWith('=')) {
            const isReal = tableRows[rIdx]?.type === 'real' && col?.type === 'real';
            return evaluateFormulaWithRefs(raw.substring(1), isReal);
        }

        // Auto-format numbers for display
        if (col.type === 'real' && col.def && (col.def.type === 'number' || col.def.numberFormat)) {
            return formatNumberDisplay(raw);
        }

        // Auto-format dates for display
        if (col.type === 'real' && col.def?.type === 'date') {
            return formatDateVN(raw);
        }

        return raw;
    };

    // --- Wrappers for Input Masks ---
    const handleDateChange = (rIdx: number, cIdx: number, rawValue: string) => {
        const digits = rawValue.replace(/\D/g, '');
        let formatted = digits;
        if (digits.length >= 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
        if (digits.length >= 4) formatted = formatted.slice(0, 5) + '/' + digits.slice(4, 8);
        if (formatted.length > 10) formatted = formatted.slice(0, 10);
        setCellValue(rIdx, cIdx, formatted);
    };

    const handleNumberBlur = (rIdx: number, cIdx: number, value: string) => {
        // Re-format on blur to ensure consistency
        const formatted = formatNumberDisplay(value);
        // Avoid cycle if identical?
        if (formatted !== value) setCellValue(rIdx, cIdx, formatted);
    };

    // --- Keyboard Navigation ---
    const handleKeyDown = (e: React.KeyboardEvent, rIdx: number, cIdx: number) => {
        if (!['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        e.preventDefault();

        let newRIdx = rIdx;
        let newCIdx = cIdx;

        switch (e.key) {
            case 'Enter':
                newRIdx = rIdx + 1;
                newCIdx = 0; // Carriage return
                break;
            case 'ArrowDown':
                newRIdx = rIdx + 1;
                break;
            case 'ArrowUp':
                newRIdx = rIdx - 1;
                break;
            case 'Tab':
            case 'ArrowRight':
                newCIdx = cIdx + 1;
                break;
            case 'ArrowLeft':
                newCIdx = cIdx - 1;
                break;
        }

        // Boundary Checks
        if (newRIdx >= 0 && newRIdx < tableRows.length && newCIdx >= 0 && newCIdx < tableCols.length) {
            setSelectedPos({ rIdx: newRIdx, cIdx: newCIdx });
        }
    };

    // Number Key Down
    const handleNumberKeyDown = (e: React.KeyboardEvent) => {
        // Allow: Backspace, Delete, Tab, Escape, Enter, Arrows
        if ([46, 8, 9, 27, 13, 110, 190, 188, 189, 109].includes(e.keyCode) ||
            (e.ctrlKey === true && [65, 67, 86, 88].includes(e.keyCode)) ||
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    };

    const handleContainerContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // Append at end if clicked outside cells logic?
        // Let's just default to end
        setContextMenu({ x: e.clientX, y: e.clientY, rIdx: tableRows.length, cIdx: tableCols.length });
    };

    const handleContextMenu = (e: React.MouseEvent, rIdx: number, cIdx: number) => {
        e.preventDefault();
        e.stopPropagation(); // Stop propagation to prevent container override
        setContextMenu({ x: e.clientX, y: e.clientY, rIdx, cIdx });
    };

    // Traceability Display Logic
    const rawSelectedValue = selectedPos ? getRawValue(selectedPos.rIdx, selectedPos.cIdx) : null;
    const isSelectedTraceable = isTraceable(rawSelectedValue);

    const selectedValue = selectedPos ? getCellDisplayValue(selectedPos.rIdx, selectedPos.cIdx) : '';
    const selectedLabel = selectedPos ? `${getColumnLabel(selectedPos.cIdx)}${selectedPos.rIdx + 1}` : '';


    if (loading) return <div className="p-4 text-center">Loading...</div>;
    if (tableRows.length === 0) {
        return <div className="p-4 text-center text-slate-500 italic">{emptyMessage}</div>;
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 h-full relative">
            {/* Formula Bar */}
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 border-b border-border-light dark:border-border-dark shrink-0">
                <div className="w-10 text-center font-bold text-slate-500 text-xs shrink-0 select-none">
                    {selectedLabel || 'Fx'}
                </div>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <div className="font-serif text-slate-400 font-bold italic select-none">fx</div>

                {/* Enhanced Input Area */}
                <div className="flex-1 flex items-center relative gap-1">
                    <input
                        className={`flex-1 min-w-0 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSelectedTraceable ? 'text-blue-600 font-bold' : ''}`}
                        placeholder="Chọn ô để nhập giá trị hoặc công thức..."
                        disabled={!selectedPos || isSelectedTraceable} // Make traceable read-only for now
                        value={isSelectedTraceable ? `=${rawSelectedValue.formula}` : selectedValue}
                        onChange={(e) => selectedPos && setCellValue(selectedPos.rIdx, selectedPos.cIdx, e.target.value)}
                    />

                    {/* Traceability Action */}
                    {isSelectedTraceable && rawSelectedValue.source && (
                        <button
                            className="absolute right-1 top-0.5 bottom-0.5 px-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md text-xs font-bold flex items-center gap-1 hover:bg-blue-200"
                            onClick={() => {
                                if (rawSelectedValue.source?.type === 'link') {
                                    window.location.hash = rawSelectedValue.source.target; // Simple hash nav for now, user can improve to router later
                                } else {
                                    alert("Modal source not implemented yet");
                                }
                            }}
                            title={`Đi đến nguồn: ${rawSelectedValue.source.label || 'Chi tiết'}`}
                        >
                            <span className="material-symbols-outlined text-[14px]">troubleshoot</span>
                            Truy vết
                        </button>
                    )}
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 overflow-auto relative" onContextMenu={handleContainerContextMenu}>
                <table className="w-full border-collapse text-sm min-w-max">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-sm">
                        <tr>
                            <th className="w-10 border-r border-b border-border-light dark:border-border-dark bg-slate-100 dark:bg-slate-700"></th>
                            {tableCols.map((col, cIdx) => (
                                <th
                                    key={col.id}
                                    className={`first-letter:border-r border-b border-border-light dark:border-border-dark px-2 py-2 font-semibold whitespace-nowrap 
                                        ${col.type === 'draft' ? 'bg-orange-50 dark:bg-orange-900/20 text-slate-500 w-24 text-center min-w-[80px]' :
                                            `bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ${col.def?.width || 'w-32'}`}
                                        relative group text-center`} // Force text-center for headers
                                    onContextMenu={(e) => handleContextMenu(e, -1, cIdx)} // Row -1 = Header, but triggering col insert
                                >
                                    <div className="flex items-center justify-center gap-1 w-full"> {/* justify-center */}
                                        <div className="flex flex-col items-center leading-none w-full"> {/* items-center */}
                                            <span className="text-[10px] text-slate-400 font-normal text-center w-full block">{getColumnLabel(cIdx)}</span>
                                            <span>{col.type === 'real' ? col.def?.headerName : ''}</span>
                                        </div>
                                        {/* Filter/Sort Trigger for Real Cols */}
                                        {col.type === 'real' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); activeMenuCol === col.id ? setActiveMenuCol(null) : handleMenuOpen(col.id); }}
                                                className={`absolute right-1 top-2 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${activeMenuCol === col.id || filters[col.id] || filterConditions[col.id] ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {filters[col.id] || filterConditions[col.id] ? 'filter_alt' : 'arrow_drop_down'}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                    {/* Sort & Filter Menu - Excel Style */}
                                    {activeMenuCol === col.id && (
                                        <div ref={menuRef} className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-md shadow-2xl border border-slate-200 dark:border-slate-700 z-50 text-left font-normal flex flex-col max-h-[400px]">
                                            <div className="p-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
                                                <button onClick={() => handleSort(col.id, 'asc')} className="flex items-center w-full px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group/item">
                                                    <span className="material-symbols-outlined text-[18px] mr-2 text-slate-400 group-hover/item:text-blue-600">arrow_upward</span>
                                                    Sắp xếp A-Z
                                                </button>
                                                <button onClick={() => handleSort(col.id, 'desc')} className="flex items-center w-full px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group/item">
                                                    <span className="material-symbols-outlined text-[18px] mr-2 text-slate-400 group-hover/item:text-blue-600">arrow_downward</span>
                                                    Sắp xếp Z-A
                                                </button>
                                                {sortConfig?.key === col.id && (
                                                    <button onClick={() => { setSortConfig(null); setActiveMenuCol(null); }} className="flex items-center w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded mt-1">
                                                        <span className="material-symbols-outlined text-[18px] mr-2">close</span>
                                                        Bỏ sắp xếp
                                                    </button>
                                                )}
                                            </div>

                                            {/* Conditional Filter Section */}
                                            <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                                                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Lọc theo điều kiện</div>
                                                <div className="flex gap-2 mb-2">
                                                    <select
                                                        className="w-1/2 text-xs border border-slate-300 dark:border-slate-600 rounded p-1 bg-white dark:bg-slate-700 focus:ring-1 focus:ring-blue-500"
                                                        value={tempCondition?.operator || (col.def?.type === 'number' ? 'gt' : 'contains')}
                                                        onChange={(e) => setTempCondition(prev => ({ operator: e.target.value, value: prev?.value || '' }))}
                                                    >
                                                        {col.def?.type === 'number' ? (
                                                            <>
                                                                <option value="gt">Lớn hơn (&gt;)</option>
                                                                <option value="gte">Lớn hơn hoặc bằng (&ge;)</option>
                                                                <option value="lt">Nhỏ hơn (&lt;)</option>
                                                                <option value="lte">Nhỏ hơn hoặc bằng (&le;)</option>
                                                                <option value="eq">Bằng (=)</option>
                                                                <option value="neq">Khác (!=)</option>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <option value="contains">Chứa</option>
                                                                <option value="starts">Bắt đầu bằng</option>
                                                                <option value="ends">Kết thúc bằng</option>
                                                                <option value="eq">Bằng</option>
                                                            </>
                                                        )}
                                                    </select>
                                                    <input
                                                        type={col.def?.type === 'number' ? 'number' : 'text'}
                                                        className="w-1/2 text-xs border border-slate-300 dark:border-slate-600 rounded p-1 bg-white dark:bg-slate-700 focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Giá trị..."
                                                        value={tempCondition?.value || ''}
                                                        onChange={(e) => setTempCondition(prev => ({ operator: prev?.operator || (col.def?.type === 'number' ? 'gt' : 'contains'), value: e.target.value }))}
                                                    />
                                                </div>
                                            </div>

                                            {/* Search Box */}
                                            <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-2 top-1.5 text-slate-400 text-[18px]">search</span>
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Tìm kiếm..."
                                                        value={filterSearchTerm}
                                                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Checkbox List */}
                                            <div className="flex-1 overflow-y-auto p-2 min-h-[150px] custom-scrollbar">
                                                {(() => {
                                                    const allValues = getUniqueValues(col.id);
                                                    const visibleValues = allValues.filter(v => v.toLowerCase().includes(filterSearchTerm.toLowerCase()));
                                                    const allVisibleSelected = visibleValues.every(v => tempFilterSelection.has(v)) && visibleValues.length > 0;

                                                    return (
                                                        <div className="space-y-1">
                                                            <div
                                                                className="flex items-center px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer select-none"
                                                                onClick={() => handleSelectAll(allValues, filterSearchTerm)}
                                                            >
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${allVisibleSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'}`}>
                                                                    {allVisibleSelected && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
                                                                </div>
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                    (Chọn tất cả)
                                                                </span>
                                                            </div>

                                                            {visibleValues.map(val => (
                                                                <div
                                                                    key={val}
                                                                    className="flex items-center px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer select-none"
                                                                    onClick={() => toggleFilterItem(val)}
                                                                >
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 shrink-0 transition-colors ${tempFilterSelection.has(val) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'}`}>
                                                                        {tempFilterSelection.has(val) && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
                                                                    </div>
                                                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate" title={val || '(Trống)'}>
                                                                        {val === '' ? <span className="italic text-slate-400"> (Trống) </span> : val}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {visibleValues.length === 0 && (
                                                                <div className="text-center py-4 text-xs text-slate-400 italic">
                                                                    Không tìm thấy kết quả
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between gap-2 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        handleFilterChange(col.id, []);
                                                        setFilterConditions(prev => { const { [col.id]: _, ...rest } = prev; return rest; });
                                                        setActiveMenuCol(null);
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                                >
                                                    Xóa lọc
                                                </button>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setActiveMenuCol(null)}
                                                        className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded"
                                                    >
                                                        Hủy
                                                    </button>
                                                    <button
                                                        onClick={() => applyFilter(col.id)}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm"
                                                    >
                                                        Áp dụng
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-300">
                        {tableRows.map((row, rIdx) => {
                            const rowClass = (row.type === 'real' && row.data && getRowClassName) ? getRowClassName(row.data) : '';
                            const isRowSelected = row.type === 'real' && selectedRow && row.data && (row.data[keyField] === selectedRow[keyField]);

                            return (
                                <tr
                                    key={row.id}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800 group ${rowClass} ${isRowSelected ? '!bg-blue-50 dark:!bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800' : ''}`}
                                >
                                    {/* Row Header */}
                                    <td
                                        className="border-r border-b border-border-light dark:border-border-dark text-center text-xs text-slate-400 font-medium bg-slate-50 dark:bg-slate-900 sticky left-0 group-hover:font-bold"
                                        onContextMenu={(e) => handleContextMenu(e, rIdx, -1)}
                                    >
                                        {/* If Draft and Valid -> Commit Button. Else Index */}
                                        {row.type === 'draft' && isDraftRowValid(rIdx) && onRowCommit ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleCommitRow(rIdx); }}
                                                className="w-full h-full flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
                                                title="Lưu dòng này"
                                            ><span className="material-symbols-outlined text-[16px]">check</span></button>
                                        ) : (
                                            /* Using visual index rIdx + 1 */
                                            rIdx + 1
                                        )}
                                    </td>
                                    {tableCols.map((col, cIdx) => {
                                        const isSelected = selectedPos?.rIdx === rIdx && selectedPos.cIdx === cIdx;
                                        const errorKey = `ERR-${row.id}-${col.id}`;
                                        const errorMsg = cellErrors[errorKey];
                                        const displayVal = getCellDisplayValue(rIdx, cIdx);

                                        // Styling
                                        let cellClass = "border-r border-b border-border-light dark:border-border-dark p-0 relative ";
                                        if (col.type === 'draft') cellClass += "bg-orange-50/30 dark:bg-orange-900/10 ";
                                        else if (row.type === 'draft') cellClass += "bg-slate-100/50 dark:bg-slate-800/50 italic "; // Draft row in real col

                                        // Alignment Logic: Default to Left. If Number -> Right. override if explicit align set.
                                        let align = col.def?.align;
                                        if (!align && col.def?.type === 'number') align = 'right';

                                        const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
                                        // cellClass += alignClass; // Removed from td

                                        if (isSelected) cellClass += " ring-2 ring-green-500 z-10";
                                        if (errorMsg) cellClass += " bg-red-50 dark:bg-red-900/20";

                                        return (
                                            <td
                                                key={col.id}
                                                onClick={() => setSelectedPos({ rIdx, cIdx })}
                                                onDoubleClick={() => {
                                                    const raw = getRawValue(rIdx, cIdx);
                                                    if (isTraceable(raw) && raw.source?.type === 'link') {
                                                        window.location.hash = raw.source.target;
                                                    } else if (row.type === 'real' && onRowDoubleClick) {
                                                        onRowDoubleClick(row.data);
                                                    }
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, rIdx, cIdx)}
                                                className={`${cellClass} ${isTraceable(getRawValue(rIdx, cIdx)) ? 'cursor-alias' : ''}`}
                                                title={errorMsg || (isTraceable(getRawValue(rIdx, cIdx)) ? 'Double-click để xem nguồn' : undefined)}
                                            >
                                                {errorMsg && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl triangle-error z-20"></div>}
                                                {isSelected ? (
                                                    <input
                                                        ref={(el) => { if (isSelected) el?.focus(); }}
                                                        readOnly={
                                                            !!(String(displayVal).startsWith('=') ||
                                                                (lockedUntil && row.type === 'real' && row.data?.[dateField] <= lockedUntil))
                                                        }
                                                        className={`w-full h-full px-2 py-1.5 bg-transparent border-none focus:outline-none text-sm ${alignClass} 
                                                            ${col.type === 'draft' || row.type === 'draft' ? 'font-mono text-slate-600 dark:text-slate-400' : ''}
                                                            ${col.def?.fontClass || ''}
                                                            ${errorMsg ? 'text-red-700 dark:text-red-300 font-medium' : ''}
                                                            ${lockedUntil && row.type === 'real' && row.data?.[dateField] <= lockedUntil ? 'cursor-not-allowed opacity-60' : ''}`}
                                                        value={displayVal}
                                                        onChange={(e) => {
                                                            if (col.type === 'real' && col.def?.type === 'date') {
                                                                handleDateChange(rIdx, cIdx, e.target.value);
                                                            } else {
                                                                setCellValue(rIdx, cIdx, e.target.value);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            handleKeyDown(e, rIdx, cIdx);
                                                            if (col.type === 'real' && col.def?.type === 'number') handleNumberKeyDown(e);
                                                        }}
                                                        onBlur={() => {
                                                            if (col.type === 'real' && col.def?.type === 'number') {
                                                                handleNumberBlur(rIdx, cIdx, displayVal);
                                                            }
                                                        }}
                                                        placeholder={col.type === 'real' && col.def?.type === 'date' ? 'DD/MM/YYYY' : ''}
                                                    />
                                                ) : (
                                                    <div className={`w-full h-full px-2 py-1.5 text-sm ${alignClass} truncate ${col.def?.fontClass || ''} ${col.type === 'draft' || row.type === 'draft' ? 'font-mono text-slate-600 dark:text-slate-400' : ''}`}>
                                                        {col.def?.renderCell && row.type === 'real' ? col.def.renderCell(getCellValue(rIdx, cIdx), row.data) : displayVal}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                    {showTotalRow && (
                        <tfoot className="sticky bottom-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t-2 border-slate-200 dark:border-slate-700">
                            {/* Filtered Total Row - Only show if filters are active */}
                            {Object.keys(filters).some(k => filters[k]) && (
                                <tr className="font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-900/20">
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center text-xs uppercase sticky left-0 bg-blue-50/50 dark:bg-blue-900/20 z-10">Tổng (Lọc)</td>
                                    {tableCols.map((col) => {
                                        if (col.type !== 'real' || !col.def || col.def.type !== 'number') {
                                            return <td key={col.id} className="border-r border-slate-200 dark:border-slate-700"></td>;
                                        }
                                        const total = tableRows
                                            .filter(r => r.type === 'real')
                                            .reduce((sum, r) => sum + (Number(r.data?.[col.id]) || 0), 0);

                                        const align = col.def.align === 'center' ? 'text-center' : col.def.align === 'left' ? 'text-left' : 'text-right';

                                        return (
                                            <td key={col.id} className={`p-2 border-r border-slate-200 dark:border-slate-700 ${align} font-mono text-xs`}>
                                                {formatNumberDisplay(total)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )}

                            {/* Grand Total Row */}
                            <tr className="font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900">
                                <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center text-xs uppercase sticky left-0 bg-slate-100 dark:bg-slate-900 z-10">Tổng chung</td>
                                {tableCols.map((col) => {
                                    if (col.type !== 'real' || !col.def || col.def.type !== 'number') {
                                        return <td key={col.id} className="border-r border-slate-200 dark:border-slate-700"></td>;
                                    }
                                    const total = data.reduce((sum, item) => sum + (Number(item[col.id]) || 0), 0);

                                    const align = col.def.align === 'center' ? 'text-center' : col.def.align === 'left' ? 'text-left' : 'text-right';

                                    return (
                                        <td key={col.id} className={`p-2 border-r border-slate-200 dark:border-slate-700 ${align} font-mono text-xs`}>
                                            {formatNumberDisplay(total)}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    )}
                </table>
                {showAddButton && (
                    <button
                        onClick={() => handleInsertRow(tableRows.length)}
                        className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-30 transition-transform hover:scale-110 flex items-center justify-center"
                        title="Thêm dòng mới"
                    >
                        <span className="material-symbols-outlined text-2xl">add</span>
                    </button>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg py-1 z-50 min-w-[200px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 mb-1">
                        Dòng {contextMenu.rIdx + 1}, Cột {getColumnLabel(contextMenu.cIdx)}
                    </div>
                    {/* Custom Items */}
                    {contextMenuItems && contextMenuItems.length > 0 && (
                        <>
                            {contextMenuItems.map((item, idx) => {
                                const row = tableRows[contextMenu.rIdx];
                                const isDisabled = item.checkDisabled ? item.checkDisabled(row ? row.data : null) : false;
                                return (
                                    <button
                                        key={idx}
                                        className={`w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={() => {
                                            if (isDisabled) return;
                                            item.action(row ? row.data : null, tableCols[contextMenu.cIdx]?.id);
                                            setContextMenu(null);
                                        }}
                                        disabled={isDisabled}
                                    >
                                        {item.icon && <span className="material-symbols-outlined text-[18px]">{item.icon}</span>}
                                        {item.label}
                                    </button>
                                );
                            })}
                            <hr className="my-1 border-slate-100 dark:border-slate-700" />
                        </>
                    )}
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2"
                        onClick={() => handleInsertRow(contextMenu.rIdx)}
                    >
                        <span className="material-symbols-outlined text-[18px]">add_row_above</span> Chèn dòng nháp (Trên)
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2"
                        onClick={() => handleInsertRow(contextMenu.rIdx + 1)}
                    >
                        <span className="material-symbols-outlined text-[18px]">add_row_below</span> Chèn dòng nháp (Dưới)
                    </button>
                    <hr className="my-1 border-slate-100 dark:border-slate-700" />
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2"
                        onClick={() => handleInsertCol(contextMenu.cIdx)}
                    >
                        <span className="material-symbols-outlined text-[18px]">add_column_left</span> Chèn cột nháp (Trái)
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2"
                        onClick={() => handleInsertCol(contextMenu.cIdx + 1)}
                    >
                        <span className="material-symbols-outlined text-[18px]">add_column_right</span> Chèn cột nháp (Phải)
                    </button>
                </div>
            )}
        </div>
    );
};
