import React, { ReactNode, useContext, useEffect, useState } from 'react'
import { Nullable } from './types'
import { usePool } from './pool'
import {
  IProcessSummary,
  IProcessState,
  VotingApi,
  ProcessMetadata,
  FileApi,
  VochainProcessStatus,
  IProcessDetails
} from 'dvote-js'
import { cacheService } from './cache-service'

interface IProcessContext {
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
  const [process, setProcess] = useState<IProcessDetails>()
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

  return { process, error, loading, refresh: refreshProcessState }
}

export type SummaryProcess = {
  id: string
  summary?: IProcessSummary
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
    data: IProcessSummary | ProcessMetadata
  ) => {
    setProcesses((prevProcesses: SummaryProcess[]) => {
      const updatedProcesses = [...prevProcesses]

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

  const resolveProcesses = (
    resolveProcessIds: string[],
    refreshCache = false
  ): CancelUpdate => {
    let ignore = false

    setLoading(true)

    //Keep the list with non updated processes
    setProcesses((prevProcesses: SummaryProcess[]) =>
      resolveProcessIds.map((processId: string) => {
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
      resolveProcessIds.map(processId => {
        const retrieveSummary = refreshCache
          ? refreshProcessSummary
          : resolveProcessSummary

        return retrieveSummary(processId)
          .then((summary: IProcessSummary) => {
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

  const refreshProcesses = (): CancelUpdate => {
    return resolveProcesses(processIds, true)
  }

  useEffect(() => {
    if (!processIds || !processIds.length) {
      setLoading(false)
      return () => {}
    }

    const cancelRefresh = resolveProcesses(processIds)

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

  return { processes, refreshProcesses, error, loading }
}

export function UseProcessProvider({ children }: { children: ReactNode }) {
  const { poolPromise } = usePool()

  // FULL VOCHAIN STATE
  const loadProcessState = (processId: string) =>
    getProcessState(processId, true)

  const resolveProcessState = (processId: string): Promise<IProcessState> =>
    getProcessState(processId, false)

  const getProcessState = (
    processId: string,
    regenerate: boolean
  ): Promise<IProcessState> => {
    if (!processId) return Promise.resolve(null)

    return poolPromise.then(pool =>
      cacheService<IProcessState>({
        options: { id: `process-state-${processId}`, regenerate },
        request: () => VotingApi.getProcessState(processId, pool)
      })
    )
  }

  // PROCESS SUMMARY (VOCHAIN)
  const loadProcessSummary = (processId: string) =>
    getProcessSummary(processId, true)

  const resolveProcessSummary: (
    processId: string
  ) => Promise<IProcessSummary> = (processId: string) =>
    getProcessSummary(processId, false)

  const getProcessSummary = (processId: string, regenerate: boolean) => {
    // Lazy load data, only if needed
    if (!processId) return Promise.resolve(null)

    return poolPromise.then(pool =>
      cacheService<IProcessSummary>({
        options: { id: `process-summary-${processId}`, regenerate },
        request: () => VotingApi.getProcessSummary(processId, pool)
      })
    )
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
    regenerate
  ): Promise<ProcessMetadata> => {
    // Lazy load data, only if needed
    if (!processId) return Promise.resolve(null)

    return poolPromise.then(pool =>
      cacheService<ProcessMetadata>({
        options: { id: `process-metadata-${processId}`, regenerate },
        request: () => {
          if (ipfsUri) {
            return FileApi.fetchString(ipfsUri, pool).then(result =>
              JSON.parse(result)
            )
          }

          return VotingApi.getProcessMetadata(processId, pool)
        }
      })
    )
  }

  return (
    <UseProcessContext.Provider
      value={{
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
