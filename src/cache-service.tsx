interface ICacheProps<T> {
  /** The unique key identifying the entry to cache */
  key: string
  /** Optionally, force redoing the request again and overwriting the value */
  forceRefresh?: boolean
  /** The function to execute, returning the promise wose result will be cached */
  request: () => Promise<T>
}

export class CacheService {
  static requests = new Map<string, any>([])

  /** Performs a requests if not already cached, and returns the cached value otherwise */
  static get<T>({ key, forceRefresh, request }: ICacheProps<T>): Promise<T> {
    if (CacheService.requests.has(key) && !forceRefresh) {
      return Promise.resolve(CacheService.requests.get(key))
    }

    return request().then((data: T) => {
      CacheService.requests.set(key, data)

      return data
    })
  }

  /** Invalidates the current value for the given key on the cache */
  static remove(key: string) {
    CacheService.requests.delete(key)
  }

  /** Clears the entire cache */
  static clearAll() {
    CacheService.requests.clear()
  }
}
