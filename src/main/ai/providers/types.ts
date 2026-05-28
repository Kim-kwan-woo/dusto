import type {
  AssistantChatMessage,
  AssistantRuntimeStatus,
  AssistantToolCall,
} from '../types'

export interface ProviderToolDefinition {
  name: string
  description: string
  confirmation: 'none' | 'required'
  argumentSchema: string
}

export interface ProviderChatRequest {
  model: string
  systemPrompt: string
  messages: AssistantChatMessage[]
  tools: ProviderToolDefinition[]
}

export interface ProviderChatResponse {
  text: string
  toolCall?: AssistantToolCall
}

export interface AiProvider {
  readonly name: string
  getStatus(selectedModel: string | null): Promise<AssistantRuntimeStatus>
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse>
}
