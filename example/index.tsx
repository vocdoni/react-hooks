import * as React from 'react'
import { useEffect } from 'react'
import * as ReactDOM from 'react-dom'
import { UsePoolProvider, UseProcessProvider, usePool, useProcess, useProcesses, UseEntityProvider, useEntity, UseBlockStatusProvider, useDateAtBlock, useBlockAtDate, useBlockStatus, useBlockHeight, useEntityProcessIdList } from '../src/index'
import { VotingApi } from '@vocdoni/voting'
import { ProcessStatus } from '@vocdoni/contract-wrappers'

const BOOTNODE_URI = "https://bootnodes.vocdoni.net/gateways.dev.json"
const ENVIRONMENT = "dev"
const NETWORK_ID = "rinkeby"
const ENTITY_ID = "0x797B8Eb02e670bcd36AA6146c4766577E8EA9059"
const PROCESS_IDS = [
  "0x732493935542b276402ad380e905d5363df798e19342a4d59c057f02060de313",
  "0xb499d66d6262e76d35a596d05a8b2a5c53a04431d71be767ab0d39b71c1d7ceb",
  "0xc0f019b3497412e49107b7eb8e01e72a29e54643aa1e109971c0db7495426539",
  "0x29a4637797076a0620ecf1f4c6565616bbdbb80ed12df36f4125efe9e12706ad"
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
        return VotingApi.getResults(PROCESS_IDS[0], gwPool)
          .then(results => console.log("RESULTS", results))
      })
      .catch(err => console.error("RESULTS ERROR", err))
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
