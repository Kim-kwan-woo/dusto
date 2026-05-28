import { create } from 'zustand'

interface NavigationState {
  activeId: string
  isSidebarCollapsed: boolean
  navigate: (id: string) => void
  toggleSidebar: () => void
}

const useNavigationStore = create<NavigationState>((set) => ({
  activeId: 'home',
  isSidebarCollapsed: false,
  navigate: (id) => set({ activeId: id }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
}))

export default useNavigationStore
