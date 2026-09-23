import { useState } from 'react'
import App from './App.jsx'
import FamilySetup from './components/FamilySetup.jsx'
import { clearSavedFamily, getSavedFamily } from './lib/family.js'
import { supabase } from './lib/supabase.js'

export default function Root() {
  const [family, setFamily] = useState(() => getSavedFamily())
  const [notice, setNotice] = useState('')

  if (!supabase) {
    return (
      <div className="max-w-[460px] mx-auto px-[18px] pt-[40px]">
        <div className="sticker-card p-[22px] text-[14px] font-semibold text-ink">
          Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_KEY (veja .env.example).
        </div>
      </div>
    )
  }

  if (!family) {
    return (
      <FamilySetup
        notice={notice}
        onReady={(f) => {
          setNotice('')
          setFamily(f)
        }}
      />
    )
  }

  return (
    <App
      key={family.id}
      family={family}
      onLeft={() => {
        setNotice('')
        setFamily(null)
      }}
      onMembershipLost={() => {
        // Mantém o cache e a fila: se entrar de novo na mesma família, nada se perde
        clearSavedFamily()
        setNotice('Não foi possível acessar a família neste aparelho. Entre de novo com o código.')
        setFamily(null)
      }}
    />
  )
}
