import { ProcessContractParameters, ProcessMetadata } from 'dvote-js'

export type Nullable<T> = T | null

export type ProcessInfo = {
  id: string
  metadata: ProcessMetadata
  parameters: ProcessContractParameters
  entity: string
}
