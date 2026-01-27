const pad2 = (value: number) => String(value).padStart(2, '0');

export const toInputDateValue = (date: Date | string | null = new Date()): string => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'string') {
        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        // DD/MM/YYYY
        const vnMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (vnMatch) return `${vnMatch[3]}-${pad2(Number(vnMatch[2]))}-${pad2(Number(vnMatch[1]))}`;

        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
        }
        return '';
    }
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const toInputMonthValue = (date: Date | string | null = new Date()): string => {
    if (!date) return new Date().toISOString().slice(0, 7);
    if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}`;
        }
        return '';
    }
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
};

export const formatDateVN = (value?: string | Date | null): string => {
    if (!value) return '';

    if (value instanceof Date) {
        return `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()}`;
    }

    if (typeof value === 'string') {
        const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

        const vnMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (vnMatch) return `${pad2(Number(vnMatch[1]))}/${pad2(Number(vnMatch[2]))}/${vnMatch[3]}`;

        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
            return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
        }
    }

    return String(value);
};

export const formatMonthVN = (value?: string | Date | null): string => {
    if (!value) return '';

    if (value instanceof Date) {
        return `${pad2(value.getMonth() + 1)}/${value.getFullYear()}`;
    }

    if (typeof value === 'string') {
        const ymMatch = value.match(/^(\d{4})-(\d{2})$/);
        if (ymMatch) return `${ymMatch[2]}/${ymMatch[1]}`;

        const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[2]}/${isoMatch[1]}`;

        const vnMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (vnMatch) return `${pad2(Number(vnMatch[2]))}/${vnMatch[3]}`;
    }

    return String(value);
};

export const formatDateVNLong = (value?: string | Date | null): string => {
    const formatted = formatDateVN(value);
    const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return formatted;
    return `Ngày ${match[1]} tháng ${match[2]} năm ${match[3]}`;
};

export const formatTimeVN = (value: Date = new Date()): string => {
    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(value);
};

export const formatDateTimeVN = (value?: string | Date | null): string => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return `${formatDateVN(date)} ${formatTimeVN(date)}`;
};

export const normalizeDateValue = (value: string): string => {
    if (!value) return value;

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const vnMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (vnMatch) return `${vnMatch[3]}-${pad2(Number(vnMatch[2]))}-${pad2(Number(vnMatch[1]))}`;

    return value;
};

/**
 * Vietnamese month names for dropdown
 */
export const VIETNAMESE_MONTHS = [
    { value: '01', label: 'Tháng 1' },
    { value: '02', label: 'Tháng 2' },
    { value: '03', label: 'Tháng 3' },
    { value: '04', label: 'Tháng 4' },
    { value: '05', label: 'Tháng 5' },
    { value: '06', label: 'Tháng 6' },
    { value: '07', label: 'Tháng 7' },
    { value: '08', label: 'Tháng 8' },
    { value: '09', label: 'Tháng 9' },
    { value: '10', label: 'Tháng 10' },
    { value: '11', label: 'Tháng 11' },
    { value: '12', label: 'Tháng 12' },
];
