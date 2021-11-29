import React, { ReactNode, useContext, useEffect, useState } from 'react'
import { Wallet, Signer } from 'ethers'
import { Nullable } from './types'
import { usePool } from './pool'
import { EntityMetadata } from '@vocdoni/data-models'
import { EntityApi } from '@vocdoni/voting'
import { CacheService } from './cache-service'

interface IEntityContext {
  resolveEntityMetadata: (entityId: string) => Promise<Nullable<EntityMetadata>>
  updateEntityMetadata: (
    entityId: string,
    metadata: EntityMetadata,
    wallet: Wallet | Signer
  ) => Promise<Nullable<EntityMetadata>>
  refreshEntityMetadata: (entityId: string) => Promise<EntityMetadata>
}

export const UseEntityContext = React.createContext<IEntityContext>({
  resolveEntityMetadata: () => {
    throw new Error(
      'Please, define your custom logic alongside <UseEntityContext.Provider> or place UseEntityProvider at the root of your app'
    )
  },
  updateEntityMetadata: () => {
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
  const { resolveEntityMetadata, updateEntityMetadata } = entityContext
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

  const updateMetadata = (
    metadata: EntityMetadata,
    wallet: Wallet | Signer
  ): Promise<void> =>
    updateEntityMetadata(entityId, metadata, wallet).then(() => {
      setMetadata(metadata)
    })

  if (entityContext === null) {
    throw new Error(
      'useEntity() can only be used inside of <UseEntityProvider />, ' +
        'please declare it at a higher level.'
    )
  }

  return { metadata, error, loading, updateMetadata }
}
const CACHED_ENTITY_METADATA_PREFIX = 'entity-metadata-'

export function UseEntityProvider({ children }: { children: ReactNode }) {
  const { poolPromise } = usePool()

  const getEntityMetadata = (
    entityId: string,
    forceRefresh: boolean
  ): Promise<EntityMetadata> => {
    return CacheService.get<EntityMetadata>({
      key: `${CACHED_ENTITY_METADATA_PREFIX}${entityId}`,
      forceRefresh,
      request: () =>
        poolPromise.then(pool => EntityApi.getMetadata(entityId, pool))
    })
  }
  const loadEntityMetadata = (entityId: string) => {
    return getEntityMetadata(entityId, true)
  }

  // Lazy load data, only when needed
  const resolveEntityMetadata: (entityId: string) => Promise<EntityMetadata> = (
    entityId: string
  ) => {
    return getEntityMetadata(entityId, false)
  }

  const updateEntityMetadata = (
    entityId: string,
    metadata: EntityMetadata,
    wallet: Wallet | Signer
  ): Promise<EntityMetadata> =>
    poolPromise.then(pool =>
      EntityApi.setMetadata(entityId, metadata, wallet, pool).then(() => {
        // Update cache with new data
        return CacheService.get<EntityMetadata>({
          key: `${CACHED_ENTITY_METADATA_PREFIX}${entityId}`,
          forceRefresh: true,
          request: () => Promise.resolve(metadata)
        })
      })
    )

  return (
    <UseEntityContext.Provider
      value={{
        resolveEntityMetadata,
        updateEntityMetadata,
        refreshEntityMetadata: loadEntityMetadata
      }}
    >
      {children}
    </UseEntityContext.Provider>
  )
}
