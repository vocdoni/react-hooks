# Changelog

## 0.15.1

- Updated `UsePoolProvider` for supporting multiple bootnodes URLs

## 0.15.0

- Updated `VotingApi.getProcessList` call for archive support

## 0.14.1

- Added the `archiveIpnsId` parameter for custom IPNS in the pool discovery process

## 0.14.0

- Stop retrying a network discovery when the parameters change

## 0.13.1

- Version bump for `voting` package

## 0.13.0

- [Breaking] Update dvote-js dependencies to new packages: `common`, `client` and `voting`

## 0.12.0

- Updates dvote-js to 1.13.2
- [Breaking] Update GatewayPool only compatible with dvote-js version 1.13.2

## 0.11.0

- Update dvote-js to 1.11.2
- [Breaking] Update process interface definition from `IProcessState` to `IProcessState`

## 0.10.1

- `useBlockStatus` and `useBlockHeight` now refresh when switching networks

## 0.10.0
- Version bump os dvote-js to v1.10.1

## 0.9.10

- Update dvote-js to 1.9.15
- Add new cache on the entity hook
- Add update method to allow update the entity
- Fix reload process caused by state.
- Improve cache process and processes.
- Use state for the processes

## 0.9.9

## 0.9.8

- Upgrades dvote-js to 1.9.9 to make the `IProcessState` more consistent

## 0.9.7

- Upgrading dvote-js to fucntion on XDAI stg

## 0.9.6

- Fixing a minor bug

## 0.9.5

- Upgrading dvote-js to better handle IPFS gw pool shifts
- Catching IPFS metadata issues

## 0.9.4

- Upgrading dvote-js make the `IProcessDetails` type more consistent

## 0.9.3

- Upgrading dvote-js to avoid retrying IPFS metadata fetches indefinitely
- Resolving processes metadata asynchronously, allowing the UI to split processes by state without waiting for the complete details to be settled

## 0.9.2
## 0.9.1

- Upgrading dvote-js to provide a fallback for processes without metadata on the Vochain

## 0.9.0
- BREAKING: Splitting the process hooks to save network requests
  - `useProcess` now returns the full state for one process
  - `useProcesses` now returns a summary for each process
  - Metadata is now detached and cached separately
- Adding `useEntityProcessIdList`

## 0.8.2

- Upgrading dvote-js to provide a fallback for processes without metadata on the Vochain

## 0.8.1

- Recompiling with a clean dvote-js version, relaxing the gateway client pool checks

## 0.8.0

- BREAKING: `useProcess` and `useProcesses` now returns an object with a slightly different signature on `parameters`
  - See https://github.com/vocdoni/dvote-js/blob/fdf0cf99c623091eec0e09e21520c05c92fb37c0/src/api/voting.ts#L70-L98

## 0.7.2

- Adds discovery parameters to pool hook

## 0.7.1

- Allowing to refresh the process info of a particular process

## 0.7.0

- Improving the gateway pool discovery flow
- Allowing to `retry` the connection on error

## 0.6.7

- Performance improvement on `useProcesses`

## 0.6.6
## 0.6.5

- Fixing an issue that would show proposals as loading with empty arrays

## 0.6.4

- Using `IProcessInfo` from dvote-js instead of the own `ProcessInfo`

## 0.6.3

- Improving efficiency on cached data, saving network requests
- Upgrading dvote-js to benefit from network improvements

## 0.6.2

- Adding `useBlockHeight`

## 0.6.1

- Adding `useBlockStatus`

## 0.6.0

- Adding `useDateAtBlock` and `useBlockAtDate`

## 0.5.0

- Adding `useEntity`

## 0.4.0

- Removing `useSigner` since it adds no features and depending `useWallet` introduces compatibility problems.

## 0.3.2
## 0.3.1
## 0.3.0

- Upgrading dependencies

## 0.2.1

- Upgrading DVoteJS to v0.20.1

## 0.1.0

- Initial commit
