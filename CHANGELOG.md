# Changelog

## 0.9.0
- BREAKING: Splitting the process hooks to save network requests
  - `useProcess` now returns the full state for one process
  - `useProcesses` now returns a summary for each process
  - Metadata is now detached and cached separately
- Adding `useEntityProcessIdList`

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
