import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode
} from 'react'
import { EthNetworkID, GatewayPool, VocdoniEnvironment } from 'dvote-js'
import { Nullable } from './types'
import { Deferred } from './util'

interface IPoolContext {
  /** The current gateway pool client (use poolPromise instead) */
  pool: Nullable<GatewayPool>
  /** A promise that resolves with the latest functional pool client */
  poolPromise: Promise<GatewayPool>
  /** Whether the discovery is in progress */
  loading: boolean
  /** Whether the discovery failed */
  error: Nullable<string>
  /** Re-run the discovery process on an already working connection */
  refresh: () => Promise<GatewayPool>
  /** If the initial connection failed, starts the discovery from scratch */
  retry: () => Promise<GatewayPool>
}

export const UsePoolContext = createContext<IPoolContext>({
  pool: null,
  poolPromise: null as any,
  loading: false,
  error: null,
  refresh: () => Promise.reject(new Error('Not ready')),
  retry: () => Promise.reject(new Error('Not ready'))
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
  children,
  discoveryTimeout = 2000,
  minNumGateways = 2
}: {
  bootnodeUri: string
  networkId: EthNetworkID
  environment: VocdoniEnvironment
  children: ReactNode
  discoveryTimeout?: number
  minNumGateways?: number
}) {
  const [deferred, setDeferred] = useState(() => new Deferred<GatewayPool>())

  const [pool, setPool] = useState<Nullable<GatewayPool>>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Nullable<string>>(null)

  // Initial load
  useEffect(() => {
    init()

    // Cleanup
    return () => {
      pool?.disconnect?.()
    }
  }, [environment, bootnodeUri, networkId])

  // Do the initial discovery
  const init = () => {
    setLoading(true)

    return GatewayPool.discover({
      bootnodesContentUri: bootnodeUri,
      networkId: networkId,
      timeout: discoveryTimeout,
      numberOfGateways: minNumGateways,
      environment: environment
    })
      .then(pool => {
        // Direct values
        setPool(pool)
        setError(null)
        setLoading(false)

        // Notify promise awaiters
        if (!deferred.settled) {
          deferred.resolve(pool)
        } else {
          const newDeferred = new Deferred<GatewayPool>()
          newDeferred.resolve(pool)
          setDeferred(newDeferred)
        }
        return pool
      })
      .catch(err => {
        setLoading(false)
        setError((err && err.message) || err?.toString())

        // Promise waiters are not notified of errors, so the initial
        // `.then` keeps working without further "retry" elsewhere
        throw err
      })
  }

  // Refresh an already working pool
  const refresh = () => {
    setLoading(true)

    return deferred.promise
      .then(pool => pool.refresh())
      .then(() => {
        setLoading(false)
        return pool
      })
      .catch(err => {
        setLoading(false)
        setError((err && err.message) || err?.toString())
        throw err
      })
  }

  return (
    <UsePoolContext.Provider
      value={{
        pool,
        poolPromise: deferred.promise,
        loading,
        error,
        refresh,
        retry: init
      }}
    >
      {children}
    </UsePoolContext.Provider>
  )
}
