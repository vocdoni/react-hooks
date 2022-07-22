import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode
} from 'react'
import { EthNetworkID, VocdoniEnvironment } from '@vocdoni/common'
import { GatewayPool } from '@vocdoni/client'
import { Nullable } from './types'
import { Deferred, delayedPromise } from './util'

const RETRY_INTERVAL = 1000 * 5 // 5 seconds
const RETRY_COUNT_DEFAULT_VALUE = 5

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
  retry: ({
    retryOnError
  }: { retryOnError?: boolean } | undefined) => {
    promise: Promise<GatewayPool>
    stopRetry: () => void
  }
}

export const UsePoolContext = createContext<IPoolContext>({
  pool: null,
  poolPromise: null as any,
  loading: false,
  error: null,
  refresh: () => Promise.reject(new Error('Not ready yet')),
  retry: () => ({
    promise: Promise.reject(new Error('Not ready yet')),
    stopRetry: () => {
      throw new Error('Not ready yet')
    }
  })
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
  discoveryTimeout = 2500,
  minNumGateways = 1,
  archiveIpnsId = ''
}: {
  bootnodeUri: string | string[]
  networkId: EthNetworkID
  environment: VocdoniEnvironment
  children: ReactNode
  discoveryTimeout?: number
  minNumGateways?: number
  archiveIpnsId?: string
}) {
  const [deferred, setDeferred] = useState(() => new Deferred<GatewayPool>())

  const [pool, setPool] = useState<Nullable<GatewayPool>>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Nullable<string>>(null)

  // Initial load
  useEffect(() => {
    const { stopRetry } = init({ retryOnError: true })

    // Cleanup
    return () => {
      pool?.disconnect?.()
      stopRetry()
    }
  }, [environment, bootnodeUri, networkId])

  // Do the initial discovery
  const init = ({ retryOnError }: { retryOnError?: boolean } = {}) => {
    setLoading(true)

    let initRetryCount = RETRY_COUNT_DEFAULT_VALUE
    const stopRetry = () => {
      initRetryCount = -1
    }

    const promise: Promise<GatewayPool> = GatewayPool.discover({
      bootnodesContentUri: bootnodeUri,
      networkId: networkId,
      timeout: discoveryTimeout,
      numberOfGateways: minNumGateways,
      environment: environment,
      archiveIpnsId: archiveIpnsId
    })
      .then(pool => {
        // Direct values
        setPool(pool)
        setError(null)
        setLoading(false)
        initRetryCount = RETRY_COUNT_DEFAULT_VALUE

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
        initRetryCount--

        setLoading(false)
        setError((err && err.message) || err?.toString())

        if (retryOnError && initRetryCount >= 0) {
          return delayedPromise(
            () => init({ retryOnError: true }).promise,
            RETRY_INTERVAL
          )
        }

        // Notify promise waiters that the process failed
        throw err
      })

    return {
      promise,
      stopRetry
    }
  }

  // Refresh the nodes of an already working pool
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
