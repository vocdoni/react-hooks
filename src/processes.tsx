import React, {
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { Nullable } from './types'
import { usePool } from './pool'
import {
  IProcessSummary,
  IProcessState,
  VotingApi,
  ProcessMetadata,
  FileApi,
  IProcessVochainStatus,
  IProcessDetails
} from 'dvote-js'
import { useForceUpdate } from './util'

interface IProcessContext {
  processesSummary: Map<string, IProcessSummary>
  processesState: Map<string, IProcessState>
  processesMetadata: Map<string, ProcessMetadata>
  resolveProcessState: (processId: string) => Promise<Nullable<IProcessState>>
  refreshProcessState: (processId: string) => Promise<IProcessState>
  resolveProcessSummary: (
    processId: string
  ) => Promise<Nullable<IProcessSummary>>
  refreshProcessSummary: (processId: string) => Promise<IProcessSummary>
  resolveProcessMetadata: ({
    processId,
    ipfsUri
  }: {
    processId: string
    ipfsUri?: string
  }) => Promise<Nullable<ProcessMetadata>>
  refreshProcessMetadata: ({
    processId,
    ipfsUri
  }: {
    processId: string
    ipfsUri?: string
  }) => Promise<ProcessMetadata>
}

export const UseProcessContext = React.createContext<IProcessContext>({
  processesSummary: new Map<string, IProcessSummary>(),
  processesState: new Map<string, IProcessState>(),
  processesMetadata: new Map<string, ProcessMetadata>(),

  resolveProcessState: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  },
  refreshProcessState: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  },
  resolveProcessSummary: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  },
  refreshProcessSummary: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  },
  resolveProcessMetadata: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  },
  refreshProcessMetadata: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  }
})

/** Resolves the full details of the given process */
export function useProcess(processId: string) {
  const processContext = useContext(UseProcessContext)
  const {
    processesState,
    processesMetadata,
    resolveProcessState,
    resolveProcessMetadata,
    refreshProcessState
  } = processContext
  const [processState, setProcessState] = useState<Nullable<IProcessState>>(
    () => processesState.get(processId)
  )
  const [processMetadata, setProcessMetadata] = useState<
    Nullable<ProcessMetadata>
  >(() => processesMetadata.get(processId))
  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    if (!processId) return () => {}

    setLoading(true)

    resolveProcessState(processId)
      .then(newState => {
        if (ignore) throw null
        setProcessState(newState)

        return resolveProcessMetadata({ processId, ipfsUri: newState.metadata })
      })
      .then(newMetadata => {
        if (ignore) return
        setProcessMetadata(newMetadata)
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
  }, [processId])

  if (processContext === null) {
    throw new Error(
      'useProcess() can only be used inside of <UseProcessProvider />, ' +
        'please declare it at a higher level.'
    )
  }

  const process: IProcessDetails = {
    id: processId,
    state: processState,
    metadata: processMetadata
  }

  return { process, error, loading, refresh: refreshProcessState }
}

/**
 * Resolves the summary of the given processIds array.
 * NOTE: When `loading` updates from `true` to `false`, only the process params
 * are guaranteed to be defined. This allows arranging processes by status.
 *
 * However, metadata may still be unresolved and the UI should display a loading indicator,
 * when applicable.
 * */
export function useProcesses(processIds: string[]) {
  const processContext = useContext(UseProcessContext)
  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(true)
  const {
    processesSummary,
    processesMetadata,
    resolveProcessSummary,
    resolveProcessMetadata
  } = processContext

  useEffect(() => {
    if (!processIds || !processIds.length) {
      setLoading(false)
      return () => {}
    }
    let ignore = false

    setLoading(true)

    // Load
    Promise.all(
      processIds.map(processId => {
        return resolveProcessSummary(processId)
          .then(summary => {
            // NOTE:
            // Launching a metadata fetch without waiting for it
            // This allows the `loading` tally to be completed, and allows the
            // hook caller to show a spinner if the metadata is still not available
            resolveProcessMetadata({
              processId,
              ipfsUri: summary.metadata
            }).catch(() => {})
          })
          .catch(() => {})
      })
    )
      .then(() => {
        if (ignore) return
        setLoading(false)
        setError(null)
      })
      .catch(() => {
        if (ignore) return
        setLoading(false)
        setError('One or more processes failed to load')
      })

    return () => {
      ignore = true
    }
  }, [processIds.join('')])

  if (processContext === null) {
    throw new Error(
      'useProcesses() can only be used inside of <UseProcessProvider />, ' +
        'please declare it at a higher level.'
    )
  }

  const processes: {
    id: string
    summary: IProcessSummary
    metadata?: ProcessMetadata
  }[] = processIds.map(processId => ({
    id: processId,
    summary: processesSummary.get(processId),
    metadata: processesMetadata.get(processId) || null
  }))

  return { processes, error, loading }
}

export function UseProcessProvider({ children }: { children: ReactNode }) {
  const { poolPromise } = usePool()
  const processSummaryCache = useRef(new Map<string, IProcessSummary>())
  const processStateCache = useRef(new Map<string, IProcessState>())
  const processMetadataCache = useRef(new Map<string, ProcessMetadata>())
  const processSummaryLoading = useRef(
    new Map<string, Promise<IProcessSummary>>()
  )
  const processStateLoading = useRef(new Map<string, Promise<IProcessState>>())
  const processMetadataLoading = useRef(
    new Map<string, Promise<ProcessMetadata>>()
  )

  // Force an update when a processes entry has changed
  const forceUpdate = useForceUpdate()

  // FULL VOCHAIN STATE
  const loadProcessState = (processId: string) => {
    const prom = poolPromise
      .then(pool => VotingApi.getProcessState(processId, pool))
      .then(processState => {
        processStateCache.current.set(processId, processState)
        processStateLoading.current.delete(processId)
        forceUpdate()
        return processState
      })
      .catch(err => {
        processStateLoading.current.delete(processId)
        throw err
      })

    // let consumers await this promise multiple times
    processStateLoading.current.set(processId, prom)

    return prom
  }

  const resolveProcessState: (processId: string) => Promise<IProcessState> = (
    processId: string
  ) => {
    // Lazy load data, only if needed
    if (!processId) return Promise.resolve(null)
    else if (processStateLoading.current.has(processId)) {
      // still loading
      return processStateLoading.current.get(processId)
    } else if (processStateCache.current.has(processId)) {
      // cached
      return Promise.resolve(processStateCache.current.get(processId) || null)
    }
    return loadProcessState(processId)
  }

  // PROCESS SUMMARY (VOCHAIN)
  const loadProcessSummary = (processId: string) => {
    const prom = poolPromise
      .then(pool => VotingApi.getProcessSummary(processId, pool))
      .then(processSummary => {
        processSummaryCache.current.set(processId, processSummary)
        processSummaryLoading.current.delete(processId)
        forceUpdate()
        return processSummary
      })
      .catch(err => {
        processSummaryLoading.current.delete(processId)
        throw err
      })

    // let consumers await this promise multiple times
    processSummaryLoading.current.set(processId, prom)

    return prom
  }

  const resolveProcessSummary: (
    processId: string
  ) => Promise<IProcessSummary> = (processId: string) => {
    // Lazy load data, only if needed
    if (!processId) return Promise.resolve(null)
    else if (processSummaryLoading.current.has(processId)) {
      // still loading
      return processSummaryLoading.current.get(processId)
    } else if (processSummaryCache.current.has(processId)) {
      // cached
      return Promise.resolve(processSummaryCache.current.get(processId) || null)
    }
    return loadProcessSummary(processId)
  }

  // PROCESS METADATA (IPFS)
  const loadProcessMetadata = ({
    processId,
    ipfsUri
  }: {
    processId: string
    ipfsUri?: string
  }) => {
    const prom = poolPromise
      .then(pool => {
        const uri =
          ipfsUri || processSummaryCache.current?.get?.(processId)?.entityId
        if (uri) {
          return FileApi.fetchString(uri, pool).then(result =>
            JSON.parse(result)
          )
        }
        return VotingApi.getProcessMetadata(processId, pool)
      })
      .then(processMetadata => {
        processMetadataCache.current.set(processId, processMetadata)
        processMetadataLoading.current.delete(processId)
        forceUpdate()
        return processMetadata
      })
      .catch(err => {
        processMetadataLoading.current.delete(processId)
        throw err
      })

    // let consumers await this promise multiple times
    processMetadataLoading.current.set(processId, prom)

    return prom
  }

  const resolveProcessMetadata: ({
    processId,
    ipfsUri
  }: {
    processId: string
    ipfsUri?: string
  }) => Promise<ProcessMetadata> = ({ processId, ipfsUri }) => {
    // Lazy load data, only if needed
    if (!processId) return Promise.resolve(null)
    else if (processMetadataLoading.current.has(processId)) {
      // still loading
      return processMetadataLoading.current.get(processId)
    } else if (processMetadataCache.current.has(processId)) {
      // cached
      return Promise.resolve(
        processMetadataCache.current.get(processId) || null
      )
    }
    return loadProcessMetadata({ processId, ipfsUri })
  }

  return (
    <UseProcessContext.Provider
      value={{
        processesSummary: processSummaryCache.current,
        processesState: processStateCache.current,
        processesMetadata: processMetadataCache.current,
        resolveProcessSummary,
        refreshProcessSummary: loadProcessSummary,
        resolveProcessState,
        refreshProcessState: loadProcessState,
        resolveProcessMetadata,
        refreshProcessMetadata: loadProcessMetadata
      }}
    >
      {children}
    </UseProcessContext.Provider>
  )
}

// Entity related

/** Resolves the list of processIds for the given entity, applying the given filters */
export function useEntityProcessIdList(
  entityId: string,
  filters: { status?: IProcessVochainStatus; withResults?: boolean } = {}
) {
  const { poolPromise } = usePool()
  const [processIds, setProcessIds] = useState<string[]>([])
  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entityId) {
      setLoading(false)
      return () => {}
    }
    let ignore = false

    setLoading(true)

    // Load
    getProcessIdList(entityId)
      .then(processIds => {
        if (ignore) return
        setProcessIds(processIds)
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
  }, [entityId])

  const getProcessIdList = async (entityId: string) => {
    let result: string[] = []
    let from = 0

    const pool = await poolPromise

    while (true) {
      const processList = await VotingApi.getProcessList(
        { entityId, from, ...filters },
        pool
      )
      if (processList.length == 0) return result

      result = result.concat(processList.map(id => '0x' + id))
      from += processList.length
    }
    return result
  }

  return { processIds, error, loading }
}
