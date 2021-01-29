import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { UsePoolProvider, UseProcessProvider } from '../src'

const BOOTNODE_URI = 'https://bootnodes.vocdoni.net/gateways.dev.json'

describe('it', () => {
  it('renders the UsePoolProvider without crashing', () => {
    const div = document.createElement('div')
    ReactDOM.render(
      <UsePoolProvider networkId="goerli" bootnodeUri={BOOTNODE_URI}>
        <div />
      </UsePoolProvider>,
      div
    )
    ReactDOM.unmountComponentAtNode(div)
  })
  it('renders the UseProcessProvider without crashing', () => {
    const div = document.createElement('div')
    ReactDOM.render(
      <UseProcessProvider>
        <div />
      </UseProcessProvider>,
      div
    )
    ReactDOM.unmountComponentAtNode(div)
  })
})
