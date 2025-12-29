/**
 * Debug logging utility
 * Conditionally logs based on environment to reduce production noise
 */

const DEBUG = process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true'

/**
 * Log debug messages (only in development or when DEBUG=true)
 */
export const debugLog = DEBUG
    ? (...args: unknown[]) => console.log('[DEBUG]', ...args)
    : () => { }

/**
 * Log debug warnings (only in development or when DEBUG=true)
 */
export const debugWarn = DEBUG
    ? (...args: unknown[]) => console.warn('[DEBUG]', ...args)
    : () => { }

/**
 * Log debug errors (always logs - errors should never be silenced)
 */
export const debugError = (...args: unknown[]) => console.error('[ERROR]', ...args)

/**
 * Create a prefixed logger for a specific module
 */
export function createLogger(prefix: string) {
    return {
        log: DEBUG ? (...args: unknown[]) => console.log(`[${prefix}]`, ...args) : () => { },
        warn: DEBUG ? (...args: unknown[]) => console.warn(`[${prefix}]`, ...args) : () => { },
        error: (...args: unknown[]) => console.error(`[${prefix}]`, ...args),
    }
}
