'use client'

import { createContext, useContext, useRef, useState } from 'react'

type Ctx = {
  registerSave: (fn: () => Promise<void>) => void
  unregisterSave: () => void
  triggerSave: () => void
  saving: boolean
  setSaving: (v: boolean) => void
}

const PredictSaveContext = createContext<Ctx>({
  registerSave: () => {},
  unregisterSave: () => {},
  triggerSave: () => {},
  saving: false,
  setSaving: () => {},
})

export function PredictSaveProvider({ children }: { children: React.ReactNode }) {
  const saveFnRef = useRef<(() => Promise<void>) | null>(null)
  const [saving, setSaving] = useState(false)

  return (
    <PredictSaveContext.Provider value={{
      registerSave: (fn) => { saveFnRef.current = fn },
      unregisterSave: () => { saveFnRef.current = null },
      triggerSave: () => { saveFnRef.current?.() },
      saving,
      setSaving,
    }}>
      {children}
    </PredictSaveContext.Provider>
  )
}

export const usePredictSave = () => useContext(PredictSaveContext)
