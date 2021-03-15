import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode
} from 'react'
import { EthNetworkID, GatewayPool, VocdoniEnvironment } from 'dvote-js'
import { Nullable } from './types'

interface IPoolContext {
  pool: Nullable<GatewayPool>
  poolPromise: Promise<GatewayPool>
  loading: boolean
  error: Nullable<string>
  refresh: () => void
}

export const UsePoolContext = createContext<IPoolContext>({
  pool: null,
  poolPromise: null as any,
  loading: false,
  error: null,
  refresh: () => {}
})

export function usePool() {
  const poolContext = useContext(UsePoolContext)
  if (poolContext === null) {
    throw new Error(
      'usePool() can only be used on the descendants of <UsePoolProvider />, ' +
        'please declare it at a higher level.'
    )
  }
  return poolContext
}

export function UsePoolProvider({
  bootnodeUri,
  networkId,
  environment,
  children
}: {
  bootnodeUri: string
  networkId: EthNetworkID
  environment: VocdoniEnvironment
  children: ReactNode
}) {
  // Promise holder for requests arriving before the pool is available
  let resolvePoolPromise: (pool: GatewayPool) => any
  let poolPromise: Promise<GatewayPool>

  const [pool, setPool] = useState<Nullable<GatewayPool>>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Nullable<string>>(null)

  // Initial load
  useEffect(() => {
    let newPool: GatewayPool

    setLoading(true)

    GatewayPool.discover({
      bootnodesContentUri: bootnodeUri,
      networkId: networkId,
      environment: environment
    })
      .then(discoveredPool => {
        newPool = discoveredPool

        return newPool.init()
      })
      .then(() => {
        setPool(newPool)
        setError(null)
        setLoading(false)

        // Notify early awaiters
        resolvePoolPromise?.(newPool)
        return newPool
      })
      .catch(err => {
        setLoading(false)
        setError((err && err.message) || err?.toString())
        throw err
      })

    // Cleanup
    return () => {
      newPool?.disconnect?.()
    }
  }, [environment, bootnodeUri, networkId])

  // Manual refresh
  const refresh = () => {
    if (!pool) return

    setLoading(true)
    pool
      .refresh()
      .then(() => {
        setLoading(false)

        // Notify early awaiters
        resolvePoolPromise?.(pool)
        return pool
      })
      .catch(err => {
        setLoading(false)

        setError((err && err.message) || err?.toString())
        throw err
      })
  }

  // Ensure that by default, resolvePool always has a promise
  if (pool == null) {
    poolPromise = new Promise<GatewayPool>(resolve => {
      resolvePoolPromise = resolve
    })
  } else {
    poolPromise = Promise.resolve(pool)
  }

  return (
    <UsePoolContext.Provider
      value={{ pool, poolPromise, loading, error, refresh }}
    >
      {children}
    </UsePoolContext.Provider>
  )
}
