import { useState } from 'react'
import { copyText, inviteText, nativeShare, whatsappLink } from '../lib/family.js'

// Tenta a janela de compartilhar do celular; se não houver (http, alguns
// navegadores de computador), mostra WhatsApp + Copiar + o texto do convite.
export default function InviteButton({ code, className }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null) // null | true | false
  const text = inviteText(code)

  async function handleClick() {
    setCopied(null)
    const r = await nativeShare(text)
    if (r === 'unsupported') setOpen(true)
  }

  async function handleCopy() {
    setCopied(await copyText(text))
  }

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        Enviar convite
      </button>
      {open && (
        <div className="basis-full w-full bg-bg border-2 rounded-[14px] p-3 mt-2.5 text-left" style={{ borderColor: 'var(--line)' }}>
          <div className="flex gap-2 mb-2.5">
            <a
              href={whatsappLink(text)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center no-underline border-2 border-ink rounded-xl py-2 text-[13px] font-bold bg-teal text-teal-text"
            >
              WhatsApp
            </a>
            <button
              type="button"
              className="flex-1 border-2 border-ink rounded-xl py-2 text-[13px] font-bold bg-violet-soft text-violet"
              onClick={handleCopy}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <textarea
            readOnly
            rows={3}
            value={text}
            onFocus={(e) => e.target.select()}
            className="w-full resize-none border-2 rounded-xl p-2 text-[12px] font-semibold bg-card text-ink"
            style={{ borderColor: 'var(--line)' }}
            aria-label="Texto do convite"
          />
          {copied === false && (
            <p className="text-[12px] font-semibold text-ink-soft mt-1.5 mb-0">
              Não deu para copiar sozinho — toque no texto, selecione e copie.
            </p>
          )}
        </div>
      )}
    </>
  )
}
