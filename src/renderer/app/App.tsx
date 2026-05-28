import React, { Suspense, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import appModules from './modules'
import useNavigationStore from '../stores/navigation.store'
import { flushPersistentStores, requestRendererFlush } from '../stores/persistence'
import PageLoader from '../components/PageLoader'
import AssistantFloatingChat from '../modules/assistant/components/AssistantFloatingChat'

function SidebarToggleIcon({
  collapsed
}: {
  collapsed: boolean
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-[13px] w-[13px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.25" y="2.5" width="11.5" height="11" rx="2.25" />
      <path d={collapsed ? 'M5.5 3.5V12.5' : 'M7.5 3.5V12.5'} />
      <path d={collapsed ? 'M8.75 8L6.9 6.35' : 'M5.45 8L7.3 6.35'} />
      <path d={collapsed ? 'M8.75 8L6.9 9.65' : 'M5.45 8L7.3 9.65'} />
    </svg>
  )
}

function App(): React.JSX.Element {
  const activeId = useNavigationStore((state) => state.activeId)
  const isSidebarCollapsed = useNavigationStore((state) => state.isSidebarCollapsed)
  const navigate = useNavigationStore((state) => state.navigate)
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar)

  const activePage = appModules.find((module) => module.id === activeId) ?? appModules[0]
  useEffect(() => {
    function flushAll(): void {
      requestRendererFlush()
      flushPersistentStores()
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === 'hidden') {
        flushAll()
      }
    }

    window.addEventListener('beforeunload', flushAll)
    window.addEventListener('pagehide', flushAll)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', flushAll)
      window.removeEventListener('pagehide', flushAll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white select-none">
      <div
        className="relative z-30 h-[44px] shrink-0 border-b border-black/[0.04] bg-[#fafaf8]/90 backdrop-blur-xl"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex h-[44px] items-center px-4">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="pointer-events-auto ml-[62px] flex h-6 w-6 items-center justify-center rounded-[6px] text-[rgba(29,29,31,0.56)] transition-colors duration-150 hover:bg-black/[0.04] hover:text-[#1d1d1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
          style={{
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
        >
          <SidebarToggleIcon collapsed={isSidebarCollapsed} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          modules={appModules}
          activeId={activeId}
          isCollapsed={isSidebarCollapsed}
          onSelect={navigate}
        />

        <main
          className="relative flex-1 overflow-auto bg-white"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Suspense fallback={<PageLoader />}>{activePage.render()}</Suspense>
        </main>
      </div>

      {activeId !== 'home' ? <AssistantFloatingChat /> : null}
    </div>
  )
}

export default App
