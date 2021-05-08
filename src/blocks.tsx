import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode
} from 'react'
import { BlockStatus, VotingApi } from 'dvote-js'
import { usePool } from './pool'
import { Nullable } from './types'

// Context
export type BlockStatusContext = {
  blockStatus: BlockStatus
  loading: boolean
  error: string
}
const DEFAULT_VALUE: BlockStatusContext = {
  blockStatus: { blockNumber: 0, blockTimes: [], blockTimestamp: 0 },
  loading: false,
  error: ''
}
export const UseBlockStatusContext = createContext<BlockStatusContext>(
  DEFAULT_VALUE
)

// Frontend

export function useDateAtBlock(vochainBlock: number) {
  const poolContext = useContext(UseBlockStatusContext)
  if (poolContext === null) {
    throw new Error(
      'useDateAtBlock() can only be used on the descendants of <UseBlockStatusProvider />, ' +
        'please declare it at a higher level.'
    )
  }
  const { blockStatus, loading, error } = poolContext

  if (!blockStatus) {
    return { date: null, loading, error }
  }

  const date = VotingApi.estimateDateAtBlockSync(vochainBlock, blockStatus)

  return { date, loading, error }
}

export function useBlockAtDate(date: Date) {
  const poolContext = useContext(UseBlockStatusContext)
  if (poolContext === null) {
    throw new Error(
      'useBlockAtDate() can only be used on the descendants of <UseBlockStatusProvider />, ' +
        'please declare it at a higher level.'
    )
  }
  const { blockStatus, loading, error } = poolContext

  if (!blockStatus) {
    return { blockHeight: null, loading, error }
  }

  const blockHeight = VotingApi.estimateBlockAtDateTimeSync(date, blockStatus)

  return { blockHeight, loading, error }
}

// Backend

export function UseBlockStatusProvider({ children }: { children: ReactNode }) {
  const { poolPromise } = usePool()
  const [blockStatus, setBlockStatus] = useState<Nullable<BlockStatus>>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Nullable<string>>(null)

  // Auto update
  useEffect(() => {
    const interval = setInterval(() => fetchBlockStatus(), 1000 * 13)
    fetchBlockStatus()

    return () => clearInterval(interval)
  }, [])

  // Loader
  const fetchBlockStatus = () => {
    if (typeof window == 'undefined') return

    setLoading(true)

    poolPromise
      .then(pool => VotingApi.getBlockStatus(pool))
      .then(blockStatus => {
        setLoading(false)
        setError('')
        setBlockStatus(blockStatus)
      })
      .catch(err => {
        setLoading(false)
        setError(err?.message || err?.toString?.())
      })
  }

  return (
    <UseBlockStatusContext.Provider value={{ blockStatus, loading, error }}>
      {children}
    </UseBlockStatusContext.Provider>
  )
}
