/**
 * Performance optimization utilities
 */

/**
 * Throttle function - limits execution to once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Debounce function - delays execution until after delay
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()
  
  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = func(...args)
    cache.set(key, result)
    return result
  }) as T
}

/**
 * Create a batched function that collects calls and executes once
 */
export function batch<T, R>(
  fn: (items: T[]) => Promise<R[]>,
  delay: number = 50
): (item: T) => Promise<R> {
  let queue: Array<{ item: T; resolve: (value: R) => void; reject: (error: any) => void }> = []
  let timeoutId: NodeJS.Timeout | null = null

  const flush = async () => {
    if (queue.length === 0) return

    const currentQueue = queue
    queue = []
    timeoutId = null

    try {
      const items = currentQueue.map(q => q.item)
      const results = await fn(items)
      currentQueue.forEach((q, i) => q.resolve(results[i]))
    } catch (error) {
      currentQueue.forEach(q => q.reject(error))
    }
  }

  return (item: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      queue.push({ item, resolve, reject })

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(flush, delay)
    })
  }
}

/**
 * Lazy import helper
 */
export async function lazyImport<T>(
  factory: () => Promise<{ default: T }>
): Promise<T> {
  const importedModule = await factory()
  return importedModule.default
}

/**
 * Check if IntersectionObserver is supported
 */
export function supportsIntersectionObserver(): boolean {
  return (
    typeof window !== 'undefined' &&
    'IntersectionObserver' in window &&
    'IntersectionObserverEntry' in window
  )
}

/**
 * Request idle callback helper
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if (typeof window === 'undefined') {
    return setTimeout(callback, 0) as unknown as number
  }

  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options)
  }

  return setTimeout(callback, 1) as unknown as number
}

/**
 * Cancel idle callback
 */
export function cancelIdleCallback(id: number): void {
  if (typeof window === 'undefined') return

  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}

/**
 * Measure component render time (development only)
 */
export function measureRender(componentName: string, fn: () => void): void {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    fn()
    const end = performance.now()
    if (typeof console !== 'undefined') {
      console.log(`[Performance] ${componentName} rendered in ${(end - start).toFixed(2)}ms`)
    }
  } else {
    fn()
  }
}
