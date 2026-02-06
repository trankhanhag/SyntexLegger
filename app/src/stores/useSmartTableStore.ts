/**
 * SmartTable Store
 * Manages table state for the SmartTable component
 * Replaces 15+ useState calls in SmartTable.tsx
 */

import { create } from 'zustand';

interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterCondition {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: any;
  value2?: any; // For 'between' operator
}

interface SmartTableState {
  // Cell selection
  activeCell: CellPosition | null;
  selectionRanges: SelectionRange[];
  isSelecting: boolean;
  selectionStart: CellPosition | null;

  // Edit mode
  isEditMode: boolean;
  editValue: string;

  // Scratchpad (temporary edit data)
  scratchpadData: Record<string, any>[];
  hasChanges: boolean;

  // Sorting
  sortConfig: SortConfig | null;

  // Filtering
  filters: Record<string, string>;
  filterConditions: FilterCondition[];
  showFilterPanel: boolean;

  // Clipboard
  clipboard: string[][];
  clipboardMode: 'copy' | 'cut' | null;

  // Column management
  columnWidths: Record<string, number>;
  hiddenColumns: string[];
  columnOrder: string[];

  // Pagination
  page: number;
  pageSize: number;

  // Actions - Selection
  setActiveCell: (cell: CellPosition | null) => void;
  addSelectionRange: (range: SelectionRange) => void;
  clearSelection: () => void;
  startSelection: (cell: CellPosition) => void;
  updateSelection: (cell: CellPosition) => void;
  endSelection: () => void;
  selectAll: () => void;
  selectRow: (rowIndex: number) => void;
  selectColumn: (colIndex: number, totalRows: number) => void;

  // Actions - Edit
  enterEditMode: (value?: string) => void;
  exitEditMode: (save?: boolean) => void;
  setEditValue: (value: string) => void;

  // Actions - Scratchpad
  setScratchpadData: (data: Record<string, any>[]) => void;
  updateScratchpadRow: (rowIndex: number, data: Record<string, any>) => void;
  updateScratchpadCell: (rowIndex: number, column: string, value: any) => void;
  commitChanges: () => void;
  discardChanges: () => void;

  // Actions - Sorting
  setSortConfig: (config: SortConfig | null) => void;
  toggleSort: (key: string) => void;

  // Actions - Filtering
  setFilter: (column: string, value: string) => void;
  addFilterCondition: (condition: FilterCondition) => void;
  removeFilterCondition: (index: number) => void;
  clearFilters: () => void;
  toggleFilterPanel: () => void;

  // Actions - Clipboard
  copy: (data: string[][]) => void;
  cut: (data: string[][]) => void;
  paste: () => string[][] | null;
  clearClipboard: () => void;

  // Actions - Columns
  setColumnWidth: (column: string, width: number) => void;
  toggleColumnVisibility: (column: string) => void;
  reorderColumns: (newOrder: string[]) => void;
  resetColumnConfig: () => void;

  // Actions - Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Actions - Navigation
  moveActiveCell: (direction: 'up' | 'down' | 'left' | 'right', maxRows: number, maxCols: number) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  activeCell: null,
  selectionRanges: [],
  isSelecting: false,
  selectionStart: null,
  isEditMode: false,
  editValue: '',
  scratchpadData: [],
  hasChanges: false,
  sortConfig: null,
  filters: {},
  filterConditions: [],
  showFilterPanel: false,
  clipboard: [],
  clipboardMode: null as 'copy' | 'cut' | null,
  columnWidths: {},
  hiddenColumns: [],
  columnOrder: [],
  page: 1,
  pageSize: 50,
};

export const useSmartTableStore = create<SmartTableState>((set, get) => ({
  ...initialState,

  // Selection actions
  setActiveCell: (cell) => set({ activeCell: cell }),

  addSelectionRange: (range) => {
    set((state) => ({
      selectionRanges: [...state.selectionRanges, range],
    }));
  },

  clearSelection: () => {
    set({
      selectionRanges: [],
      isSelecting: false,
      selectionStart: null,
    });
  },

  startSelection: (cell) => {
    set({
      isSelecting: true,
      selectionStart: cell,
      selectionRanges: [{ start: cell, end: cell }],
      activeCell: cell,
    });
  },

  updateSelection: (cell) => {
    const { isSelecting, selectionStart } = get();
    if (!isSelecting || !selectionStart) return;

    set({
      selectionRanges: [{ start: selectionStart, end: cell }],
    });
  },

  endSelection: () => {
    set({ isSelecting: false });
  },

  selectAll: () => {
    // Will be called with row/col count from component
  },

  selectRow: (rowIndex) => {
    set((state) => ({
      selectionRanges: [
        ...state.selectionRanges,
        { start: { rowIndex, colIndex: 0 }, end: { rowIndex, colIndex: 999 } },
      ],
    }));
  },

  selectColumn: (colIndex, totalRows) => {
    set((state) => ({
      selectionRanges: [
        ...state.selectionRanges,
        { start: { rowIndex: 0, colIndex }, end: { rowIndex: totalRows - 1, colIndex } },
      ],
    }));
  },

  // Edit actions
  enterEditMode: (value) => {
    set({
      isEditMode: true,
      editValue: value ?? '',
    });
  },

  exitEditMode: (save = false) => {
    const { activeCell, editValue, scratchpadData } = get();
    if (save && activeCell) {
      // Would need column info to save - handled by component
    }
    set({ isEditMode: false, editValue: '' });
  },

  setEditValue: (value) => set({ editValue: value }),

  // Scratchpad actions
  setScratchpadData: (data) => {
    set({
      scratchpadData: JSON.parse(JSON.stringify(data)),
      hasChanges: false,
    });
  },

  updateScratchpadRow: (rowIndex, data) => {
    set((state) => {
      const newData = [...state.scratchpadData];
      newData[rowIndex] = { ...newData[rowIndex], ...data };
      return { scratchpadData: newData, hasChanges: true };
    });
  },

  updateScratchpadCell: (rowIndex, column, value) => {
    set((state) => {
      const newData = [...state.scratchpadData];
      if (newData[rowIndex]) {
        newData[rowIndex] = { ...newData[rowIndex], [column]: value };
      }
      return { scratchpadData: newData, hasChanges: true };
    });
  },

  commitChanges: () => {
    set({ hasChanges: false });
    // Actual save handled by component callback
  },

  discardChanges: () => {
    set({ hasChanges: false, scratchpadData: [] });
  },

  // Sorting actions
  setSortConfig: (config) => set({ sortConfig: config }),

  toggleSort: (key) => {
    const { sortConfig } = get();
    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'asc') {
        set({ sortConfig: { key, direction: 'desc' } });
      } else {
        set({ sortConfig: null });
      }
    } else {
      set({ sortConfig: { key, direction: 'asc' } });
    }
  },

  // Filtering actions
  setFilter: (column, value) => {
    set((state) => ({
      filters: { ...state.filters, [column]: value },
    }));
  },

  addFilterCondition: (condition) => {
    set((state) => ({
      filterConditions: [...state.filterConditions, condition],
    }));
  },

  removeFilterCondition: (index) => {
    set((state) => ({
      filterConditions: state.filterConditions.filter((_, i) => i !== index),
    }));
  },

  clearFilters: () => {
    set({
      filters: {},
      filterConditions: [],
    });
  },

  toggleFilterPanel: () => {
    set((state) => ({ showFilterPanel: !state.showFilterPanel }));
  },

  // Clipboard actions
  copy: (data) => {
    set({
      clipboard: data,
      clipboardMode: 'copy',
    });
  },

  cut: (data) => {
    set({
      clipboard: data,
      clipboardMode: 'cut',
    });
  },

  paste: () => {
    const { clipboard, clipboardMode } = get();
    if (clipboard.length === 0) return null;

    if (clipboardMode === 'cut') {
      set({ clipboard: [], clipboardMode: null });
    }

    return clipboard;
  },

  clearClipboard: () => {
    set({ clipboard: [], clipboardMode: null });
  },

  // Column actions
  setColumnWidth: (column, width) => {
    set((state) => ({
      columnWidths: { ...state.columnWidths, [column]: width },
    }));
  },

  toggleColumnVisibility: (column) => {
    set((state) => {
      const hidden = state.hiddenColumns;
      if (hidden.includes(column)) {
        return { hiddenColumns: hidden.filter((c) => c !== column) };
      }
      return { hiddenColumns: [...hidden, column] };
    });
  },

  reorderColumns: (newOrder) => {
    set({ columnOrder: newOrder });
  },

  resetColumnConfig: () => {
    set({
      columnWidths: {},
      hiddenColumns: [],
      columnOrder: [],
    });
  },

  // Pagination actions
  setPage: (page) => set({ page }),
  setPageSize: (size) => set({ pageSize: size, page: 1 }),
  nextPage: () => set((state) => ({ page: state.page + 1 })),
  prevPage: () => set((state) => ({ page: Math.max(1, state.page - 1) })),

  // Navigation
  moveActiveCell: (direction, maxRows, maxCols) => {
    const { activeCell } = get();
    if (!activeCell) return;

    let { rowIndex, colIndex } = activeCell;

    switch (direction) {
      case 'up':
        rowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'down':
        rowIndex = Math.min(maxRows - 1, rowIndex + 1);
        break;
      case 'left':
        colIndex = Math.max(0, colIndex - 1);
        break;
      case 'right':
        colIndex = Math.min(maxCols - 1, colIndex + 1);
        break;
    }

    set({ activeCell: { rowIndex, colIndex } });
  },

  // Reset
  reset: () => set(initialState),
}));
