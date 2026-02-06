/**
 * Frontend Logger Utility
 * SyntexLegger - Enterprise Accounting System
 *
 * Provides structured logging for the frontend application.
 * In production, logs can be sent to an external service.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    data?: unknown;
    component?: string;
}

interface Logger {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
    group: (label: string) => void;
    groupEnd: () => void;
}

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Log buffer for sending to external service
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Format log entry for console output
 */
const formatLog = (level: LogLevel, message: string, data?: unknown): string => {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
};

/**
 * Add log entry to buffer (for external service)
 */
const addToBuffer = (entry: LogEntry): void => {
    logBuffer.push(entry);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
        logBuffer.shift(); // Remove oldest entry
    }
};

/**
 * Send buffered logs to external service
 * This can be called periodically or on error
 */
export const flushLogs = async (): Promise<void> => {
    if (logBuffer.length === 0) return;

    // TODO: Implement sending to external service (Sentry, LogRocket, etc.)
    // const logs = [...logBuffer];
    // logBuffer.length = 0;
    // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(logs) });
};

/**
 * Create a logger instance with optional component name
 */
export const createLogger = (component?: string): Logger => {
    const log = (level: LogLevel, message: string, data?: unknown): void => {
        const timestamp = new Date().toISOString();
        const entry: LogEntry = { level, message, timestamp, data, component };

        // Always add to buffer in production
        if (isProduction) {
            addToBuffer(entry);
        }

        // Console output only in development
        if (isDevelopment) {
            const prefix = component ? `[${component}] ` : '';
            const formattedMessage = `${prefix}${message}`;

            switch (level) {
                case 'debug':
                    console.debug(formatLog(level, formattedMessage, data));
                    break;
                case 'info':
                    console.info(formatLog(level, formattedMessage, data));
                    break;
                case 'warn':
                    console.warn(formatLog(level, formattedMessage, data));
                    break;
                case 'error':
                    console.error(formatLog(level, formattedMessage, data));
                    break;
            }
        }
    };

    return {
        debug: (message: string, data?: unknown) => log('debug', message, data),
        info: (message: string, data?: unknown) => log('info', message, data),
        warn: (message: string, data?: unknown) => log('warn', message, data),
        error: (message: string, data?: unknown) => log('error', message, data),
        group: (label: string) => isDevelopment && console.group(label),
        groupEnd: () => isDevelopment && console.groupEnd(),
    };
};

/**
 * Default logger instance
 */
const logger = createLogger();

export default logger;
