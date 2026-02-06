import React, { useState, useRef, useEffect } from 'react';
import { formatDateVN, normalizeDateValue } from '../utils/dateUtils';

// Interfaces for props
export interface ColumnDef {
    field: string;
    headerName: string;
    width?: string;
    minWidth?: string; // Minimum width for column
    align?: 'left' | 'center' | 'right';
    renderCell?: (value: any, row: any, rowIndex?: number) => React.ReactNode;
    renderHeader?: () => React.ReactNode; // Custom header renderer
    editable?: boolean;
    type?: 'text' | 'number' | 'select' | 'date' | 'actions'; // Added 'actions' for action buttons
    selectOptions?: { value: string; label: string }[];
    dataListId?: string;
    validator?: (value: any) => string | null; // Custom validator
    numberFormat?: { locale?: string; decimals?: number }; // Optional config for numbers
    fontClass?: string; // CSS classes for font styling
    cellClassName?: string | ((value: any, row: any) => string); // Custom cell class
    sortable?: boolean; // Enable/disable sorting for this column (default: true)
    filterable?: boolean; // Enable/disable filtering for this column (default: true)
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
    // Display modes
    readOnly?: boolean; // If true, disable all editing - display only mode
    compact?: boolean; // Compact mode with smaller padding
    showFormulaBar?: boolean; // Show/hide formula bar (default: true in edit mode, false in readOnly)
    showStatusBar?: boolean; // Show/hide status bar (default: true)
    showRowNumbers?: boolean; // Show/hide row number column (default: true)
    stickyHeader?: boolean; // Make header sticky (default: true)
    striped?: boolean; // Alternate row colors (default: false)
    bordered?: boolean; // Show cell borders (default: true)
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
    onRowClick,
    // New display options
    readOnly = false,
    compact = false,
    showFormulaBar,
    showStatusBar = true,
    showRowNumbers = true,
    stickyHeader = true,
    striped = false,
    bordered = true
}) => {
    // Determine if formula bar should show (default: true if editable, false if readOnly)
    const shouldShowFormulaBar = showFormulaBar ?? !readOnly;
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
    const [activeCell, setActiveCell] = useState<{ rIdx: number, cIdx: number } | null>(null);
    const [selectionRanges, setSelectionRanges] = useState<{ start: { rIdx: number, cIdx: number }, end: { rIdx: number, cIdx: number } }[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [cellErrors, setCellErrors] = useState<Record<string, string>>({});

    // Excel-like: Edit mode (F2 to toggle)
    const [isEditMode, setIsEditMode] = useState(false);

    // Excel-like: Column widths for resize
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [resizingCol, setResizingCol] = useState<{ colId: string; startX: number; startWidth: number } | null>(null);

    // Excel-like: Clipboard
    const [clipboard, setClipboard] = useState<{ data: string[][]; startCell: { rIdx: number; cIdx: number } } | null>(null);

    // Excel-like: Name Box input
    const [nameBoxValue, setNameBoxValue] = useState('');

    // Excel-like: Drag-Fill (kéo góc ô để copy/fill)
    const [isFillDragging, setIsFillDragging] = useState(false);
    const [fillPreviewRange, setFillPreviewRange] = useState<{ start: { rIdx: number, cIdx: number }, end: { rIdx: number, cIdx: number } } | null>(null);
    const [pendingFillRange, setPendingFillRange] = useState<{ start: { rIdx: number, cIdx: number }, end: { rIdx: number, cIdx: number } } | null>(null);

    // Trigger onSelectionChange when activeCell updates
    useEffect(() => {
        const handler = onRowClick || onSelectionChange;
        if (!handler) return;
        if (activeCell) {
            const row = tableRows[activeCell.rIdx];
            handler(row?.type === 'real' ? row.data : null);
        } else {
            handler(null);
        }
    }, [activeCell, tableRows, onRowClick, onSelectionChange]);

    // Global Mouse Up Config
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            // Queue fill execution if was fill-dragging (will be processed by separate effect)
            if (isFillDragging && fillPreviewRange) {
                setPendingFillRange(fillPreviewRange);
            }
            setIsDragging(false);
            setIsFillDragging(false);
            setFillPreviewRange(null);
            setResizingCol(null);
        };
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (resizingCol) {
                const diff = e.clientX - resizingCol.startX;
                const newWidth = Math.max(50, resizingCol.startWidth + diff);
                setColumnWidths(prev => ({ ...prev, [resizingCol.colId]: newWidth }));
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [resizingCol, isFillDragging, fillPreviewRange]);

    // Update nameBox when activeCell changes
    useEffect(() => {
        if (activeCell) {
            setNameBoxValue(`${getColumnLabel(activeCell.cIdx)}${activeCell.rIdx + 1}`);
        } else {
            setNameBoxValue('');
        }
    }, [activeCell]);

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

    // --- Selection Handlers ---
    // --- Selection Handlers ---
    const handleCellMouseDown = (rIdx: number, cIdx: number, e: React.MouseEvent) => {
        if (e.button !== 0) return; // Right click handled by ContextMenu
        const pos = { rIdx, cIdx };
        setIsDragging(true);
        setActiveCell(pos);

        if (e.ctrlKey || e.metaKey) {
            // Add new range
            setSelectionRanges(prev => [...prev, { start: pos, end: pos }]);
        } else if (e.shiftKey) {
            // Extend the last range
            setSelectionRanges(prev => {
                if (prev.length === 0) return [{ start: activeCell || pos, end: pos }];
                const next = [...prev];
                const lastIdx = next.length - 1;
                // Keep 'start', update 'end'
                next[lastIdx] = { ...next[lastIdx], end: pos };
                return next;
            });
        } else {
            // Reset to single range
            setSelectionRanges([{ start: pos, end: pos }]);
        }
    };

    const handleCellMouseEnter = (rIdx: number, cIdx: number) => {
        // Handle fill dragging
        if (isFillDragging) {
            handleFillMouseMove(rIdx, cIdx);
            return;
        }

        if (isDragging) {
            setSelectionRanges(prev => {
                if (prev.length === 0) return prev;
                const next = [...prev];
                const lastIdx = next.length - 1;
                next[lastIdx] = { ...next[lastIdx], end: { rIdx, cIdx } };
                return next;
            });
        }
    };

    const handleColumnHeaderClick = (cIdx: number, e?: React.MouseEvent) => {
        if (tableRows.length === 0) return;
        const start = { rIdx: 0, cIdx };
        const end = { rIdx: tableRows.length - 1, cIdx };
        const newRange = { start, end };
        setActiveCell(start);

        if (e?.ctrlKey || e?.metaKey) {
            setSelectionRanges(prev => [...prev, newRange]);
        } else {
            setSelectionRanges([newRange]);
        }
    };

    const getSelectionStats = () => {
        if (selectionRanges.length === 0) return null;

        let sum = 0;
        let count = 0;
        let numCount = 0;
        const visited = new Set<string>();

        selectionRanges.forEach(range => {
            const rStart = Math.min(range.start.rIdx, range.end.rIdx);
            const rEnd = Math.max(range.start.rIdx, range.end.rIdx);
            const cStart = Math.min(range.start.cIdx, range.end.cIdx);
            const cEnd = Math.max(range.start.cIdx, range.end.cIdx);

            for (let r = rStart; r <= rEnd; r++) {
                for (let c = cStart; c <= cEnd; c++) {
                    const key = `${r}-${c}`;
                    if (visited.has(key)) continue;
                    visited.add(key);

                    const val = getCellValue(r, c);
                    if (val !== null && val !== undefined && val !== '') {
                        count++;
                        const num = parseNumericValue(val);
                        // Strict check for numeric string to avoid summing dates/texts that might parse partly
                        const isNumericType = !isNaN(parseFloat(String(val).replace(/[^0-9.-]/g, '')));
                        if (isNumericType) {
                            sum += num;
                            numCount++;
                        }
                    }
                }
            }
        });

        // If only 1 cell selected total, hide stats usually? Or show?
        // Excel shows count: 1. Let's show if count > 0.
        if (count <= 1) return null;

        return { sum, count, numCount, average: numCount ? sum / numCount : 0 };
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
        if (value === null || value === undefined || value === '') return '';
        const locale = localeOverride || localStorage.getItem('decimalFormat') || 'vi-VN';

        let num: number;
        if (typeof value === 'number') {
            num = value;
        } else {
            const str = String(value).trim();
            if (!str) return '';

            // Robust numeric parsing: remove all non-numeric chars except dot and comma
            const cleanValue = str.replace(/[^0-9.,-]/g, '');

            // Handle swap of . and , based on locale
            if (locale === 'vi-VN') {
                // If it has a comma, it's definitely using VN decimal format
                if (cleanValue.includes(',')) {
                    num = parseFloat(cleanValue.replace(/\./g, '').replace(/,/g, '.'));
                } else {
                    // No comma. Dots are tricky. If dotCount > 1, they are thousands.
                    // If dotCount == 1, it could be decimal from backend. 
                    const dotCount = (cleanValue.match(/\./g) || []).length;
                    if (dotCount > 1) {
                        num = parseFloat(cleanValue.replace(/\./g, ''));
                    } else {
                        // One dot or no dot -> use standard parseFloat
                        num = parseFloat(cleanValue);
                    }
                }
            } else {
                // en-US: 1,234,567.89 -> change , to nothing
                num = parseFloat(cleanValue.replace(/,/g, ''));
            }
        }

        if (isNaN(num) || !isFinite(num)) return String(value);
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
        }).format(num);
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

    // Robust number parsing with float detection (Component Level Helper)
    const parseNumericValue = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;

        // Unwrap TraceableValue if needed
        const raw = (val && typeof val === 'object' && 'value' in val) ? val.value : val;

        if (typeof raw === 'number') return isFinite(raw) ? raw : 0;

        const str = String(raw).trim();
        if (!str) return 0;

        const locale = localStorage.getItem('decimalFormat') || 'vi-VN';
        const cleanValue = str.replace(/[^0-9.,-]/g, '');

        if (locale === 'vi-VN') {
            if (cleanValue.includes(',')) {
                // Has comma -> VN format (1.234,56)
                const num = parseFloat(cleanValue.replace(/\./g, '').replace(/,/g, '.'));
                return isFinite(num) ? num : 0;
            } else {
                // No comma. If more than 1 dot, they are thousands separators.
                const dotCount = (cleanValue.match(/\./g) || []).length;
                if (dotCount > 1) {
                    const num = parseFloat(cleanValue.replace(/\./g, ''));
                    return isFinite(num) ? num : 0;
                } else if (dotCount === 1) {
                    // Single dot. Ambiguity: "125.000" (125k) vs "125.000" (from backend 125.00)
                    // Heuristic: If it has 3 decimal places, it's likely a thousand separator in VI context.
                    // HOWEVER, backend floats often have trailing zeros.
                    // Let's check the length after the dot. 
                    const parts = cleanValue.split('.');
                    if (parts[1].length === 3 && parseInt(parts[0]) !== 0) {
                        // Likely 125.000 -> 125000
                        const numValue = parseFloat(cleanValue.replace(/\./g, ''));
                        return isFinite(numValue) ? numValue : 0;
                    }
                    // Default to standard float
                    const num = parseFloat(cleanValue);
                    return isFinite(num) ? num : 0;
                } else {
                    const num = parseFloat(cleanValue);
                    return isFinite(num) ? num : 0;
                }
            }
        } else {
            const num = parseFloat(cleanValue.replace(/,/g, ''));
            return isFinite(num) ? num : 0;
        }
    };
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

    // --- Excel-like Copy/Paste ---
    const handleCopy = () => {
        if (selectionRanges.length === 0 || !activeCell) return;

        const range = selectionRanges[selectionRanges.length - 1];
        const rMin = Math.min(range.start.rIdx, range.end.rIdx);
        const rMax = Math.max(range.start.rIdx, range.end.rIdx);
        const cMin = Math.min(range.start.cIdx, range.end.cIdx);
        const cMax = Math.max(range.start.cIdx, range.end.cIdx);

        const data: string[][] = [];
        for (let r = rMin; r <= rMax; r++) {
            const rowData: string[] = [];
            for (let c = cMin; c <= cMax; c++) {
                rowData.push(getCellValue(r, c));
            }
            data.push(rowData);
        }

        setClipboard({ data, startCell: { rIdx: rMin, cIdx: cMin } });

        // Also copy to system clipboard
        const textData = data.map(row => row.join('\t')).join('\n');
        navigator.clipboard.writeText(textData).catch(() => { });
    };

    const handlePaste = async () => {
        if (!activeCell) return;

        try {
            const text = await navigator.clipboard.readText();
            const rows = text.split('\n').map(row => row.split('\t'));

            rows.forEach((rowData, rOffset) => {
                rowData.forEach((value, cOffset) => {
                    const targetR = activeCell.rIdx + rOffset;
                    const targetC = activeCell.cIdx + cOffset;
                    if (targetR < tableRows.length && targetC < tableCols.length) {
                        setCellValue(targetR, targetC, value);
                    }
                });
            });
        } catch {
            // Fallback to internal clipboard
            if (clipboard) {
                clipboard.data.forEach((rowData, rOffset) => {
                    rowData.forEach((value, cOffset) => {
                        const targetR = activeCell.rIdx + rOffset;
                        const targetC = activeCell.cIdx + cOffset;
                        if (targetR < tableRows.length && targetC < tableCols.length) {
                            setCellValue(targetR, targetC, value);
                        }
                    });
                });
            }
        }
    };

    const handleDelete = () => {
        if (selectionRanges.length === 0) return;

        selectionRanges.forEach(range => {
            const rMin = Math.min(range.start.rIdx, range.end.rIdx);
            const rMax = Math.max(range.start.rIdx, range.end.rIdx);
            const cMin = Math.min(range.start.cIdx, range.end.cIdx);
            const cMax = Math.max(range.start.cIdx, range.end.cIdx);

            for (let r = rMin; r <= rMax; r++) {
                for (let c = cMin; c <= cMax; c++) {
                    setCellValue(r, c, '');
                }
            }
        });
    };

    // --- Excel-like Drag-Fill ---
    const getSelectionBounds = () => {
        if (selectionRanges.length === 0) return null;
        const range = selectionRanges[selectionRanges.length - 1];
        return {
            rMin: Math.min(range.start.rIdx, range.end.rIdx),
            rMax: Math.max(range.start.rIdx, range.end.rIdx),
            cMin: Math.min(range.start.cIdx, range.end.cIdx),
            cMax: Math.max(range.start.cIdx, range.end.cIdx),
        };
    };

    const handleFillHandleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (readOnly) return;
        setIsFillDragging(true);
        // Initialize fill preview to current selection
        const bounds = getSelectionBounds();
        if (bounds) {
            setFillPreviewRange({
                start: { rIdx: bounds.rMin, cIdx: bounds.cMin },
                end: { rIdx: bounds.rMax, cIdx: bounds.cMax }
            });
        }
    };

    const handleFillMouseMove = (rIdx: number, cIdx: number) => {
        if (!isFillDragging) return;
        const bounds = getSelectionBounds();
        if (!bounds) return;

        // Determine fill direction: extend rows (down/up) or columns (right/left)
        // Priority: vertical fill if moving vertically, horizontal if moving horizontally
        const rowDiff = Math.abs(rIdx - bounds.rMax);
        const colDiff = Math.abs(cIdx - bounds.cMax);

        if (rIdx > bounds.rMax || rIdx < bounds.rMin) {
            // Vertical fill (most common use case)
            setFillPreviewRange({
                start: { rIdx: Math.min(bounds.rMin, rIdx), cIdx: bounds.cMin },
                end: { rIdx: Math.max(bounds.rMax, rIdx), cIdx: bounds.cMax }
            });
        } else if (cIdx > bounds.cMax || cIdx < bounds.cMin) {
            // Horizontal fill
            setFillPreviewRange({
                start: { rIdx: bounds.rMin, cIdx: Math.min(bounds.cMin, cIdx) },
                end: { rIdx: bounds.rMax, cIdx: Math.max(bounds.cMax, cIdx) }
            });
        }
    };

    const detectFillPattern = (values: string[]): { type: 'copy' | 'number' | 'date'; step?: number } => {
        if (values.length === 0) return { type: 'copy' };

        // Check for number sequence
        const nums = values.map(v => parseNumericValue(v));
        if (values.length >= 2 && nums.every(n => !isNaN(n))) {
            const steps = [];
            for (let i = 1; i < nums.length; i++) {
                steps.push(nums[i] - nums[i - 1]);
            }
            // If all steps are the same, it's an arithmetic sequence
            if (steps.length > 0 && steps.every(s => s === steps[0])) {
                return { type: 'number', step: steps[0] };
            }
        }

        // Check for date sequence (DD/MM/YYYY format)
        const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const dates = values.map(v => {
            const match = v.match(dateRegex);
            if (match) {
                const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                return isNaN(d.getTime()) ? null : d;
            }
            return null;
        });

        if (values.length >= 2 && dates.every(d => d !== null)) {
            const daySteps = [];
            for (let i = 1; i < dates.length; i++) {
                const diffDays = Math.round((dates[i]!.getTime() - dates[i - 1]!.getTime()) / (1000 * 60 * 60 * 24));
                daySteps.push(diffDays);
            }
            if (daySteps.length > 0 && daySteps.every(s => s === daySteps[0])) {
                return { type: 'date', step: daySteps[0] };
            }
        }

        return { type: 'copy' };
    };

    const formatDateForFill = (date: Date): string => {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    };

    const executeFill = () => {
        if (!fillPreviewRange) return;
        const bounds = getSelectionBounds();
        if (!bounds) return;

        const { rMin: srcRMin, rMax: srcRMax, cMin: srcCMin, cMax: srcCMax } = bounds;
        const { start: fillStart, end: fillEnd } = fillPreviewRange;

        const fillRMin = Math.min(fillStart.rIdx, fillEnd.rIdx);
        const fillRMax = Math.max(fillStart.rIdx, fillEnd.rIdx);
        const fillCMin = Math.min(fillStart.cIdx, fillEnd.cIdx);
        const fillCMax = Math.max(fillStart.cIdx, fillEnd.cIdx);

        // Determine direction
        const isDownFill = fillRMax > srcRMax;
        const isUpFill = fillRMin < srcRMin;
        const isRightFill = fillCMax > srcCMax;
        const isLeftFill = fillCMin < srcCMin;

        if (isDownFill || isUpFill) {
            // Vertical fill - for each column in selection
            for (let c = srcCMin; c <= srcCMax; c++) {
                // Get source values for this column
                const sourceValues: string[] = [];
                for (let r = srcRMin; r <= srcRMax; r++) {
                    sourceValues.push(getCellValue(r, c));
                }

                const pattern = detectFillPattern(sourceValues);
                const srcLen = sourceValues.length;

                if (isDownFill) {
                    // Fill down
                    for (let r = srcRMax + 1; r <= fillRMax; r++) {
                        const offset = r - srcRMin;
                        let newValue: string;

                        if (pattern.type === 'number' && pattern.step !== undefined) {
                            const baseNum = parseNumericValue(sourceValues[srcLen - 1]);
                            const increment = (r - srcRMax) * pattern.step;
                            newValue = formatNumberDisplay(baseNum + increment);
                        } else if (pattern.type === 'date' && pattern.step !== undefined) {
                            const lastDateMatch = sourceValues[srcLen - 1].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                            if (lastDateMatch) {
                                const lastDate = new Date(parseInt(lastDateMatch[3]), parseInt(lastDateMatch[2]) - 1, parseInt(lastDateMatch[1]));
                                lastDate.setDate(lastDate.getDate() + (r - srcRMax) * pattern.step);
                                newValue = formatDateForFill(lastDate);
                            } else {
                                newValue = sourceValues[offset % srcLen];
                            }
                        } else {
                            // Copy pattern
                            newValue = sourceValues[offset % srcLen];
                        }

                        setCellValue(r, c, newValue);
                    }
                }

                if (isUpFill) {
                    // Fill up
                    for (let r = srcRMin - 1; r >= fillRMin; r--) {
                        const offset = srcRMin - r;
                        let newValue: string;

                        if (pattern.type === 'number' && pattern.step !== undefined) {
                            const baseNum = parseNumericValue(sourceValues[0]);
                            newValue = formatNumberDisplay(baseNum - offset * pattern.step);
                        } else if (pattern.type === 'date' && pattern.step !== undefined) {
                            const firstDateMatch = sourceValues[0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                            if (firstDateMatch) {
                                const firstDate = new Date(parseInt(firstDateMatch[3]), parseInt(firstDateMatch[2]) - 1, parseInt(firstDateMatch[1]));
                                firstDate.setDate(firstDate.getDate() - offset * pattern.step);
                                newValue = formatDateForFill(firstDate);
                            } else {
                                newValue = sourceValues[srcLen - 1 - ((offset - 1) % srcLen)];
                            }
                        } else {
                            newValue = sourceValues[srcLen - 1 - ((offset - 1) % srcLen)];
                        }

                        setCellValue(r, c, newValue);
                    }
                }
            }
        }

        if (isRightFill || isLeftFill) {
            // Horizontal fill - for each row in selection
            for (let r = srcRMin; r <= srcRMax; r++) {
                // Get source values for this row
                const sourceValues: string[] = [];
                for (let c = srcCMin; c <= srcCMax; c++) {
                    sourceValues.push(getCellValue(r, c));
                }

                const pattern = detectFillPattern(sourceValues);
                const srcLen = sourceValues.length;

                if (isRightFill) {
                    for (let c = srcCMax + 1; c <= fillCMax; c++) {
                        const offset = c - srcCMin;
                        let newValue: string;

                        if (pattern.type === 'number' && pattern.step !== undefined) {
                            const baseNum = parseNumericValue(sourceValues[srcLen - 1]);
                            newValue = formatNumberDisplay(baseNum + (c - srcCMax) * pattern.step);
                        } else {
                            newValue = sourceValues[offset % srcLen];
                        }

                        setCellValue(r, c, newValue);
                    }
                }

                if (isLeftFill) {
                    for (let c = srcCMin - 1; c >= fillCMin; c--) {
                        const offset = srcCMin - c;
                        let newValue: string;

                        if (pattern.type === 'number' && pattern.step !== undefined) {
                            const baseNum = parseNumericValue(sourceValues[0]);
                            newValue = formatNumberDisplay(baseNum - offset * pattern.step);
                        } else {
                            newValue = sourceValues[srcLen - 1 - ((offset - 1) % srcLen)];
                        }

                        setCellValue(r, c, newValue);
                    }
                }
            }
        }

        // Update selection to include filled area
        setSelectionRanges([{
            start: { rIdx: fillRMin, cIdx: fillCMin },
            end: { rIdx: fillRMax, cIdx: fillCMax }
        }]);
    };

    // Process pending fill (executed in separate effect to avoid stale closures)
    useEffect(() => {
        if (pendingFillRange) {
            executeFillWithRange(pendingFillRange);
            setPendingFillRange(null);
        }
    }, [pendingFillRange]);

    // Execute fill with explicit range parameter (to avoid closure issues)
    const executeFillWithRange = (targetRange: { start: { rIdx: number, cIdx: number }, end: { rIdx: number, cIdx: number } }) => {
        const bounds = getSelectionBounds();
        if (!bounds) return;

        const { rMin: srcRMin, rMax: srcRMax, cMin: srcCMin, cMax: srcCMax } = bounds;
        const { start: fillStart, end: fillEnd } = targetRange;

        const fillRMin = Math.min(fillStart.rIdx, fillEnd.rIdx);
        const fillRMax = Math.max(fillStart.rIdx, fillEnd.rIdx);
        const fillCMin = Math.min(fillStart.cIdx, fillEnd.cIdx);
        const fillCMax = Math.max(fillStart.cIdx, fillEnd.cIdx);

        // Determine direction
        const isDownFill = fillRMax > srcRMax;
        const isUpFill = fillRMin < srcRMin;
        const isRightFill = fillCMax > srcCMax;
        const isLeftFill = fillCMin < srcCMin;

        if (isDownFill || isUpFill) {
            for (let c = srcCMin; c <= srcCMax; c++) {
                const sourceValues: string[] = [];
                for (let r = srcRMin; r <= srcRMax; r++) {
                    sourceValues.push(getCellValue(r, c));
                }

                const pattern = detectFillPattern(sourceValues);
                const srcLen = sourceValues.length;

                if (isDownFill) {
                    for (let r = srcRMax + 1; r <= fillRMax; r++) {
                        const offset = r - srcRMin;
                        let newValue: string;

                        if (pattern.type === 'number' && pattern.step !== undefined) {
                            const baseNum = parseNumericValue(sourceValues[srcLen - 1]);
                            const increment = (r - srcRMax) * pattern.step;
                            newValue = formatNumberDisplay(baseNum + increment);
                        } else if (pattern.type === 'date' && pattern.step !== undefined) {
                            const lastDateMatch = sourceValues[srcLen - 1].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                            if (lastDateMatch) {
                                const lastDate = new Date(parseInt(lastDateMatch[3]), parseInt(lastDateMatch[2]) - 1, parseInt(lastDateMatch[1]));
                                lastDate.setDate(lastDate.getDate() + (r - srcRMax) * pattern.step);
                                newValue = formatDateForFill(lastDate);
                            } else {
                                newValue = sourceValues[offset % srcLen];
                            }
                        } else {
                            newValue = sourceValues[offset % srcLen];
                        }

                        setCellValue(r, c, newValue);
                    }
                }

                if (isUpFill) {
                    for (let r = srcRMin - 1; r >= fillRMin; r--) {
                        const offset = srcRMin - r;
                        let newValue: string;

                        if (pattern.type === 'number' && pattern.step !== undefined) {
                            const baseNum = parseNumericValue(sourceValues[0]);
                            newValue = formatNumberDisplay(baseNum - offset * pattern.step);
                        } else if (pattern.type === 'date' && pattern.step !== undefined) {
                            const firstDateMatch = sourceValues[0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                            if (firstDateMatch) {
                                const firstDate = new Date(parseInt(firstDateMatch[3]), parseInt(firstDateMatch[2]) - 1, parseInt(firstDateMatch[1]));
                                firstDate.setDate(firstDate.getDate() - offset * pattern.step);
                                newValue = formatDateForFill(firstDate);
                            } else {
                                newValue = sourceValues[srcLen - 1 - ((offset - 1) % srcLen)];
                            }
                        } else {
                            newValue = sourceValues[srcLen - 1 - ((offset - 1) % srcLen)];
                        }

                        setCellValue(r, c, newValue);
                    }
                }
            }
        }

        if (isRightFill || isLeftFill) {
            for (let r = srcRMin; r <= srcRMax; r++) {
                const sourceValues: string[] = [];
                for (let c = srcCMin; c <= srcCMax; c++) {
                    sourceValues.push(getCellValue(r, c));
                }

                const pattern = detectFillPattern(sourceValues);
                const srcLen = sourceValues.length;

                if (isRightFill) {
                    for (let c = srcCMax + 1; c <= fillCMax; c++) {
                        const offset = c - srcCMin;
                        let newValue: string;

                        if (pattern.type === 'number' && pattern.step !== undefined) {
                            const baseNum = parseNumericValue(sourceValues[srcLen - 1]);
                            newValue = formatNumberDisplay(baseNum + (c - srcCMax) * pattern.step);
                        } else {
                            newValue = sourceValues[offset % srcLen];
                        }

                        setCellValue(r, c, newValue);
                    }
                }

                if (isLeftFill) {
                    for (let c = srcCMin - 1; c >= fillCMin; c--) {
                        const offset = srcCMin - c;
                        let newValue: string;

                        if (pattern.type === 'number' && pattern.step !== undefined) {
                            const baseNum = parseNumericValue(sourceValues[0]);
                            newValue = formatNumberDisplay(baseNum - offset * pattern.step);
                        } else {
                            newValue = sourceValues[srcLen - 1 - ((offset - 1) % srcLen)];
                        }

                        setCellValue(r, c, newValue);
                    }
                }
            }
        }

        // Update selection to include filled area
        setSelectionRanges([{
            start: { rIdx: fillRMin, cIdx: fillCMin },
            end: { rIdx: fillRMax, cIdx: fillCMax }
        }]);
    };

    // --- Name Box Navigation ---
    const handleNameBoxSubmit = () => {
        const match = nameBoxValue.toUpperCase().match(/^([A-Z]+)(\d+)$/);
        if (match) {
            const cIdx = colLetterToIndex(match[1]);
            const rIdx = parseInt(match[2], 10) - 1;
            if (rIdx >= 0 && rIdx < tableRows.length && cIdx >= 0 && cIdx < tableCols.length) {
                const pos = { rIdx, cIdx };
                setActiveCell(pos);
                setSelectionRanges([{ start: pos, end: pos }]);
            }
        }
    };

    // --- Keyboard Navigation ---
    const handleKeyDown = (e: React.KeyboardEvent, rIdx: number, cIdx: number) => {
        // Excel-like shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'c':
                    e.preventDefault();
                    handleCopy();
                    return;
                case 'v':
                    e.preventDefault();
                    handlePaste();
                    return;
                case 'x':
                    e.preventDefault();
                    handleCopy();
                    handleDelete();
                    return;
                case 'home':
                    e.preventDefault();
                    const homePos = { rIdx: 0, cIdx: 0 };
                    setActiveCell(homePos);
                    setSelectionRanges([{ start: homePos, end: homePos }]);
                    return;
                case 'end':
                    e.preventDefault();
                    const endPos = { rIdx: tableRows.length - 1, cIdx: tableCols.length - 1 };
                    setActiveCell(endPos);
                    setSelectionRanges([{ start: endPos, end: endPos }]);
                    return;
            }
        }

        // F2 - Toggle edit mode
        if (e.key === 'F2') {
            e.preventDefault();
            setIsEditMode(prev => !prev);
            return;
        }

        // Escape - Cancel edit / clear selection
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsEditMode(false);
            return;
        }

        // Delete - Clear cell content
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (!isEditMode) {
                e.preventDefault();
                handleDelete();
                return;
            }
        }

        if (!['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

        // If in edit mode, only Enter exits
        if (isEditMode && e.key !== 'Enter') return;

        e.preventDefault();

        let newRIdx = rIdx;
        let newCIdx = cIdx;

        switch (e.key) {
            case 'Enter':
                setIsEditMode(false);
                newRIdx = rIdx + 1;
                break;
            case 'ArrowDown':
                newRIdx = rIdx + 1;
                break;
            case 'ArrowUp':
                newRIdx = rIdx - 1;
                break;
            case 'Tab':
                newCIdx = e.shiftKey ? cIdx - 1 : cIdx + 1;
                break;
            case 'ArrowRight':
                newCIdx = cIdx + 1;
                break;
            case 'ArrowLeft':
                newCIdx = cIdx - 1;
                break;
        }

        // Boundary Checks
        if (newRIdx >= 0 && newRIdx < tableRows.length && newCIdx >= 0 && newCIdx < tableCols.length) {
            const pos = { rIdx: newRIdx, cIdx: newCIdx };
            setActiveCell(pos);
            if (e.shiftKey && e.key !== 'Tab') {
                // Extend last range
                setSelectionRanges(prev => {
                    const current = prev.length > 0 ? [...prev] : [{ start: activeCell || pos, end: pos }];
                    const lastIdx = current.length - 1;
                    current[lastIdx] = { ...current[lastIdx], end: pos };
                    return current;
                });
            } else {
                // Move selection, clear others
                setSelectionRanges([{ start: pos, end: pos }]);
            }
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
    const rawSelectedValue = activeCell ? getRawValue(activeCell.rIdx, activeCell.cIdx) : null;
    const isSelectedTraceable = isTraceable(rawSelectedValue);

    const selectedValue = activeCell ? getCellDisplayValue(activeCell.rIdx, activeCell.cIdx) : '';


    if (loading) return <div className="p-4 text-center">Loading...</div>;
    if (tableRows.length === 0) {
        return <div className="p-4 text-center text-slate-500 italic">{emptyMessage}</div>;
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 h-full relative">
            {/* Formula Bar - Excel Style (only in edit mode) */}
            {shouldShowFormulaBar && (
                <div className="flex items-center gap-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600 shrink-0 h-8">
                    {/* Name Box - Clickable like Excel */}
                    <div className="w-20 border-r border-slate-300 dark:border-slate-600 h-full flex items-center">
                        <input
                            className="w-full h-full px-2 text-center font-bold text-slate-700 dark:text-slate-200 text-xs bg-white dark:bg-slate-700 border-none focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30 select-all"
                            value={nameBoxValue}
                            onChange={(e) => setNameBoxValue(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleNameBoxSubmit();
                                }
                            }}
                            onBlur={handleNameBoxSubmit}
                            placeholder="A1"
                            title="Nhập tọa độ ô (VD: A1, B5) và nhấn Enter để nhảy đến"
                        />
                    </div>

                    {/* Separator */}
                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>

                    {/* Function Symbol */}
                    <div className="w-8 h-full flex items-center justify-center border-r border-slate-300 dark:border-slate-600">
                        <span className="font-serif text-slate-400 font-bold italic text-sm select-none">fx</span>
                    </div>

                    {/* Formula Input */}
                    <div className="flex-1 flex items-center relative h-full">
                        <input
                            className={`w-full h-full px-3 bg-white dark:bg-slate-700 border-none text-sm focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 ${isSelectedTraceable ? 'text-blue-600 font-bold' : 'text-slate-800 dark:text-slate-200'}`}
                            placeholder="Chọn ô để nhập giá trị hoặc công thức..."
                            disabled={!activeCell || isSelectedTraceable}
                            value={isSelectedTraceable ? `=${rawSelectedValue.formula}` : selectedValue}
                            onChange={(e) => activeCell && setCellValue(activeCell.rIdx, activeCell.cIdx, e.target.value)}
                            onFocus={() => setIsEditMode(true)}
                        />

                        {/* Traceability Action */}
                        {isSelectedTraceable && rawSelectedValue.source && (
                            <button
                                className="absolute right-2 top-1 bottom-1 px-3 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded text-xs font-bold flex items-center gap-1 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                                onClick={() => {
                                    if (rawSelectedValue.source?.type === 'link') {
                                        window.location.hash = rawSelectedValue.source.target;
                                    } else if (rawSelectedValue.source?.type === 'modal') {
                                        // For modal type, show source information
                                        const label = rawSelectedValue.source.label || 'Chi tiết';
                                        const target = rawSelectedValue.source.target || '';
                                        alert(`📊 Nguồn dữ liệu: ${label}\n\nTham chiếu: ${target}\nGiá trị: ${rawSelectedValue.value}\nCông thức: ${rawSelectedValue.formula || 'N/A'}`);
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
            )}

            {/* Main Table */}
            <div className="flex-1 overflow-auto relative" onContextMenu={handleContainerContextMenu}>
                <table className="w-full border-collapse text-sm min-w-max">
                    <thead className={`${stickyHeader ? 'sticky top-0' : ''} z-20 bg-slate-100 dark:bg-slate-800`}>
                        <tr>
                            {/* Corner cell - Row numbers header */}
                            {showRowNumbers && (
                                <th className="w-10 min-w-[40px] border-r border-b border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 sticky left-0 z-30"></th>
                            )}
                            {tableCols.map((col, cIdx) => {
                                // Check if this column is in selection
                                const isColSelected = selectionRanges.some(range => {
                                    const cMin = Math.min(range.start.cIdx, range.end.cIdx);
                                    const cMax = Math.max(range.start.cIdx, range.end.cIdx);
                                    return cIdx >= cMin && cIdx <= cMax;
                                });
                                const isColActive = activeCell?.cIdx === cIdx;

                                // Get width from state or default
                                const rawWidth = col.def?.width ? parseInt(col.def.width) : 120;
                                const safeWidth = isNaN(rawWidth) ? 120 : rawWidth;
                                const colWidth = columnWidths[col.id] || safeWidth;

                                return (
                                    <th
                                        key={col.id}
                                        style={{ width: colWidth, minWidth: colWidth }}
                                        className={`border-r border-b border-slate-300 dark:border-slate-600 px-1 py-1.5 font-semibold whitespace-nowrap
                                        ${col.type === 'draft' ? 'bg-orange-100 dark:bg-orange-900/30 text-slate-500' :
                                                isColActive ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' :
                                                    isColSelected ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' :
                                                        'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}
                                        relative group text-center cursor-pointer select-none hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors`}
                                        onContextMenu={(e) => handleContextMenu(e, -1, cIdx)}
                                        onClick={(e) => handleColumnHeaderClick(cIdx, e)}
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

                                        {/* Column Resize Handle - Excel Style */}
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 z-10"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setResizingCol({
                                                    colId: col.id,
                                                    startX: e.clientX,
                                                    startWidth: colWidth
                                                });
                                            }}
                                            onDoubleClick={(e) => {
                                                // Auto-fit: Reset to default
                                                e.stopPropagation();
                                                setColumnWidths(prev => {
                                                    const { [col.id]: _, ...rest } = prev;
                                                    return rest;
                                                });
                                            }}
                                            title="Kéo để thay đổi độ rộng, double-click để auto-fit"
                                        />
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-300">
                        {tableRows.map((row, rIdx) => {
                            const rowClass = (row.type === 'real' && row.data && getRowClassName) ? getRowClassName(row.data) : '';
                            const isRowSelected = row.type === 'real' && selectedRow && row.data && (row.data[keyField] === selectedRow[keyField]);

                            // Check if this row is in selection
                            const isRowInSelection = selectionRanges.some(range => {
                                const rMin = Math.min(range.start.rIdx, range.end.rIdx);
                                const rMax = Math.max(range.start.rIdx, range.end.rIdx);
                                return rIdx >= rMin && rIdx <= rMax;
                            });
                            const isRowActive = activeCell?.rIdx === rIdx;

                            return (
                                <tr
                                    key={row.id}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 group ${rowClass} ${isRowSelected ? '!bg-blue-50 dark:!bg-blue-900/30' : ''}`}
                                >
                                    {/* Row Header - Excel Style */}
                                    {showRowNumbers && (
                                        <td
                                            className={`border-r border-b border-slate-300 dark:border-slate-600 text-center text-xs font-medium sticky left-0 z-10 select-none w-10 min-w-[40px]
                                            ${isRowActive ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-bold' :
                                                    isRowInSelection ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-bold' :
                                                        'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}
                                            hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer transition-colors`}
                                            onContextMenu={(e) => handleContextMenu(e, rIdx, -1)}
                                            onClick={(e) => {
                                                if (readOnly) return;
                                                // Select entire row
                                                const start = { rIdx, cIdx: 0 };
                                                const end = { rIdx, cIdx: tableCols.length - 1 };
                                                setActiveCell(start);
                                                if (e.ctrlKey || e.metaKey) {
                                                    setSelectionRanges(prev => [...prev, { start, end }]);
                                                } else {
                                                    setSelectionRanges([{ start, end }]);
                                                }
                                            }}
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
                                    )}
                                    {tableCols.map((col, cIdx) => {
                                        const isActive = activeCell?.rIdx === rIdx && activeCell.cIdx === cIdx;

                                        // Check Range(s)
                                        let isInRange = false;
                                        for (const range of selectionRanges) {
                                            const rMin = Math.min(range.start.rIdx, range.end.rIdx);
                                            const rMax = Math.max(range.start.rIdx, range.end.rIdx);
                                            const cMin = Math.min(range.start.cIdx, range.end.cIdx);
                                            const cMax = Math.max(range.start.cIdx, range.end.cIdx);
                                            if (rIdx >= rMin && rIdx <= rMax && cIdx >= cMin && cIdx <= cMax) {
                                                isInRange = true;
                                                break;
                                            }
                                        }

                                        // Check if this cell is in fill preview range (but not in original selection)
                                        let isInFillPreview = false;
                                        if (fillPreviewRange && isFillDragging) {
                                            const fillRMin = Math.min(fillPreviewRange.start.rIdx, fillPreviewRange.end.rIdx);
                                            const fillRMax = Math.max(fillPreviewRange.start.rIdx, fillPreviewRange.end.rIdx);
                                            const fillCMin = Math.min(fillPreviewRange.start.cIdx, fillPreviewRange.end.cIdx);
                                            const fillCMax = Math.max(fillPreviewRange.start.cIdx, fillPreviewRange.end.cIdx);
                                            if (rIdx >= fillRMin && rIdx <= fillRMax && cIdx >= fillCMin && cIdx <= fillCMax && !isInRange) {
                                                isInFillPreview = true;
                                            }
                                        }

                                        // Check if this cell is at the bottom-right corner of selection (for fill handle)
                                        let showFillHandle = false;
                                        if (!readOnly && selectionRanges.length > 0 && !isFillDragging) {
                                            const lastRange = selectionRanges[selectionRanges.length - 1];
                                            const selRMax = Math.max(lastRange.start.rIdx, lastRange.end.rIdx);
                                            const selCMax = Math.max(lastRange.start.cIdx, lastRange.end.cIdx);
                                            showFillHandle = rIdx === selRMax && cIdx === selCMax;
                                        }

                                        const errorKey = `ERR-${row.id}-${col.id}`;
                                        const errorMsg = cellErrors[errorKey];
                                        const displayVal = getCellDisplayValue(rIdx, cIdx);

                                        // Get column width
                                        const rawWidth = col.def?.width ? parseInt(col.def.width) : 120;
                                        const safeWidth = isNaN(rawWidth) ? 120 : rawWidth;
                                        const cellWidth = columnWidths[col.id] || safeWidth;

                                        // Styling - Excel-like grid
                                        let cellClass = bordered
                                            ? "border-r border-b border-slate-200 dark:border-slate-700 p-0 relative "
                                            : "p-0 relative ";
                                        if (col.type === 'draft') cellClass += "bg-orange-50/50 dark:bg-orange-900/20 ";
                                        else if (row.type === 'draft') cellClass += "bg-slate-50 dark:bg-slate-800/70 italic "; // Draft row in real col
                                        else if (striped && rIdx % 2 === 1) cellClass += "bg-slate-50 dark:bg-slate-800/50 ";
                                        else cellClass += "bg-white dark:bg-slate-900 ";

                                        // Alignment Logic: Default to Left. If Number -> Right. override if explicit align set.
                                        let align = col.def?.align;
                                        if (!align && col.def?.type === 'number') align = 'right';
                                        if (!align && col.def?.type === 'actions') align = 'center';

                                        const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

                                        // Selection Styling - Excel-like colors (only in non-readOnly mode)
                                        if (!readOnly) {
                                            if (isInFillPreview) {
                                                // Fill preview: dashed border and light green background
                                                cellClass += " bg-green-100 dark:bg-green-900/40 border-dashed border-green-500";
                                            } else if (isActive) {
                                                // Active cell: thick green border like Excel
                                                cellClass += " ring-2 ring-inset ring-green-600 dark:ring-green-500 z-10 bg-white dark:bg-slate-900";
                                            } else if (isInRange) {
                                                // Selected range: light blue like Excel #CCE5FF
                                                cellClass += " bg-blue-100 dark:bg-blue-900/50";
                                            }
                                        }

                                        if (errorMsg) cellClass += " !bg-red-50 dark:!bg-red-900/30";

                                        // Custom cell className
                                        if (col.def?.cellClassName && row.type === 'real') {
                                            const customClass = typeof col.def.cellClassName === 'function'
                                                ? col.def.cellClassName(getCellValue(rIdx, cIdx), row.data)
                                                : col.def.cellClassName;
                                            cellClass += ` ${customClass}`;
                                        }

                                        // Determine if cell is editable
                                        const isActionColumn = col.def?.type === 'actions';
                                        const isCellEditable = !readOnly && !isActionColumn && (col.def?.editable !== false);

                                        return (
                                            <td
                                                key={col.id}
                                                style={{ width: cellWidth, minWidth: cellWidth }}
                                                onMouseDown={(e) => handleCellMouseDown(rIdx, cIdx, e)}
                                                onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                                                onDoubleClick={() => {
                                                    const raw = getRawValue(rIdx, cIdx);
                                                    if (isTraceable(raw) && raw.source?.type === 'link') {
                                                        window.location.hash = raw.source.target;
                                                    } else if (row.type === 'real' && onRowDoubleClick) {
                                                        onRowDoubleClick(row.data);
                                                    } else {
                                                        // Excel-like: double-click enters edit mode
                                                        setIsEditMode(true);
                                                    }
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, rIdx, cIdx)}
                                                className={`${cellClass} ${isTraceable(getRawValue(rIdx, cIdx)) ? 'cursor-alias' : 'cursor-cell'}`}
                                                title={errorMsg || (isTraceable(getRawValue(rIdx, cIdx)) ? 'Double-click để xem nguồn' : undefined)}
                                            >
                                                {errorMsg && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl triangle-error z-20"></div>}
                                                {/* Actions column or custom renderer always shows the renderer */}
                                                {isActionColumn && col.def?.renderCell && row.type === 'real' ? (
                                                    <div className={`w-full h-full ${compact ? 'px-1 py-0.5' : 'px-2 py-1.5'} text-sm ${alignClass} flex items-center justify-center gap-1`}>
                                                        {col.def.renderCell(getCellValue(rIdx, cIdx), row.data, rIdx)}
                                                    </div>
                                                ) : isActive && isCellEditable ? (
                                                    <input
                                                        ref={(el) => { if (isActive) el?.focus(); }}
                                                        readOnly={
                                                            !!(String(displayVal).startsWith('=') ||
                                                                (lockedUntil && row.type === 'real' && row.data?.[dateField] <= lockedUntil))
                                                        }
                                                        className={`w-full h-full ${compact ? 'px-1 py-0.5' : 'px-2 py-1.5'} bg-transparent border-none focus:outline-none text-sm ${alignClass}
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
                                                    <div className={`w-full h-full ${compact ? 'px-1 py-0.5' : 'px-2 py-1.5'} text-sm ${alignClass} truncate ${col.def?.fontClass || ''} ${col.type === 'draft' || row.type === 'draft' ? 'font-mono text-slate-600 dark:text-slate-400' : ''} select-none`}>
                                                        {col.def?.renderCell && row.type === 'real' ? col.def.renderCell(getCellValue(rIdx, cIdx), row.data, rIdx) : displayVal}
                                                    </div>
                                                )}
                                                {/* Fill Handle - shown at bottom-right corner of selection */}
                                                {showFillHandle && (
                                                    <div
                                                        className="absolute -bottom-[3px] -right-[3px] w-[7px] h-[7px] bg-green-600 dark:bg-green-500 border border-white dark:border-slate-800 cursor-crosshair z-30 hover:bg-green-700 dark:hover:bg-green-400"
                                                        onMouseDown={handleFillHandleMouseDown}
                                                        title="Kéo để điền dữ liệu (Drag to fill)"
                                                    />
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
                                            .reduce((sum, r) => sum + parseNumericValue(r.data?.[col.id]), 0);

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



                                    const total = data.reduce((sum, item) => sum + parseNumericValue(item[col.id]), 0);

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

            {/* Status Bar - Excel Style */}
            {showStatusBar && (
                <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-600 px-4 py-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none h-7 shrink-0">
                    {/* Left side: Mode indicator */}
                    <div className="flex items-center gap-4">
                        {readOnly && <span className="text-slate-500 font-medium">Chế độ xem</span>}
                        {!readOnly && isEditMode && <span className="text-green-600 dark:text-green-400 font-bold">Đang sửa</span>}
                        {!readOnly && clipboard && <span className="text-blue-600 dark:text-blue-400">Clipboard: {clipboard.data.length}×{clipboard.data[0]?.length || 0}</span>}
                        {!readOnly && !isEditMode && !clipboard && <span className="text-slate-400">Sẵn sàng</span>}
                    </div>

                    {/* Right side: Selection stats */}
                    <div className="flex items-center gap-6 font-semibold">
                        {(() => {
                            const stats = getSelectionStats();
                            if (!stats) return null;
                            return (
                                <>
                                    {stats.numCount > 0 && <span>Trung bình: <span className="text-slate-800 dark:text-slate-200">{formatNumberDisplay(stats.average, undefined, 2)}</span></span>}
                                    <span>Số ô: <span className="text-slate-800 dark:text-slate-200">{stats.count}</span></span>
                                    {stats.numCount > 0 && <span>Tổng: <span className="text-slate-800 dark:text-slate-200">{formatNumberDisplay(stats.sum)}</span></span>}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};
