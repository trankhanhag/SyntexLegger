
/**
 * A lightweight, dependency-free SVG Line Chart for trends.
 */
export const TrendLineChart = ({ data, color = "#3b82f6", height = 60, width = 120 }: { data: number[], color?: string, height?: number, width?: number }) => {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    // Calculate points
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height; // Invert Y for SVG
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            {/* Gradient Defs */}
            <defs>
                <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>

            {/* Area Fill */}
            <path
                d={`M 0,${height} ${points} L ${width},${height} Z`}
                fill={`url(#grad-${color})`}
                stroke="none"
            />

            {/* Line */}
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* End Dot */}
            <circle
                cx={width}
                cy={height - ((data[data.length - 1] - min) / range) * height}
                r="3"
                fill={color}
                className="animate-pulse"
            />
        </svg>
    );
};

/**
 * A simple Bar Chart for comparison
 */
export const SparkBarChart = ({ data, labels, height = 150 }: { data: number[], labels: string[], height?: number }) => {
    const max = Math.max(...data);

    return (
        <div className="flex items-end justify-between gap-2 h-full w-full" style={{ height }}>
            {data.map((val, i) => (
                <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                    <div className="relative w-full flex justify-center items-end h-full">
                        <div
                            className="w-full max-w-[24px] bg-blue-500/80 hover:bg-blue-600 rounded-t-sm transition-all duration-500 relative group-hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ height: `${(val / max) * 100}%` }}
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {new Intl.NumberFormat('vi-VN').format(val)}
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase">{labels[i]}</span>
                </div>
            ))}
        </div>
    );
};

/**
 * Compact Health Gauge
 */
export const CompactRadialGauge = ({ score, size = 60 }: { score: number, size?: number }) => {
    const radius = size / 2 - 4;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let color = 'text-green-500';
    if (score < 50) color = 'text-red-500';
    else if (score < 80) color = 'text-amber-500';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="currentColor" strokeWidth="6" fill="transparent"
                    className="text-slate-100 dark:text-slate-800"
                />
                {/* Value Ring */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={`${color} transition-all duration-1000 ease-out`}
                />
            </svg>
            <div className={`absolute text-sm font-black ${color}`}>
                {score}
            </div>
        </div>
    );
};
