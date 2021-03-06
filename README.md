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
import { UsePoolProvider, UseProcessProvider, usePool, useProcess, useProcesses, useSigner } from '../.'
import { UseWalletProvider } from "use-wallet"

const BOOTNODE_URI = "https://bootnodes.vocdoni.net/gateways.dev.json"
const ENVIRONMENT = "dev" 
const NETWORK_ID = "goerli"
const CHAIN_ID = 5

const MyApp = () => {
  return (
    <UsePoolProvider bootnodeUri={BOOTNODE_URI} networkId={NETWORK_ID} environment={ENVIRONMENT}>
      <UseProcessProvider>
        <UseWalletProvider chainId={CHAIN_ID}>
          
          // ...
          <MyMainComponent /> 

        </UseWalletProvider>
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
  const { pool, poolPromise, loading, error } = usePool()

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

### Signer

`useSigner` uses the `use-wallet` library under the hood and returns an Ethers.js `Signer` object attached to it. You probably want to import `useWallet` as well and manage the Web3 connectivity from there.

```tsx
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
```

Find out [more details about use-wallet](https://github.com/aragon/use-wallet#readme)

## Example

Check out `example/index.tsx` for a working example.

```bash
cd example
npm install
npm start
```
