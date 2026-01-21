/**
 * GeneralModule - Main Entry Point
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 * 
 * This file now imports components from their respective modules
 * to reduce file size and improve maintainability.
 */

import React from 'react';
import { FormModal } from '../FormModal';

// Import from extracted modules (previously duplicated in GeneralModule.tsx)
import { ClosingEntries } from '../ClosingModule';
import { Allocation } from '../AllocationModule';
import { Revaluation } from '../RevaluationModule';

// Import from local extracted components
import { PeriodLock } from './PeriodLock';
import { Reconciliation } from './Reconciliation';
import { VoucherFilters } from './VoucherFilters';
import { VoucherActions, ActionBar } from './VoucherActions';
import { PostingModal } from './PostingModal';
import { StagingArea } from './StagingArea';
import { VoucherTableRow, VoucherTableHeader } from './VoucherTableRow';

// Re-export types
export * from './types/voucher.types';

// Re-export hooks (exclude MasterData since it's in types)
export { useVouchers, type UseVouchersReturn } from './hooks/useVouchers';
export { useVoucherForm, type UseVoucherFormReturn, type UseVoucherFormOptions } from './hooks/useVoucherForm';

// Re-export utils
export * from './utils';

// Simple Modal Wrapper (used by sub-components)
export const Modal = ({ title, onClose, children, panelClass }: { title: string, onClose: () => void, children: React.ReactNode, panelClass?: string }) => (
    <FormModal title={title} onClose={onClose} panelClass={panelClass}>
        {children}
    </FormModal>
);

// Export all sub-components for external use
export {
    ClosingEntries,
    Allocation,
    Revaluation,
    PeriodLock,
    Reconciliation,
    VoucherFilters,
    VoucherActions,
    ActionBar,
    PostingModal,
    StagingArea,
    VoucherTableRow,
    VoucherTableHeader
};
