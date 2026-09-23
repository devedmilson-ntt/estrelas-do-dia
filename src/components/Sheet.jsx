import { useEffect, useRef } from 'react'

export default function Sheet({ open, onClose, title, children }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(59,42,85,0.45)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-[460px] max-h-[80vh] overflow-y-auto bg-card border-[2.5px] border-ink rounded-t-[28px] p-[22px] pb-[30px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[19px] text-ink m-0">{title}</h3>
          <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
