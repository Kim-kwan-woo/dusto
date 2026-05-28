import { ipcMain } from 'electron'
import {
  ASSISTANT_IPC_CHANNELS,
  type AssistantChatRequest,
  type AssistantConfirmationReply
} from '@preload/api'
import {
  getRuntimeStatus,
  handleAssistantChat,
  handleAssistantConfirmation,
  selectRuntimeModel,
  startRuntime,
  stopRuntime
} from './ai'

export function registerAssistantIpc(): void {
  ipcMain.handle(ASSISTANT_IPC_CHANNELS.runtimeStatus, async (_event, forceRefresh?: boolean) => {
    return getRuntimeStatus(forceRefresh)
  })

  ipcMain.handle(ASSISTANT_IPC_CHANNELS.runtimeStart, async () => {
    return startRuntime()
  })

  ipcMain.handle(ASSISTANT_IPC_CHANNELS.runtimeSelectModel, async (_event, model: string) => {
    return selectRuntimeModel(model)
  })

  ipcMain.handle(ASSISTANT_IPC_CHANNELS.runtimeStop, async () => {
    return stopRuntime()
  })

  ipcMain.handle(ASSISTANT_IPC_CHANNELS.chat, async (_event, request: AssistantChatRequest) => {
    return handleAssistantChat(request)
  })

  ipcMain.handle(ASSISTANT_IPC_CHANNELS.confirm, async (_event, payload: AssistantConfirmationReply) => {
    return handleAssistantConfirmation(payload)
  })
}
