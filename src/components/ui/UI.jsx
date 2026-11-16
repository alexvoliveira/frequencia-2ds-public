import React, { useEffect, useRef } from 'react'
import { CheckCircle2, Info, X } from 'lucide-react'
import FlatIllustration from './Illustration'

let messageSequence = 0

export function showMessage({ title, message = '', tone = 'success', duration = 4200 } = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('app-message', {
    detail: { title, message, tone, duration },
  }))
}

export function MessageHost() {
  const [messages, setMessages] = React.useState([])

  useEffect(() => {
    const onMessage = (event) => {
      const detail = event.detail || {}
      const id = `toast-${++messageSequence}`
      const item = {
        id,
        title: detail.title || (detail.tone === 'error' ? 'Não foi possível concluir' : 'Operação concluída'),
        message: detail.message || '',
        tone: detail.tone === 'error' ? 'error' : detail.tone === 'info' ? 'info' : 'success',
      }
      setMessages((current) => [...current, item].slice(-4))
      window.setTimeout(() => {
        setMessages((current) => current.filter((message) => message.id !== id))
      }, Number(detail.duration) > 0 ? Number(detail.duration) : 4200)
    }
    window.addEventListener('app-message', onMessage)
    return () => window.removeEventListener('app-message', onMessage)
  }, [])

  if (!messages.length) return null

  return (
    <div className="message-host" aria-live="polite" aria-atomic="false">
      {messages.map((item) => (
        <div key={item.id} className={`message-toast message-${item.tone}`} role="status">
          <div className="message-icon" aria-hidden="true">
            {item.tone === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="message-title">{item.title}</div>
            {item.message && <div className="message-text">{item.message}</div>}
          </div>
          <button type="button" className="message-close" onClick={() => setMessages((current) => current.filter((message) => message.id !== item.id))} aria-label="Fechar mensagem">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function Card({ className = '', children, as: Tag = 'section' }) {
  return <Tag className={`surface-card ${className}`}>{children}</Tag>
}

export function Badge({ children, tone = 'cyan' }) {
  const map = {
    cyan: 'badge-cyan', pink: 'badge-pink', orange: 'badge-orange', green: 'badge-green', purple: 'badge-purple',
  }
  return <span className={`status-badge ${map[tone] || map.cyan}`}>{children}</span>
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const map = {
    primary: 'button-primary', ghost: 'button-secondary', danger: 'button-danger',
  }
  return <button className={`app-button ${map[variant] || map.primary} ${className}`} {...props}>{children}</button>
}

export function Skeleton({ className = '', label = 'Carregando' }) {
  return <div className={`skeleton ${className}`} aria-label={label} role="status" />
}

export function FullPageLoading({ label = 'Carregando…' }) {
  return (
    <main className="min-h-screen page-shell flex items-center justify-center px-5">
      <div className="loading-panel" role="status" aria-live="polite">
        <div className="loading-dot" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </main>
  )
}

export function Modal({ title, children, onClose, width = 'max-w-xl' }) {
  const panelRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    previousFocus.current = document.activeElement
    const panel = panelRef.current
    const focusable = panel?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
    focusable?.[0]?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab' || !panel || !focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previousFocus.current?.focus?.()
    }
  }, [onClose])

  return (
    <div className="modal-backdrop">
      <div ref={panelRef} className={`modal-panel ${width}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title" className="text-base font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Fechar janela"><X size={19} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint, required = false }) {
  return <label className="field"><span className="field-label">{label}{required ? ' *' : ''}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>
}

export const inputCls = 'app-input'

export function Alert({ children, tone = 'error' }) {
  const cls = tone === 'success' ? 'alert-success' : tone === 'info' ? 'alert-info' : 'alert-error'
  return <div className={`app-alert ${cls}`} role="alert">{tone === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} /> }<div>{children}</div></div>
}

export function Empty({ title = 'Nada para mostrar aqui.', action, detail = 'Quando houver dados, eles aparecerão nesta área.' }) {
  return <div className="empty-state"><FlatIllustration type="empty" className="w-full max-w-[210px] h-auto" label="Ilustração de uma área vazia" /><div className="empty-copy"><h3>{title}</h3><p>{detail}</p>{action && <div className="mt-4">{action}</div>}</div></div>
}

export function PageError({ message, onRetry }) {
  return <div className="page-state"><FlatIllustration type="error" className="w-full max-w-[250px] h-auto" label="Ilustração indicando um erro de carregamento" /><div className="page-state-copy"><h2>Não foi possível carregar esta tela</h2><p>{message || 'Tente novamente. Se o problema continuar, verifique sua conexão.'}</p>{onRetry && <Button onClick={onRetry} className="mt-4">Tentar novamente</Button>}</div></div>
}
