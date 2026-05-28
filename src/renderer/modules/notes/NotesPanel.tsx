import React, { useEffect, useRef } from 'react'
import useNotesStore, {
  getNoteTitle,
  getSelectedNote,
  hydrateNotesStore
} from './notes.store'
import DustoCharacter from '../../components/DustoCharacter'

const SF_TEXT = "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface NotesListProps {
  notes: Array<{
    id: string
    body: string
    updatedAt: number
  }>
  selectedId: string | null
  hydrated: boolean
  onSelect: (id: string) => void
}

function NotesList({ notes, selectedId, hydrated, onSelect }: NotesListProps): React.JSX.Element {
  return (
    <ul className="flex-1 overflow-y-auto">
      {hydrated && notes.length === 0 && (
        <li
          className="px-4 py-6 text-center text-[13px] tracking-[-0.224px]"
          style={{ color: 'rgba(0,0,0,0.32)', fontFamily: SF_TEXT }}
        >
          No notes yet.
        </li>
      )}
      {notes.map((note) => (
        <MemoizedNotesListItem
          key={note.id}
          note={note}
          isActive={note.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

interface NotesListItemProps {
  note: {
    id: string
    body: string
    updatedAt: number
  }
  isActive: boolean
  onSelect: (id: string) => void
}

function NotesListItem({ note, isActive, onSelect }: NotesListItemProps): React.JSX.Element {
  return (
    <li>
      <button
        onClick={() => onSelect(note.id)}
        className={[
          'w-full px-4 py-3 text-left transition-colors duration-100',
          isActive ? 'bg-[#0071e3]' : 'bg-transparent hover:bg-[#f5f5f7]'
        ].join(' ')}
      >
        <p
          className="truncate text-[13px] font-medium tracking-[-0.224px]"
          style={{
            color: isActive ? '#ffffff' : '#1d1d1f',
            fontFamily: SF_TEXT
          }}
        >
          {getNoteTitle(note.body)}
        </p>
        <p
          className="mt-0.5 text-[11px] tracking-[-0.12px]"
          style={{
            color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.4)',
            fontFamily: SF_TEXT
          }}
        >
          {formatDate(note.updatedAt)}
        </p>
      </button>
    </li>
  )
}

function NotesPanel(): React.JSX.Element {
  const notes = useNotesStore((state) => state.notes)
  const selectedId = useNotesStore((state) => state.selectedId)
  const hydrated = useNotesStore((state) => state.hydrated)
  const create = useNotesStore((state) => state.create)
  const update = useNotesStore((state) => state.update)
  const remove = useNotesStore((state) => state.remove)
  const select = useNotesStore((state) => state.select)
  const selected = getSelectedNote(notes, selectedId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void hydrateNotesStore()
  }, [])

  // Focus editor when a note is selected
  useEffect(() => {
    if (selectedId) textareaRef.current?.focus()
  }, [selectedId])

  function handleCreate() {
    create()
  }

  return (
    <div className="flex gap-0 h-full" style={{ minHeight: 0 }}>
      {/* ── Note list ── */}
      <div
        className="flex flex-col w-[220px] flex-shrink-0 border-r border-black/[0.06]"
        style={{ minHeight: 0 }}
      >
        {/* New note button */}
        <div className="px-3 pb-3">
          <button
            onClick={handleCreate}
            className="h-[34px] w-full rounded-[8px] bg-[#0071e3] text-[13px] tracking-[-0.224px] text-white transition-colors duration-100 hover:bg-[#0077ed]"
            style={{
              fontFamily: SF_TEXT,
              fontWeight: 400
            }}
          >
            + New Note
          </button>
        </div>

        <MemoizedNotesList
          notes={notes}
          selectedId={selectedId}
          hydrated={hydrated}
          onSelect={select}
        />
      </div>

      {/* ── Editor ── */}
      <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
        {selected === null ? (
          <div className="flex flex-col flex-1 items-center justify-center gap-3">
            <DustoCharacter variant="shy" size={48} />
            <p
              className="text-[14px] tracking-[-0.224px]"
              style={{ color: 'rgba(0,0,0,0.32)', fontFamily: SF_TEXT }}
            >
              Select a note or create a new one.
            </p>
          </div>
        ) : (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-black/[0.06]">
              <p
                className="text-[12px] tracking-[-0.12px]"
                style={{ color: 'rgba(0,0,0,0.32)', fontFamily: SF_TEXT }}
              >
                Edited {formatDate(selected.updatedAt)}
              </p>
              <button
                onClick={() => remove(selected.id)}
                className="rounded-[6px] px-2 py-1 text-[12px] tracking-[-0.12px] text-[rgba(0,0,0,0.4)] transition-colors duration-100 hover:bg-[rgba(255,59,48,0.08)] hover:text-[#ff3b30]"
                style={{ fontFamily: SF_TEXT }}
              >
                Delete
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={selected.body}
              onChange={(e) => update(selected.id, e.target.value)}
              placeholder="Start writing…"
              className="flex-1 resize-none outline-none px-6 py-5 bg-white text-[14px] leading-[1.6] tracking-[-0.224px] placeholder:text-[rgba(0,0,0,0.24)]"
              style={{
                color: 'rgba(0,0,0,0.8)',
                fontFamily: SF_TEXT,
                fontWeight: 400
              }}
              spellCheck={false}
            />
          </>
        )}
      </div>
    </div>
  )
}

const MemoizedNotesList = React.memo(NotesList)
const MemoizedNotesListItem = React.memo(
  NotesListItem,
  (prev, next) => prev.note === next.note && prev.isActive === next.isActive
)

export default React.memo(NotesPanel)
