import { useState, useCallback } from 'react'

export const useForceUpdate = () => {
  const [, updateState] = useState<any>({})
  return useCallback(() => updateState({}), [])
}

// Promise wrapper

export class Deferred<T> {
  promise: Promise<T> = new Promise((resolve, reject) => {
    this.resolve = value => {
      this.settled = true
      resolve(value)
    }
    this.reject = reason => {
      this.settled = true
      reject(reason)
    }
  })
  settled = false
  resolve: (value: T | PromiseLike<T>) => void
  reject: (error: Error) => void
}

/** Waits `delay` milliseconds and executes the given `fn` returning its promise */
export function delayedPromise<T>(delay: number, fn: () => T) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  }).then(() => fn())
}
