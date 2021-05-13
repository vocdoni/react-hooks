import React, {
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { Nullable } from './types'
import { usePool } from './pool'
import { EntityApi, EntityMetadata } from 'dvote-js'
import { useForceUpdate } from './util'

interface IEntityContext {
  entities: Map<string, EntityMetadata>
  resolveEntityMetadata: (entityId: string) => Promise<Nullable<EntityMetadata>>
  refreshEntityMetadata: (entityId: string) => Promise<EntityMetadata>
}

export const UseEntityContext = React.createContext<IEntityContext>({
  entities: new Map<string, EntityMetadata>(),
  resolveEntityMetadata: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseEntityContext.Provider> or place UseEntityProvider at the root of your app'
    )
  },
  refreshEntityMetadata: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseEntityContext.Provider> or place UseEntityProvider at the root of your app'
    )
  }
})

export function useEntity(entityId: string) {
  const entityContext = useContext(UseEntityContext)
  const { resolveEntityMetadata } = entityContext
  const [metadata, setMetadata] = useState<Nullable<EntityMetadata>>(null)
  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(false) // to force rerender after the referenced entities change

  useEffect(() => {
    let ignore = false

    if (!entityId) return () => {}

    setLoading(true)

    resolveEntityMetadata(entityId)
      .then(newInfo => {
        if (ignore) return
        setLoading(false)
        setMetadata(newInfo)
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
  }, [entityId])

  if (entityContext === null) {
    throw new Error(
      'useEntity() can only be used inside of <UseEntityProvider />, ' +
        'please declare it at a higher level.'
    )
  }

  return { metadata, error, loading }
}

export function UseEntityProvider({ children }: { children: ReactNode }) {
  const entitiesMap = useRef(new Map<string, EntityMetadata>())
  const entitiesLoading = useRef(new Map<string, Promise<EntityMetadata>>())
  const { poolPromise } = usePool()
  // Force an update when a processesMap entry has changed
  const forceUpdate = useForceUpdate()

  const loadEntityMetadata = (entityId: string) => {
    const prom = poolPromise
      .then(pool => EntityApi.getMetadata(entityId, pool))
      .then(metadata => {
        entitiesMap.current.set(entityId, metadata)
        entitiesLoading.current.delete(entityId)
        forceUpdate()
        return metadata
      })
      .catch(err => {
        entitiesLoading.current.delete(entityId)
        throw err
      })

    // let consumers await this promise multiple times
    entitiesLoading.current.set(entityId, prom)

    return prom
  }

  // Lazy load data, only when needed
  const resolveEntityMetadata: (entityId: string) => Promise<EntityMetadata> = (
    entityId: string
  ) => {
    if (!entityId) return Promise.resolve(null)
    else if (entitiesLoading.current.has(entityId)) {
      // still loading
      return entitiesLoading.current.get(entityId)
    } else if (entitiesMap.current.has(entityId)) {
      // cached
      return Promise.resolve(entitiesMap.current.get(entityId) || null)
    }
    return loadEntityMetadata(entityId)
  }

  return (
    <UseEntityContext.Provider
      value={{
        entities: entitiesMap.current,
        resolveEntityMetadata,
        refreshEntityMetadata: loadEntityMetadata
      }}
    >
      {children}
    </UseEntityContext.Provider>
  )
}
