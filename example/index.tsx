import 'react-app-polyfill/ie11'
import * as React from 'react'
import { useEffect } from 'react'
import * as ReactDOM from 'react-dom'
import { UsePoolProvider, UseProcessProvider, usePool, useProcess, useProcesses, UseEntityProvider, useEntity, UseBlockStatusProvider, useDateAtBlock, useBlockAtDate, useBlockStatus, useBlockHeight } from '../.'
import { VotingApi } from 'dvote-js'

const BOOTNODE_URI = "https://bootnodes.vocdoni.net/gateways.dev.json"
const ENVIRONMENT = "dev"
const NETWORK_ID = "goerli"
const ENTITY_ID = "0x797B8Eb02e670bcd36AA6146c4766577E8EA9059"
const PROCESS_IDS = [
  "0x78364fdd52145ea9ba6ab6d593303627b5dea9867d1500949ac4cf8effe0b80d",
  "0xfb7bd01987e1d8bb0ad5eb8b65e26fcbdd56787f33bc9ba98e3f9b5a21afebe2",
  // "0x8dc72483bf19b9f778c871574fc14b294de65c1e2c5437c2b9223f43f650dad0",
  "0xc18cd531c2f3c1d9cbada0d23eb36b424e11c4665caeada544b0b5a8b83a3fda"
]

const App = () => {
  return (
    <UsePoolProvider bootnodeUri={BOOTNODE_URI} networkId={NETWORK_ID} environment={ENVIRONMENT}>
      <UseProcessProvider>
        <UseEntityProvider>
          <UseBlockStatusProvider>
            <div>
              <PoolComponent />
              <ProcessComponent />
              <ProcessesComponent />
              <EntityComponent />
              <DateBlockComponent />
            </div>
          </UseBlockStatusProvider>
        </UseEntityProvider>
      </UseProcessProvider>
    </UsePoolProvider>
  )
}

const PoolComponent = () => {
  const { pool, poolPromise, loading, error, retry, refresh } = usePool()

  useEffect(() => {
    const operation = () => {
      poolPromise
        .then(gwPool => {
          // Do something with the gateway pool instance
          VotingApi.getResultsDigest(PROCESS_IDS[0], gwPool)
        })
    }
    setTimeout(() => operation, 100)
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

const ProcessComponent = () => {
  const { process, loading, error } = useProcess(PROCESS_IDS[0])

  return <div>
    <h2>Process (single)</h2>
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

const ProcessesComponent = () => {
  const { processes, loading, error } = useProcesses(PROCESS_IDS)

  // processes is a Map<string, IProcessInfo>

  return <div>
    <h2>Process (list)</h2>
    <p>The Process details are {loading ? "being loaded" : "ready"}</p>
    <ul>
      {
        PROCESS_IDS.map(id => {
          const processInfo = processes.get(id)
          if (!processInfo) return <li key={id}>Process {id.substr(0, 6)}... is not ready</li>
          return <li key={id}>{processInfo.metadata.title.default}</li>
        })
      }
    </ul>
    {error ? <p>Error: {error}</p> : null}
  </div>
}

const EntityComponent = () => {
  const { metadata, loading, error } = useEntity(ENTITY_ID)

  return <div>
    <h2>Entity</h2>
    <p>The entity details are {loading ? "being loaded" : "ready"}</p>
    {
      !metadata ? null : <>
        <pre>Entity ID: {ENTITY_ID}</pre>
        <pre>{JSON.stringify(metadata, null, 2)}</pre>
      </>
    }
    {error ? <p>Error: {error}</p> : null}
  </div>
}

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

ReactDOM.render(<App />, document.getElementById('root'))
