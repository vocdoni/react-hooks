# Vocdoni React Hooks

A set of React hooks for UI clients making use of the Vocdoni ecosystem, a universally verifiable, privacy-centric and scalable digital voting protocol.

## Get started

```bash
npm i @vocdoni/react-hooks
```

The packages `dvote-js`, `use-wallet` and `ethers` are also required.

## Providers

At the root of your project, add the following providers:

```tsx

import React, { useEffect, useState } from 'react'
import { UsePoolProvider, UseProcessProvider, UseEntityProvider, usePool, useProcess, useProcesses, useEntity } from '../.'

const BOOTNODE_URI = "https://bootnodes.vocdoni.net/gateways.dev.json"
const ENVIRONMENT = "dev" 
const NETWORK_ID = "rinkeby"
const CHAIN_ID = 4

const MyApp = () => {
  return (
    <UsePoolProvider bootnodeUri={BOOTNODE_URI} networkId={NETWORK_ID} environment={ENVIRONMENT}>
      <UseProcessProvider>
        <UseEntityProvider>
          <UseBlockStatusProvider>
            
            // ...
            <MyMainComponent /> 

          </UseBlockStatusProvider>
        </UseEntityProvider>
      </UseProcessProvider>
    </UsePoolProvider>
  )
}
```

While not all of them are needed, the **Process** hooks depend on `UsePoolProvider` being avilable.

## Hooks

### Gateway Pool

To get a Gateway Pool:

```tsx
const PoolComponent = () => {
  const { pool, poolPromise, loading, error, retry, refresh } = usePool()

  useEffect(() => {
    poolPromise
      .then(pool => { // Do something with the gateway pool instance
        return VotingApi.getResultsDigest(myProcessId, pool)
      })
      .then(console.log) // results
      .catch(console.error) // err
  }, [])

  return <div>
    <h2>Gateway Pool</h2>
    <p>The Gateway Pool is {loading ? "being loaded" : "ready"}</p>
    {pool ? <p>Ready</p> : null}
    {error ? <p>Error: {error}</p> : null}
    {error && pool ? <p><button onClick={refresh}>Refresh</button></p> : null}
    {error && !pool ? <button onClick={retry}>Retry</button> : null}
  </div>
}
```

The `poolPromise` object is guaranteed to be a non-null Promise, resolving to a valid Gateway Pool instance, as many times as it is evaluated. 

Using `pool` is discouraged, use `poolPromise` instead.

### Process info (single)

To get a cached version of a process' details:

```tsx
const processId = "0x1234..."

const ProcessComponent = () => {
  const { process, loading, error } = useProcess(processId)

  return <div>
    <h2>Process</h2>
    <p>The Process details are {loading ? "being loaded" : "ready"}</p>
    {
      !process ? null : <>
        <pre>Process ID: {process.id}</pre>
        <pre>Entity Address: {process.entity}</pre>
        <pre>{JSON.stringify(process.metadata, null, 2)}</pre>
        <pre>{JSON.stringify(process.parameters, null, 2)}</pre>
      </>
    }
    {error ? <p>Error: {error}</p> : null}
  </div>
}
```

### Process info (list)

```tsx
const processIds = ["0x1234...", "0x2345..."]

const ProcessesComponent = () => {
  const { processes, loading, error } = useProcesses(processIds)

  // processes is a Map<string, ProcessInfo>

  return <div>
    <h2>Processes</h2>
    <p>The Process details are {loading ? "being loaded" : "ready"}</p>
    <ul>
      {
        processIds.map(id => {
          const processInfo = processes.get(id)
          if (!processInfo) return <li key={id}>Loading {id.substr(0, 6)}...</li>
          return <li key={id}>{processInfo.metadata.title.default}</li>
        })
      }
    </ul>
    {error ? <p>Error: {error}</p> : null}
  </div>
}
```

### Entity metadata

To get a cached version of an entity's metadata:

```tsx
const entityId = "0x1234..."

const EntityComponent = () => {
  const { metadata, loading, error } = useEntity(entityId)

  return <div>
    <h2>Entity</h2>
    <p>The entity details are {loading ? "being loaded" : "ready"}</p>
    {
      !metadata ? null : <>
        <pre>Entity ID: {entityId}</pre>
        <pre>{JSON.stringify(metadata, null, 2)}</pre>
      </>
    }
    {error ? <p>Error: {error}</p> : null}
  </div>
}
```

### Date/block estimation

```tsx
const DateBlockComponent = () => {
  const targetBlock = 123
  const targetDate = new Date(2030, 10, 10, 10, 10)

  // Two-way estimation
  const { blockHeight } = useBlockHeight()
  const { blockStatus } = useBlockStatus()
  const { date, loading, error } = useDateAtBlock(targetBlock)
  const { blockHeight: estimatedBlockNumber } = useBlockAtDate(targetDate)

  return <div>
    <h2>Date/block estimation</h2>
    <p>The block status details are {loading ? "being loaded" : "ready"}</p>
    {blockHeight ? <p>Current block {blockHeight}</p> : null}
    {!date ? null : <p>Date at block {targetBlock}: {date.toJSON()}</p>}
    {estimatedBlockNumber ? <p>Block on {targetDate.toJSON()}: {estimatedBlockNumber}</p> : null}
    {!blockStatus ? null : <pre>{JSON.stringify(blockStatus, null, 2)}</pre>}
    {error ? <p>Error: {error}</p> : null}
  </div>
}
```

## Example

Check out `example/index.tsx` for a working example.

```bash
cd example
npm install
npm start
```
