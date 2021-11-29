import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { UsePoolProvider, UseProcessProvider, UseEntityProvider } from '../dist'

const BOOTNODE_URI = 'https://bootnodes.vocdoni.net/gateways.dev.json'
const ENVIRONMENT = 'dev'
const NETWORK_ID = 'rinkeby'

describe('it', () => {
  it('renders the UsePoolProvider without crashing', () => {
    const div = document.createElement('div')
    ReactDOM.render(
      <UsePoolProvider
        networkId={NETWORK_ID}
        bootnodeUri={BOOTNODE_URI}
        environment={ENVIRONMENT}
      >
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
  it('renders the UseEntityProvider without crashing', () => {
    const div = document.createElement('div')
    ReactDOM.render(
      <UseEntityProvider>
        <div />
      </UseEntityProvider>,
      div
    )
    ReactDOM.unmountComponentAtNode(div)
  })
  // it('renders the UseBlockStatusProvider without crashing', () => {
  //   const div = document.createElement('div')
  //   ReactDOM.render(
  //     <UsePoolProvider
  //       networkId={NETWORK_ID}
  //       bootnodeUri={BOOTNODE_URI}
  //       environment={ENVIRONMENT}
  //     >
  //       <UseBlockStatusProvider>
  //         <div />
  //       </UseBlockStatusProvider>
  //     </UsePoolProvider>,
  //     div
  //   )
  //   ReactDOM.unmountComponentAtNode(div)
  // })
})
