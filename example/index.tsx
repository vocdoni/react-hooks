import 'react-app-polyfill/ie11'
import * as React from 'react'
import { useEffect, useState } from 'react'
import * as ReactDOM from 'react-dom'
import { UsePoolProvider, UseProcessProvider, usePool, useProcess, useProcesses, useSigner } from '../.'
import { useWallet, UseWalletProvider } from "use-wallet"
import { VotingApi } from 'dvote-js'

const BOOTNODE_URI = "https://bootnodes.vocdoni.net/gateways.dev.json"
const ENVIRONMENT = "dev"
const NETWORK_ID = "goerli"
const CHAIN_ID = 5
const PROCESS_IDS = [
  "0x5f52ac0dac11f163b282fa5bbea25fbeded4c9e3503bfbef290802950eb65679",
  "0xe3d34b7b6ddd0ec90b045b3ab9f50cb8af65973e6ca8002b53f9d94e48cb78c6",
  "0xd177bfb170e8691911f93216b62dd1d530ab980309e95ed0ecf287b7b7b348aa"
]

const App = () => {
  return (
    <UsePoolProvider bootnodeUri={BOOTNODE_URI} networkId={NETWORK_ID} environment={ENVIRONMENT}>
      <UseProcessProvider>
        <UseWalletProvider chainId={CHAIN_ID}>
          <div>
            <PoolComponent />
            <ProcessComponent />
            <ProcessesComponent />
            <SignerComponent />
          </div>
        </UseWalletProvider>
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

const SignerComponent = () => {
  const signer = useSigner()
  const wallet = useWallet()
  const [signature, setSignature] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (wallet?.account && wallet?.connectors?.injected) return

    wallet.connect("injected")
  }, [wallet?.account])

  useEffect(() => {
    if (!signer) return

    signer.signMessage("Test message")
      .then(setSignature)
      .catch(err => setError(err?.message || err?.toString()))
  }, [signer])

  return <div>
    <h2>Signer</h2>
    <p>The signer is {signer ? "ready" : "unavailable (Please, install MetaMask)"}</p>
    {signature ? <p>Signature: {signature}</p> : null}
    {error ? <p>Error: {error}</p> : null}
  </div>
}

ReactDOM.render(<App />, document.getElementById('root'))
