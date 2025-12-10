/**
 * Timeout utility for wrapping async operations
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message
 * @returns Promise that resolves/rejects within timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new TimeoutError(
          errorMessage || `Operation timed out after ${timeoutMs}ms`
        )
      )
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutHandle!)
    return result
  } catch (error) {
    clearTimeout(timeoutHandle!)
    throw error
  }
}

/**
 * Timeout constants for different operations
 */
export const TIMEOUTS = {
  /** Text extraction from documents */
  TEXT_EXTRACTION: 15_000, // 15 seconds

  /** AI analysis processing */
  AI_ANALYSIS: 45_000, // 45 seconds

  /** Total API route timeout (must be under Vercel's limit) */
  API_ROUTE_TOTAL: 50_000, // 50 seconds (safe buffer under 60s limit)

  /** Database operations */
  DATABASE_QUERY: 10_000, // 10 seconds

  /** File download from storage */
  FILE_DOWNLOAD: 20_000, // 20 seconds
} as const
