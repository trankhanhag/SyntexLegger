import { toInputDateValue } from './dateUtils';

export const exportToCSV = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
        alert("Không có dữ liệu để xuất.");
        return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            let value = row[fieldName];
            // Handle strings with commas
            if (typeof value === 'string' && value.includes(',')) {
                value = `"${value}"`;
            }
            return value;
        }).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${toInputDateValue()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
