import { create } from 'zustand';

export const useChatStore = create((set) => ({
  isOpen: false,
  isMinimized: false,
  activeEmployee: null,
  totalUnreadCount: 0,

  setIsOpen: (isOpen) => set((state) => ({ 
    isOpen, 
    isMinimized: isOpen ? false : state.isMinimized 
  })),
  toggleOpen: () => set((state) => ({ 
    isOpen: !state.isOpen, 
    isMinimized: false 
  })),
  setIsMinimized: (isMinimized) => set({ isMinimized }),
  setActiveEmployee: (activeEmployee) => set({ activeEmployee }),
  setTotalUnreadCount: (totalUnreadCount) => set({ totalUnreadCount }),
  openChatWith: (employee) => set({ 
    isOpen: true, 
    isMinimized: false, 
    activeEmployee: employee 
  })
}));

