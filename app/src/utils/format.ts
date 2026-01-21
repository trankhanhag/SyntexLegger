export const getNumberFormat = () => {
    const format = localStorage.getItem('decimalFormat') || 'vi-VN';
    return format;
};

export const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
    const locale = getNumberFormat();
    return new Intl.NumberFormat(locale, options).format(Math.abs(num));
};
