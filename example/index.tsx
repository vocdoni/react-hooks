import 'react-app-polyfill/ie11'
import * as React from 'react'
import { useEffect } from 'react'
import * as ReactDOM from 'react-dom'
import { UsePoolProvider, UseProcessProvider, usePool, useProcess, useProcesses, UseEntityProvider, useEntity } from '../.'
import { VotingApi } from 'dvote-js'

const BOOTNODE_URI = "https://bootnodes.vocdoni.net/gateways.dev.json"
const ENVIRONMENT = "dev"
const NETWORK_ID = "goerli"
const ENTITY_ID = "0x797B8Eb02e670bcd36AA6146c4766577E8EA9059"
const PROCESS_IDS = [
  "0x650f13cacb6ae088d80af74403eb656ba9473e3e296f61f165360b1f8358a2dc",
  "0xba82184882b0e970e659290e8b86bd0ed74cbe168ea9ba0726862eaac9c7a301",
  "0xf72d00fbcee5fdb7203ad215b8fa13575f4fb66b8d54d466cf49271f6fbba7ed",
  "0xa7546c7119ad659af93c4980fdd9a48fdb3525853089898d287bad3c99421d3f"
]

const App = () => {
  return (
    <UsePoolProvider bootnodeUri={BOOTNODE_URI} networkId={NETWORK_ID} environment={ENVIRONMENT}>
      <UseProcessProvider>
        <UseEntityProvider>
          <div>
            <PoolComponent />
            <ProcessComponent />
            <ProcessesComponent />
            <EntityComponent />
          </div>
        </UseEntityProvider>
      </UseProcessProvider>
    </UsePoolProvider>
  )
}

const PoolComponent = () => {
  const { pool, poolPromise, loading, error } = usePool()

  useEffect(() => {
    poolPromise
      .then(pool => {
        // Do something with the gateway pool instance
        VotingApi.getResultsDigest(PROCESS_IDS[0], pool)
          .then(console.log)
      })
  }, [])

  return <div>
    <h2>Gateway Pool</h2>
    <p>The Gateway Pool is {loading ? "being loaded" : "ready"}</p>
    {pool ? <p>Ready</p> : null}
    {error ? <p>Error: {error}</p> : null}
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

  // processes is a Map<string, ProcessInfo>

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

ReactDOM.render(<App />, document.getElementById('root'))
