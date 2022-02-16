import React, { ReactNode, useContext, useEffect, useState } from 'react'
import { Nullable } from './types'
import { usePool } from './pool'
import {
  ProcessSummary,
  ProcessState,
  VotingApi,
  ProcessDetails
} from '@vocdoni/voting'
import { FileApi, GatewayPool } from '@vocdoni/client'
import { ProcessMetadata, VochainProcessStatus } from '@vocdoni/data-models'
import { CacheService } from './cache-service'

interface IProcessContext {
  resolveProcessState: (processId: string) => Promise<Nullable<ProcessState>>
  refreshProcessState: (processId: string) => Promise<ProcessState>
  resolveProcessSummary: (
    processId: string
  ) => Promise<Nullable<ProcessSummary>>
  refreshProcessSummary: (processId: string) => Promise<ProcessSummary>
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
  invalidateRegister: (register: CacheRegisterPrefix, processId: string) => void
}

export const UseProcessContext = React.createContext<IProcessContext>({
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
  },
  invalidateRegister: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseProcessContext.Provider> or place UseProcessProvider at the root of your app'
    )
  }
})

/** Resolves the full details of the given process */
export function useProcess(processId: string) {
  const processContext = useContext(UseProcessContext)
  const [process, setProcess] = useState<ProcessDetails>()
  const {
    resolveProcessState,
    resolveProcessMetadata,
    refreshProcessState
  } = processContext

  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    if (!processId) return () => {}

    setLoading(true)

    resolveProcessState(processId)
      .then(newState => {
        if (ignore) throw null

        setProcess({
          id: processId,
          state: { ...newState },
          metadata: undefined
        })

        return resolveProcessMetadata({ processId, ipfsUri: newState.metadata })
      })
      .then((metadata: ProcessMetadata) => {
        if (ignore) return

        setProcess(process => {
          return { ...process, metadata: { ...metadata } }
        })

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

  const refresh = (processId: string) => {
    refreshProcessState(processId)
      .then(newState => {
        setProcess({
          id: processId,
          state: { ...newState },
          metadata: undefined
        })

        return resolveProcessMetadata({ processId, ipfsUri: newState.metadata })
      })
      .then((metadata: ProcessMetadata) => {
        setProcess(process => {
          return { ...process, metadata: { ...metadata } }
        })
        setError(null)
      })
      .catch(err => {
        setError(err?.message || err?.toString?.())
      })
  }

  return { process, error, loading, refresh }
}

export type SummaryProcess = {
  id: string
  summary?: ProcessSummary
  metadata?: ProcessMetadata
}

export type Processes = Array<SummaryProcess>

type CancelUpdate = () => void
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
  const [processes, setProcesses] = useState<Processes>([])
  const [loading, setLoading] = useState(true)
  const {
    resolveProcessSummary,
    refreshProcessSummary,
    resolveProcessMetadata
  } = processContext

  const updateProcessData = (
    processId: string,
    dataKey: 'metadata' | 'summary',
    data: ProcessSummary | ProcessMetadata
  ) => {
    setProcesses((prevProcesses: SummaryProcess[]) => {
      const updatedProcesses = [].concat(prevProcesses)

      for (let processIndex in updatedProcesses) {
        const iterateProcess = updatedProcesses[processIndex]

        if (iterateProcess && iterateProcess.id === processId) {
          updatedProcesses[processIndex] = {
            ...iterateProcess,
            [dataKey]: data
          }

          break
        }
      }

      return updatedProcesses
    })
  }

  const resolveProcessesEffect = (
    processIdsToResolve: string[],
    fromCache = true
  ): CancelUpdate => {
    let ignore = false

    setLoading(true)

    //Keep the list with non updated processes
    setProcesses((prevProcesses: SummaryProcess[]) =>
      processIdsToResolve.map((processId: string) => {
        const cachedProcess = prevProcesses.find(
          (process: SummaryProcess) => process.id === processId
        )

        return (
          cachedProcess || {
            id: processId
          }
        )
      })
    )

    // Load
    Promise.all(
      processIdsToResolve.map(processId => {
        const retrieveSummary = fromCache
          ? resolveProcessSummary
          : refreshProcessSummary

        return retrieveSummary(processId)
          .then((summary: ProcessSummary) => {
            if (ignore) return
            // NOTE:
            // Launching a metadata fetch without waiting for it
            // This allows the `loading` tally to be completed, and allows the
            // hook caller to show a spinner if the metadata is still not available
            updateProcessData(processId, 'summary', summary)

            resolveProcessMetadata({
              processId,
              ipfsUri: summary.metadata
            })
              .then(metadata => {
                if (ignore) return

                updateProcessData(processId, 'metadata', metadata)
              })
              .catch(() => {})
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
  }

  const reloadProcesses = () => {
    resolveProcessesEffect(processIds, false)
  }

  useEffect(() => {
    if (!processIds || !processIds.length) {
      setLoading(false)
      return () => {}
    }

    const cancelRefresh = resolveProcessesEffect(processIds)

    return () => {
      cancelRefresh()
    }
  }, [processIds.join('')])

  if (processContext === null) {
    throw new Error(
      'useProcesses() can only be used inside of <UseProcessProvider />, ' +
        'please declare it at a higher level.'
    )
  }

  return { processes, reloadProcesses, error, loading }
}

export enum CacheRegisterPrefix {
  State = 'process-state-',
  Summary = 'process-summary-',
  Metadata = 'process-metadata-'
}

export function UseProcessProvider({ children }: { children: ReactNode }) {
  const { poolPromise } = usePool()

  // FULL VOCHAIN STATE
  const loadProcessState = (processId: string) =>
    getProcessState(processId, true)

  const resolveProcessState = (processId: string): Promise<ProcessState> =>
    getProcessState(processId, false)

  const getProcessState = (
    processId: string,
    forceRefresh: boolean = false
  ): Promise<ProcessState> => {
    if (!processId) return Promise.resolve(null)

    return CacheService.get<ProcessState>({
      key: `${CacheRegisterPrefix.State}${processId}`,
      forceRefresh,
      request: () =>
        poolPromise.then(pool => VotingApi.getProcessState(processId, pool))
    })
  }

  // PROCESS SUMMARY (VOCHAIN)
  const loadProcessSummary = (processId: string) =>
    getProcessSummary(processId, true)

  const resolveProcessSummary: (
    processId: string
  ) => Promise<ProcessSummary> = (processId: string) =>
    getProcessSummary(processId, false)

  const getProcessSummary = (
    processId: string,
    forceRefresh: boolean = false
  ) => {
    // Lazy load data, only if needed
    if (!processId) return Promise.resolve(null)

    return CacheService.get<ProcessSummary>({
      key: `${CacheRegisterPrefix.Summary}${processId}`,
      forceRefresh,
      request: () =>
        poolPromise.then(pool => VotingApi.getProcessSummary(processId, pool))
    })
  }
  // PROCESS METADATA (IPFS)
  const loadProcessMetadata = ({
    processId,
    ipfsUri
  }: {
    processId: string
    ipfsUri?: string
  }) => getProcessMetadata({ processId, ipfsUri }, true)

  const resolveProcessMetadata = ({
    processId,
    ipfsUri
  }: {
    processId: string
    ipfsUri?: string
  }): Promise<ProcessMetadata> =>
    getProcessMetadata({ processId, ipfsUri }, false)

  const getProcessMetadata = (
    { processId, ipfsUri },
    forceRefresh: boolean = false
  ): Promise<ProcessMetadata> => {
    // Lazy load data, only if needed
    if (!processId) return Promise.resolve(null)

    return CacheService.get<ProcessMetadata>({
      key: `${CacheRegisterPrefix.Metadata}${processId}`,
      forceRefresh,
      request: () =>
        poolPromise.then(pool => {
          if (ipfsUri) {
            return FileApi.fetchString(ipfsUri, pool).then(result =>
              JSON.parse(result)
            )
          }

          return VotingApi.getProcessMetadata(processId, pool)
        })
    })
  }

  const invalidateRegister = (
    registerPrefix: CacheRegisterPrefix,
    processId: string
  ) => {
    CacheService.remove(`${registerPrefix}${processId}`)
  }

  return (
    <UseProcessContext.Provider
      value={{
        resolveProcessSummary,
        refreshProcessSummary: loadProcessSummary,
        resolveProcessState,
        refreshProcessState: loadProcessState,
        resolveProcessMetadata,
        refreshProcessMetadata: loadProcessMetadata,
        invalidateRegister
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
  filters: { status?: VochainProcessStatus; withResults?: boolean } = {}
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

  /* Get the processes id's from the archive */
  const getArchiveProcessIdList = async (
    entityId: string,
    pool: GatewayPool
  ): Promise<string[]> => {
    return VotingApi.getProcessList({ fromArchive: true, entityId }, pool)
  }

  /* Get the processes id's from the gateway */
  const getGwProcessIdList = async (
    entityId: string,
    from: number,
    pool: GatewayPool
  ): Promise<string[]> => {
    return VotingApi.getProcessList(
      { fromArchive: false, entityId, from, ...filters },
      pool
    )
  }

  const getProcessIdList = async (entityId: string) => {
    let from = 0

    const pool = await poolPromise

    let result: string[] = await Promise.all([
      getArchiveProcessIdList(entityId, pool),
      getGwProcessIdList(entityId, from, pool)
    ]).then(result => {
      from += result[1].length
      return result.flat(1)
    })

    if (from === 0) {
      return result
    }

    while (true) {
      const processList = await VotingApi.getProcessList(
        { fromArchive: false, entityId, from, ...filters },
        pool
      )
      if (processList.length === 0) return result

      result = result.concat(processList.map(id => '0x' + id))
      from += processList.length
    }
  }

  return { processIds, error, loading }
}
