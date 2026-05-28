import type { AssistantConfirmationRequest } from './types'

const pendingConfirmations = new Map<string, AssistantConfirmationRequest>()

export function savePendingConfirmation(request: AssistantConfirmationRequest): void {
  pendingConfirmations.set(request.id, request)
}

export function getPendingConfirmation(id: string): AssistantConfirmationRequest | null {
  return pendingConfirmations.get(id) ?? null
}

export function deletePendingConfirmation(id: string): void {
  pendingConfirmations.delete(id)
}
