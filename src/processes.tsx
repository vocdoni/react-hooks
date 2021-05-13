import React, {
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { Nullable } from './types'
import { usePool } from './pool'
import { IProcessInfo, VotingApi } from 'dvote-js'
import { useForceUpdate } from './util'

interface IProcessContext {
  processes: Map<string, IProcessInfo>
  resolveProcessInfo: (processId: string) => Promise<Nullable<IProcessInfo>>
  refreshProcessInfo: (processId: string) => Promise<IProcessInfo>
}

export const UseProcessContext = React.createContext<IProcessContext>({
  processes: new Map<string, IProcessInfo>(),
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
  const { processes, resolveProcessInfo } = processContext
  const [processInfo, setProcessInfo] = useState<Nullable<IProcessInfo>>(() =>
    processes.get(processId)
  )
  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    if (!processId) return () => {}

    setLoading(true)

    resolveProcessInfo(processId)
      .then(newInfo => {
        if (ignore) return
        setLoading(false)
        setProcessInfo(newInfo)
        setError(null)
      })
      .catch(err => {
        if (ignore) return
        setLoading(false)
        setError(err?.message || err?.toString?.())
      })

    return () => {
      ignore = true
    }
  }, [processId])

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
  const [loading, setLoading] = useState(true)
  const { processes, resolveProcessInfo } = processContext

  useEffect(() => {
    if (!processIds) return () => {}
    let ignore = false

    setLoading(true)

    // Signal a refresh on the token processIds
    Promise.all(processIds.map(address => resolveProcessInfo(address)))
      .then(() => {
        if (ignore) return
        setLoading(false)
        setError(null)
      })
      .catch(err => {
        if (ignore) return
        setLoading(false)
        setError(err?.message || err?.toString?.())
      })
    return () => {
      ignore = true
    }
  }, [processIds])

  if (processContext === null) {
    throw new Error(
      'useProcesses() can only be used inside of <UseProcessProvider />, ' +
        'please declare it at a higher level.'
    )
  }
  return { processes, error, loading }
}

export function UseProcessProvider({ children }: { children: ReactNode }) {
  const processesMap = useRef(new Map<string, IProcessInfo>())
  const processesLoading = useRef(new Map<string, Promise<IProcessInfo>>())
  const { poolPromise } = usePool()
  // Force an update when a processesMap entry has changed
  const forceUpdate = useForceUpdate()

  const loadProcessInfo = (processId: string) => {
    const prom = poolPromise
      .then(pool => VotingApi.getProcess(processId, pool))
      .then(processInfo => {
        processesMap.current.set(processId, processInfo)
        processesLoading.current.delete(processId)
        forceUpdate()
        return processInfo
      })
      .catch(err => {
        processesLoading.current.delete(processId)
        throw err
      })

    // let consumers await this promise multiple times
    processesLoading.current.set(processId, prom)

    return prom
  }

  // Lazy load data, only when needed
  const resolveProcessInfo: (processId: string) => Promise<IProcessInfo> = (
    processId: string
  ) => {
    if (!processId) return Promise.resolve(null)
    else if (processesLoading.current.has(processId)) {
      // still loading
      return processesLoading.current.get(processId)
    } else if (processesMap.current.has(processId)) {
      // cached
      return Promise.resolve(processesMap.current.get(processId) || null)
    }
    return loadProcessInfo(processId)
  }

  return (
    <UseProcessContext.Provider
      value={{
        processes: processesMap.current,
        resolveProcessInfo,
        refreshProcessInfo: loadProcessInfo
      }}
    >
      {children}
    </UseProcessContext.Provider>
  )
}
