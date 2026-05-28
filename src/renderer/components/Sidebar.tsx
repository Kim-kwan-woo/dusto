import React from 'react'
import type { AppModule } from '../app/modules'

interface SidebarProps {
  modules: AppModule[]
  activeId: string
  isCollapsed: boolean
  onSelect: (id: string) => void
}

function Sidebar({
  modules,
  activeId,
  isCollapsed,
  onSelect
}: SidebarProps): React.JSX.Element {
  return (
    <aside
      className={[
        'flex flex-shrink-0 flex-col border-r border-black/[0.07] bg-[#f0f0f2]',
        'transition-[width] duration-200 ease-out overflow-hidden',
        isCollapsed ? 'w-[76px]' : 'w-[220px]'
      ].join(' ')}
      style={{ WebkitUserSelect: 'none' } as React.CSSProperties}
    >
      {/* Sidebar header */}
      <div
        className={[
          'h-[44px] flex-shrink-0 flex items-center border-b border-black/[0.05]',
          isCollapsed ? 'px-3' : 'px-5'
        ].join(' ')}
      >
        <div
          className={[
            'flex w-full items-center',
            isCollapsed ? 'justify-center' : 'justify-start gap-1.5'
          ].join(' ')}
        >
          {!isCollapsed ? (
            <span
              className="truncate text-[15px] font-semibold text-[#1d1d1f] tracking-[-0.374px] whitespace-nowrap"
              style={{
                fontFamily: "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
              }}
            >
              Dusto
            </span>
          ) : null}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pt-2">
        {modules.map((mod) => {
          const isActive = mod.id === activeId
          return (
            <button
              key={mod.id}
              onClick={() => onSelect(mod.id)}
              title={isCollapsed ? mod.label : undefined}
              aria-label={isCollapsed ? mod.label : undefined}
              className={[
                'w-full rounded-[8px] text-[13px] tracking-[-0.224px] transition-colors duration-100',
                isCollapsed
                  ? 'flex justify-center px-2 py-[11px] text-center'
                  : 'flex items-center gap-2.5 px-3 py-[9px] text-left',
                'text-[13px] tracking-[-0.224px] transition-colors duration-100',
                isActive
                  ? 'bg-[#0071e3] text-white font-medium'
                  : 'text-[rgba(0,0,0,0.75)] hover:bg-black/[0.06]'
              ].join(' ')}
              style={{
                fontFamily: "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
              }}
            >
              <span className="w-4 flex-shrink-0 text-center text-[14px] leading-none">
                {mod.icon}
              </span>
              {!isCollapsed ? mod.label : null}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className={[
          'border-t border-black/[0.05] py-4',
          isCollapsed ? 'px-2' : 'px-5'
        ].join(' ')}
      >
        {isCollapsed ? null : (
          <p
            className="text-[11px] tracking-[-0.08px]"
            style={{
              color: 'rgba(0,0,0,0.28)',
              fontFamily: "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
            }}
          >
            Dusto v{__APP_VERSION__}
          </p>
        )}
      </div>
    </aside>
  )
}

export default React.memo(Sidebar)
