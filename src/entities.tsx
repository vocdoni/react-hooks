import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { Nullable } from './types'
import { usePool } from './pool'
import { EntityApi, EntityMetadata } from 'dvote-js'

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
  const [metadata, setMetadata] = useState<Nullable<EntityMetadata>>(null)
  const [error, setError] = useState<Nullable<string>>(null)
  const [loading, setLoading] = useState(false) // to force rerender after the referenced entities change

  useEffect(() => {
    let ignore = false

    const update = () => {
      if (!entityId) return

      setLoading(true)

      entityContext
        .resolveEntityMetadata(entityId)
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
    }
    update()

    return () => {
      ignore = true
    }
  }, [entityId, entityContext])

  if (entityContext === null) {
    throw new Error(
      'useEntity() can only be used inside of <UseEntityProvider />, ' +
        'please declare it at a higher level.'
    )
  }

  return { metadata, error, loading }
}

export function UseEntityProvider({ children }: { children: ReactNode }) {
  // TODO: Use swr instead of the local cache

  const entities = useRef(new Map<string, EntityMetadata>())
  const { poolPromise } = usePool()

  const loadEntityMetadata: (
    entityId: string
  ) => Promise<EntityMetadata> = useCallback(
    (entityId: string) => {
      return poolPromise
        .then(pool => EntityApi.getMetadata(entityId, pool))
        .then(metadata => {
          entities.current.set(entityId, metadata)
          return metadata
        })
    },
    [poolPromise]
  )

  const resolveEntityMetadata: (
    entityId: string
  ) => Promise<Nullable<EntityMetadata>> = (entityId: string) => {
    if (!entityId) return Promise.resolve(null)
    else if (entities.current.has(entityId)) {
      // cached
      return Promise.resolve(entities.current.get(entityId) || null)
    }
    return loadEntityMetadata(entityId)
  }

  return (
    <UseEntityContext.Provider
      value={{
        entities: entities.current,
        resolveEntityMetadata,
        refreshEntityMetadata: loadEntityMetadata
      }}
    >
      {children}
    </UseEntityContext.Provider>
  )
}
