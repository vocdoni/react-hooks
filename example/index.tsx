import * as React from 'react'
import { useEffect } from 'react'
import * as ReactDOM from 'react-dom'
import { UsePoolProvider, UseProcessProvider, usePool, useProcess, useProcesses, UseEntityProvider, useEntity, UseBlockStatusProvider, useDateAtBlock, useBlockAtDate, useBlockStatus, useBlockHeight, useEntityProcessIdList } from '../src/index'
import { VotingApi } from '@vocdoni/voting'
import { ProcessStatus } from '@vocdoni/contract-wrappers'

const BOOTNODE_URI = "https://bootnodes.vocdoni.net/gateways.dev.json"
const ENVIRONMENT = "dev"
const NETWORK_ID = "rinkeby"
const ENTITY_ID = "0xf0f8d83cdab2f9514bef0319f1b434267be36b5c"
const PROCESS_IDS = [
  "0xad2b0e0c93da2bccd1c67e2b866b671ff555f57cb7fb22a169a2e43519e592e4",
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
              <EntityProcessesComponent />
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
    poolPromise
      .then(gwPool => {
        // Do something with the gateway pool instance
        return VotingApi.getProcessState(PROCESS_IDS[0], gwPool)
          .then(state => console.log("STATE", state))
      })
      .catch(err => console.error("STATE ERROR", err))
  }, [])

  return <div>
    <h2>Gateway Pool</h2>
    <p>Status: ({loading ? "loading" : "idle"})</p>
    {pool ? <p>Ready</p> : null}
    {error ? <p>Error: {error}</p> : null}
    {error && pool ? <p><button onClick={refresh}>Refresh</button></p> : null}
    {error && !pool ? <button onClick={() => retry({})}>Retry</button> : null}
  </div>
}

const ProcessComponent = () => {
  const { process, loading, error } = useProcess(PROCESS_IDS[0])

  return <div>
    <h2>Process (single)</h2>
    <p>Status: ({loading ? "loading" : "idle"})</p>
    {
      !process ? null : <>
        <pre>Process ID: {process.id}</pre>
        <pre>Entity Address: {process.state?.entityId}</pre>
        <pre>{JSON.stringify(process.metadata, null, 2)}</pre>
        <pre>{JSON.stringify(process.state, null, 2)}</pre>
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
    <p>Status: ({loading ? "loading" : "idle"})</p>
    <ul>
      {
        processes.map(processSummary => {
          const { id } = processSummary
          if (!processSummary) return <li key={id}>Process {id.substr(0, 6)}... is not ready</li>
          return <li key={id}>{processSummary.metadata?.title?.default}</li>
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
    <p>Status: ({loading ? "loading" : "idle"})</p>
    {
      !metadata ? null : <>
        <pre>Entity ID: {ENTITY_ID}</pre>
        <pre>{JSON.stringify(metadata, null, 2)}</pre>
      </>
    }
    {error ? <p>Error: {error}</p> : null}
  </div>
}

const EntityProcessesComponent = () => {
  const { processIds, loading, error } = useEntityProcessIdList(ENTITY_ID, { status: ProcessStatus.READY, withResults: false })

  return <div>
    <h2>Entity processes</h2>
    <p>Status: ({loading ? "loading" : "idle"})</p>
    {
      !processIds ? null : <>
        <pre>Entity ID: {ENTITY_ID}</pre>
        <p><code>{processIds.join(", ")}</code></p>
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
    <p>Status: ({loading ? "loading" : "idle"})</p>
    {blockHeight ? <p>Current block {blockHeight}</p> : null}
    {!date ? null : <p>Date at block {targetBlock}: {date.toJSON()}</p>}
    {estimatedBlockNumber ? <p>Block on {targetDate.toJSON()}: {estimatedBlockNumber}</p> : null}
    {!blockStatus ? null : <pre>{JSON.stringify(blockStatus, null, 2)}</pre>}
    {error ? <p>Error: {error}</p> : null}
  </div>
}

ReactDOM.render(<App />, document.getElementById('root'))
