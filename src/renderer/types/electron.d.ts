import type { DustoApi } from '@preload/api'

export {}

declare global {
  interface Window {
    api: DustoApi
  }
}
