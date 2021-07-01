interface IOptions {
  id: string
  regenerate?: boolean
}

interface IUseCacheProps<T> {
  options: IOptions
  request: () => Promise<T>
}

const requests = new Map<string, any>([])

export function cacheService<T>({
  options,
  request
}: IUseCacheProps<T>): Promise<T> {
  const promise = new Promise<T>((resolve, reject) => {
    if (requests.has(options.id) && !options.regenerate) {
      resolve(requests.get(options.id))

      return
    }

    request()
      .then((data: T) => {
        requests.set(options.id, data)

        resolve(data)
      })
      .catch(error => {
        requests.delete(options.id)

        reject(error)
      })
  })

  return promise
}
