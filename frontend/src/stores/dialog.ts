import { create } from 'zustand'

interface DialogStore {
  open: boolean
  openDialog: () => void
  closeDialog: () => void
  setOpen: (open: boolean) => void
}

export const useDialogStore = create<DialogStore>((set) => ({
  open: false,
  openDialog: () => set({ open: true }),
  closeDialog: () => set({ open: false }),
  setOpen: (open) => set({ open }),
}))
