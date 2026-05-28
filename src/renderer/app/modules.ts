import React, { lazy } from 'react'
import HomePage from './pages/HomePage'

export interface AppModule {
  id: string
  label: string
  icon: string
  render: () => React.JSX.Element
}

const TodoPage = lazy(() => import('../modules/todo'))
const NotesPage = lazy(() => import('../modules/notes'))
const HtmlEditorPage = lazy(() => import('../modules/htmleditor'))
const CanvasPage = lazy(() => import('../modules/canvas'))
const MeetingsPage = lazy(() => import('../modules/meetings'))

const appModules: AppModule[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '⌂',
    render: () => React.createElement(HomePage)
  },
  {
    id: 'todo',
    label: 'Todo',
    icon: '✓',
    render: () => React.createElement(TodoPage)
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: '✎',
    render: () => React.createElement(NotesPage)
  },
  {
    id: 'canvas',
    label: 'Canvas',
    icon: '◎',
    render: () => React.createElement(CanvasPage)
  },
  {
    id: 'htmleditor',
    label: 'HTML',
    icon: '</>',
    render: () => React.createElement(HtmlEditorPage)
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: '◉',
    render: () => React.createElement(MeetingsPage)
  }
]

export default appModules
