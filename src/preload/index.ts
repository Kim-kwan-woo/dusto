import { contextBridge, ipcRenderer } from 'electron'
import {
  ASSISTANT_IPC_CHANNELS,
  EXPORT_PDF_IPC_CHANNEL,
  MEETINGS_IPC_CHANNELS,
  STORAGE_IPC_CHANNELS,
  type DustoApi
} from './api'

const api: DustoApi = {
  platform: process.platform,

  exportPdf: (html) => ipcRenderer.invoke(EXPORT_PDF_IPC_CHANNEL, html),

  loadTodos: () => ipcRenderer.invoke(STORAGE_IPC_CHANNELS.loadTodos),

  saveTodos: (todos) => ipcRenderer.invoke(STORAGE_IPC_CHANNELS.saveTodos, todos),

  flushTodos: (todos) => ipcRenderer.sendSync(STORAGE_IPC_CHANNELS.flushTodos, todos),

  loadNotes: () => ipcRenderer.invoke(STORAGE_IPC_CHANNELS.loadNotes),

  saveNotes: (payload) => ipcRenderer.invoke(STORAGE_IPC_CHANNELS.saveNotes, payload),

  flushNotes: (payload) => ipcRenderer.sendSync(STORAGE_IPC_CHANNELS.flushNotes, payload),

  loadCanvas: () => ipcRenderer.invoke(STORAGE_IPC_CHANNELS.loadCanvas),

  saveCanvas: (payload) => ipcRenderer.invoke(STORAGE_IPC_CHANNELS.saveCanvas, payload),

  saveCanvasMeta: (payload) => ipcRenderer.invoke(STORAGE_IPC_CHANNELS.saveCanvasMeta, payload),

  saveCanvasScene: (payload) => ipcRenderer.invoke(STORAGE_IPC_CHANNELS.saveCanvasScene, payload),

  flushCanvas: (payload) => ipcRenderer.sendSync(STORAGE_IPC_CHANNELS.flushCanvas, payload),

  meetings: {
    getMicrophonePermissionStatus: () =>
      ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.getMicrophonePermissionStatus),
    requestMicrophonePermission: () =>
      ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.requestMicrophonePermission),
    loadMeetings: () => ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.loadMeetings),
    saveRecording: (request) =>
      ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.saveRecording, request),
    getAudioDataUrl: (meetingId) =>
      ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.getAudioDataUrl, meetingId),
    getTranscriptionStatus: () =>
      ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.getTranscriptionStatus),
    transcribeRecording: (meetingId) =>
      ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.transcribeRecording, meetingId),
    summarizeMeeting: (meetingId) =>
      ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.summarizeMeeting, meetingId),
    deleteMeeting: (meetingId) =>
      ipcRenderer.invoke(MEETINGS_IPC_CHANNELS.deleteMeeting, meetingId)
  },

  assistant: {
    getRuntimeStatus: (forceRefresh) =>
      ipcRenderer.invoke(ASSISTANT_IPC_CHANNELS.runtimeStatus, forceRefresh),
    selectRuntimeModel: (model) =>
      ipcRenderer.invoke(ASSISTANT_IPC_CHANNELS.runtimeSelectModel, model),
    startRuntime: () => ipcRenderer.invoke(ASSISTANT_IPC_CHANNELS.runtimeStart),
    stopRuntime: () => ipcRenderer.invoke(ASSISTANT_IPC_CHANNELS.runtimeStop),
    chat: (request) => ipcRenderer.invoke(ASSISTANT_IPC_CHANNELS.chat, request),
    replyToConfirmation: (reply) =>
      ipcRenderer.invoke(ASSISTANT_IPC_CHANNELS.confirm, reply)
  }
}

contextBridge.exposeInMainWorld('api', api)
