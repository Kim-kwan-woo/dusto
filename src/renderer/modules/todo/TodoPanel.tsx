import React, { useEffect, useRef, useState } from 'react'
import useTodoStore, {
  getCompletedTodoItems,
  getPendingTodoItems,
  hydrateTodoStore
} from './todo.store'
import DustoCharacter from '../../components/DustoCharacter'

function TodoPanel(): React.JSX.Element {
  const items = useTodoStore((state) => state.items)
  const hydrated = useTodoStore((state) => state.hydrated)
  const add = useTodoStore((state) => state.add)
  const toggle = useTodoStore((state) => state.toggle)
  const remove = useTodoStore((state) => state.remove)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void hydrateTodoStore()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    add(draft)
    setDraft('')
    inputRef.current?.focus()
  }

  const pending = getPendingTodoItems(items)
  const done = getCompletedTodoItems(items)

  return (
    <div className="flex flex-col gap-6 max-w-[560px]">
      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 h-[40px] px-4 rounded-[11px] bg-[#fafafc] border-[3px] border-black/[0.04] text-[14px] text-[#1d1d1f] tracking-[-0.224px] placeholder:text-[rgba(0,0,0,0.32)] outline-none focus:border-[#0071e3] transition-colors duration-100"
          style={{ fontFamily: "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="h-[40px] px-5 rounded-[8px] text-[14px] tracking-[-0.224px] transition-colors duration-100 disabled:opacity-40"
          style={{
            background: '#0071e3',
            color: '#ffffff',
            fontFamily: "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 400
          }}
          onMouseEnter={(e) => {
            if (!draft.trim()) return
            e.currentTarget.style.background = '#0077ed'
          }}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0071e3')}
        >
          Add
        </button>
      </form>

      {/* Empty state */}
      {hydrated && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12">
          <DustoCharacter variant="sleepy" size={48} />
          <p
            className="text-[14px] tracking-[-0.224px]"
            style={{
              color: 'rgba(0,0,0,0.32)',
              fontFamily: "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
            }}
          >
            You're all clear. Add a task above.
          </p>
        </div>
      )}

      {/* Pending tasks */}
      {pending.length > 0 && (
        <ul className="flex flex-col gap-1">
          {pending.map((item) => (
            <TodoRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />
          ))}
        </ul>
      )}

      {/* Done tasks */}
      {done.length > 0 && (
        <div className="flex flex-col gap-1">
          <p
            className="text-[12px] tracking-[-0.12px] mb-1"
            style={{
              color: 'rgba(0,0,0,0.32)',
              fontFamily: "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
            }}
          >
            Completed
          </p>
          <ul className="flex flex-col gap-1">
            {done.map((item) => (
              <TodoRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface TodoRowProps {
  item: { id: string; text: string; done: boolean }
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

function TodoRow({ item, onToggle, onRemove }: TodoRowProps): React.JSX.Element {
  return (
    <li
      className="group flex items-center gap-3 rounded-[8px] px-4 py-3 transition-colors duration-100 hover:bg-[#f5f5f7]"
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        className="flex-shrink-0 w-[18px] h-[18px] rounded-full border transition-colors duration-100 flex items-center justify-center"
        style={{
          borderColor: item.done ? '#0071e3' : 'rgba(0,0,0,0.24)',
          background: item.done ? '#0071e3' : 'transparent'
        }}
        aria-label={item.done ? 'Mark as pending' : 'Mark as done'}
      >
        {item.done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.8 7L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Text */}
      <span
        className="flex-1 text-[14px] tracking-[-0.224px]"
        style={{
          color: item.done ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.8)',
          textDecoration: item.done ? 'line-through' : 'none',
          fontFamily: "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
        }}
      >
        {item.text}
      </span>

      {/* Delete */}
      <button
        onClick={() => onRemove(item.id)}
        className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-black/[0.08] text-[rgba(0,0,0,0.48)] opacity-0 transition-opacity duration-100 group-hover:opacity-100"
        style={{
          color: 'rgba(0,0,0,0.48)'
        }}
        aria-label="Delete task"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path
            d="M1 1L7 7M7 1L1 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  )
}

export default React.memo(TodoPanel)
