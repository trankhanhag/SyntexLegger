import React, { useState, useEffect, useRef } from 'react';

interface DateInputProps {
    value?: string; // Expecting ISO format YYYY-MM-DD
    onChange: (isoDate: string) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, className, placeholder = "DD/MM/YYYY", disabled }) => {
    // Convert ISO YYYY-MM-DD to Display DD/MM/YYYY
    const toDisplay = (iso: string) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        if (!y || !m || !d) return iso;
        return `${d}/${m}/${y}`;
    };

    const [displayValue, setDisplayValue] = useState(toDisplay(value || ''));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setDisplayValue(toDisplay(value || ''));
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        const oldVal = displayValue;

        // Allow only numbers and slashes
        val = val.replace(/[^0-9/]/g, '');

        // Auto-insert slashes logic (simple mask)
        // If user is deleting, don't auto-insert
        if (val.length > oldVal.length) {
            if (val.length === 2) val += '/';
            if (val.length === 5) val += '/';
        }

        // Limit length
        if (val.length > 10) val = val.slice(0, 10);

        setDisplayValue(val);

        // Analyze and emit if valid
        if (val.length === 10) {
            const parts = val.split('/');
            if (parts.length === 3) {
                const d = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                const y = parseInt(parts[2], 10);

                // Basic validation
                if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1900) {
                    const iso = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                    onChange(iso);
                }
            }
        } else if (val === '') {
            onChange('');
        }
    };

    const handleBlur = () => {
        // Strict validation on blur could be added here if needed
        // For now, relies on onChange validation
    };

    return (
        <input
            ref={inputRef}
            type="text"
            className={`${className} font-mono`}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            maxLength={10}
        />
    );
};
