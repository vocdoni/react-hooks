import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { Nullable, ProcessInfo } from './types'
import { usePool } from './pool'
import { GatewayPool, VotingApi } from 'dvote-js'

interface IProcessContext {
  processes: Map<string, ProcessInfo>
  resolveProcessInfo: (processId: string) => Promise<Nullable<ProcessInfo>>
  refreshProcessInfo: (processId: string) => Promise<ProcessInfo>
}

export const UseProcessContext = React.createContext<IProcessContext>({
  processes: new Map<string, ProcessInfo>(),
  resolveProcessInfo: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  },
  refreshProcessInfo: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  }
})

export function useProcess(processId: string) {
  const processContext = useContext(UseProcessContext)
  const [processInfo, setProcessInfo] = useState<Nullable<ProcessInfo>>(null)
  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(false) // to force rerender after the referenced process infos change

  useEffect(() => {
    let ignore = false

    const update = () => {
      if (!processId) return

      setLoading(true)

      processContext
        .resolveProcessInfo(processId)
        .then(newInfo => {
          if (ignore) return
          setLoading(false)
          setProcessInfo(newInfo)
          setError(null)
        })
        .catch(err => {
          if (ignore) return
          setLoading(false)
          setError(err?.message || err?.toString())
        })
    }
    update()

    return () => {
      ignore = true
    }
  }, [processId, processContext])

  if (processContext === null) {
    throw new Error(
      'useProcess() can only be used inside of <UseProcessProvider />, ' +
        'please declare it at a higher level.'
    )
  }

  return { process: processInfo, error, loading }
}

/** Returns an arran containing the available information about the given processIds */
export function useProcesses(processIds: string[]) {
  const processContext = useContext(UseProcessContext)
  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(false) // to force rerender after the referenced process infos change

  useEffect(() => {
    if (!processIds || !processIds.length) return
    let ignore = false

    setLoading(true)

    // Signal a refresh on the current token processIds
    Promise.all(
      processIds.map(address => processContext.resolveProcessInfo(address))
    )
      .then(() => {
        if (ignore) return
        setLoading(false)
        setError(null)
      })
      .catch(err => {
        if (ignore) return
        setLoading(false)
        setError(err?.message || err?.toString())
      })
    return () => {
      ignore = true
    }
  }, [processIds, processContext])

  if (processContext === null) {
    throw new Error(
      'useProcesses() can only be used inside of <UseProcessProvider />, ' +
        'please declare it at a higher level.'
    )
  }
  return { processes: processContext.processes, error, loading }
}

export function UseProcessProvider({ children }: { children: ReactNode }) {
  // TODO: Use swr instead of the local cache

  const processes = useRef(new Map<string, ProcessInfo>())
  const { poolPromise } = usePool()

  const resolveProcessInfo: (
    processId: string
  ) => Promise<Nullable<ProcessInfo>> = useCallback((processId: string) => {
    if (!processId) return Promise.resolve(null)
    else if (processes.current.has(processId)) {
      // cached
      return Promise.resolve(processes.current.get(processId) || null)
    }
    return loadProcessInfo(processId)
  }, [])

  const loadProcessInfo: (
    processId: string
  ) => Promise<ProcessInfo> = useCallback(
    (processId: string) => {
      return poolPromise
        .then(pool => getProcessInfo(processId, pool))
        .then(processInfo => {
          processes.current.set(processId, processInfo)
          return processInfo
        })
    },
    [poolPromise]
  )

  return (
    <UseProcessContext.Provider
      value={{
        processes: processes.current,
        resolveProcessInfo,
        refreshProcessInfo: loadProcessInfo
      }}
    >
      {children}
    </UseProcessContext.Provider>
  )
}

// HELPERS

function getProcessInfo(
  processId: string,
  pool: GatewayPool
): Promise<ProcessInfo> {
  return Promise.all([
    VotingApi.getProcessMetadata(processId, pool),
    VotingApi.getProcessParameters(processId, pool)
  ]).then(results => {
    return {
      metadata: results[0],
      parameters: results[1],
      id: processId, // pass-through to have the value for links
      entity: results[1]?.entityAddress?.toLowerCase?.() || ''
    }
  })
}
