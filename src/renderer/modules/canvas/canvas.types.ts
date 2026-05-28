export interface CanvasBoard {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  scene: string
}

export interface CanvasSnapshot {
  boards: CanvasBoard[]
  selectedBoardId: string | null
}

export interface CanvasBackupState {
  boards?: CanvasBoard[]
  selectedBoardId?: string | null
}
