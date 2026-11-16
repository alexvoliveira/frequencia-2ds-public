import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, MessageSquarePlus, RefreshCw, Search } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Card, Empty, Field, inputCls, showMessage } from '../components/ui/UI'

const STATUS = [
  ['UNREAD', 'Não lidos'],
  ['IN_REVIEW', 'Em revisão'],
  ['RESOLVED', 'Resolvidos'],
]

const labels = {
  UNREAD: 'Não lido',
  IN_REVIEW: 'Em revisão',
  RESOLVED: 'Resolvido',
}

const statusTone = {
  UNREAD: 'orange',
  IN_REVIEW: 'purple',
  RESOLVED: 'green',
}

export default function TeacherFeedback({ user, selectedClassId = '' }) {
  const isAdmin = user?.role === 'ADMIN'
  const isTeacher = user?.role === 'TEACHER'

  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('UNREAD')
  const [selected, setSelected] = useState(null)
  const [response, setResponse] = useState('')
  const [search, setSearch] = useState('')
  const [classes, setClasses] = useState([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackClassId, setFeedbackClassId] = useState(selectedClassId || '')
  const [composeOpen, setComposeOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await api.teacherFeedback()
      setRows(Array.isArray(data) ? data : [])
    } catch (rpcError) {
      setRows([])
      setError(rpcError.message || 'Não foi possível carregar os feedbacks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!isTeacher) return undefined

    const refresh = () => {
      if (!document.hidden) load()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [isTeacher])

  useEffect(() => {
    setFeedbackClassId(selectedClassId || '')
  }, [selectedClassId])

  useEffect(() => {
    if (!isTeacher) return undefined
    let active = true
    api.classes()
      .then((data) => { if (active) setClasses(Array.isArray(data) ? data : []) })
      .catch(() => { if (active) setClasses([]) })
    return () => { active = false }
  }, [isTeacher])

  const counts = useMemo(() => (
    rows.reduce((acc, item) => {
      if (acc[item.status] !== undefined) acc[item.status] += 1
      return acc
    }, { UNREAD: 0, IN_REVIEW: 0, RESOLVED: 0 })
  ), [rows])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return rows
      .filter((item) => item.status === status)
      .filter((item) => {
        if (!query) return true
        return [item.subject, item.message, item.teacherName, item.className]
          .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(query))
      })
  }, [rows, search, status])

  async function openItem(item) {
    setError('')

    if (!isAdmin || item.status !== 'UNREAD') {
      setSelected(item)
      setResponse(item.response || '')
      return
    }

    setBusy(true)
    try {
      const data = await api.openTeacherFeedback(item.id)
      const updated = { ...item, ...data }
      setRows((current) => current.map((row) => row.id === item.id ? updated : row))
      setSelected(updated)
      setResponse(updated.response || '')
      setStatus('IN_REVIEW')
    } catch (rpcError) {
      setError(rpcError.message || 'Não foi possível abrir o feedback.')
    } finally {
      setBusy(false)
    }
  }

  async function resolveItem() {
    if (!selected || !isAdmin) return
    const trimmed = response.trim()

    if (!trimmed) {
      setError('Informe a resposta da direção antes de resolver o feedback.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const data = await api.resolveTeacherFeedback(selected.id, trimmed)
      const updated = { ...selected, ...data }
      setRows((current) => current.map((row) => row.id === selected.id ? updated : row))
      setSelected(updated)
      setResponse(updated.response || trimmed)
      setStatus('RESOLVED')
      showMessage({
        title: 'Feedback resolvido',
        message: 'A resposta foi registrada para o professor.',
        tone: 'success',
      })
    } catch (rpcError) {
      setError(rpcError.message || 'Não foi possível registrar a resposta.')
    } finally {
      setBusy(false)
    }
  }

  async function sendFeedback(event) {
    event.preventDefault()
    if (!isTeacher) return

    const cleanSubject = subject.trim()
    const cleanMessage = message.trim()

    if (cleanSubject.length < 3) {
      setError('Informe um assunto para o feedback.')
      return
    }

    if (cleanMessage.length < 3) {
      setError('Escreva o feedback antes de enviar.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const created = await api.createTeacherFeedback({
        classId: feedbackClassId || null,
        subject: cleanSubject,
        message: cleanMessage,
      })
      setRows((current) => [created, ...current])
      setSubject('')
      setMessage('')
      setComposeOpen(false)
      setStatus('UNREAD')
      showMessage({
        title: 'Feedback enviado',
        message: 'A direção poderá consultar e responder pelo site.',
        tone: 'success',
      })
    } catch (rpcError) {
      setError(rpcError.message || 'Não foi possível enviar o feedback.')
    } finally {
      setBusy(false)
    }
  }

  if (!isAdmin && !isTeacher) {
    return (
      <section className="page-section">
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Feedback dos professores</h1>
          <p className="text-sm text-muted mt-2">
            Você não possui permissão para acessar este recurso.
          </p>
        </Card>
      </section>
    )
  }

  return (
    <section className="page-section grid gap-5">
      <div className="page-header">
        <div>
          <div className="eyebrow">Comunicação interna</div>
          <h1>{isAdmin ? 'Feedback dos professores' : 'Meu feedback'}</h1>
          <p>
            {isAdmin
              ? 'Receba, acompanhe e responda os feedbacks enviados pelos professores.'
              : 'Envie uma situação, observação ou sugestão para a direção e acompanhe a resposta pelo site.'}
          </p>
        </div>

        {isTeacher && (
          <Button onClick={() => setComposeOpen((value) => !value)}>
            <MessageSquarePlus size={16} />
            {composeOpen ? 'Fechar' : 'Novo feedback'}
          </Button>
        )}
      </div>

      {composeOpen && isTeacher && (
        <Card className="p-5 grid gap-4">
          <div>
            <h2 className="font-semibold">Enviar feedback para a direção</h2>
            <p className="text-xs text-muted mt-1">
              O feedback ficará disponível para a direção dentro do sistema.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={sendFeedback}>
            <div className="grid md:grid-cols-[1fr_280px] gap-3">
              <Field label="Assunto" required>
                <input
                  className={inputCls}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={160}
                  placeholder="Ex.: Situação de sala, sugestão, dificuldade..."
                  required
                />
              </Field>

              <Field label="Turma relacionada">
                <select
                  className={inputCls}
                  value={feedbackClassId}
                  onChange={(event) => setFeedbackClassId(event.target.value)}
                >
                  <option value="">Nenhuma turma específica</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Mensagem" required>
              <textarea
                className={`${inputCls} min-h-36 py-2`}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={8000}
                placeholder="Descreva a situação com o contexto necessário."
                required
              />
            </Field>

            {error && (
              <div className="app-alert alert-error" role="alert">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setComposeOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar feedback'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!composeOpen && error && (
        <div className="app-alert alert-error" role="alert">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {STATUS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-xl border px-4 py-3 text-left transition ${status === value ? 'border-cyan bg-cyan/10' : 'border-line bg-white/[.02] hover:border-line2'}`}
          >
            <span className="text-xs text-muted">{label}</span>
            <strong className="block text-lg mt-1">{counts[value]}</strong>
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" aria-hidden="true" />
            <input
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isAdmin ? 'Pesquisar professor, turma ou assunto' : 'Pesquisar assunto ou turma'}
              aria-label="Pesquisar feedback"
            />
          </div>
          <Button variant="ghost" onClick={load} disabled={loading || busy}>
            <RefreshCw size={15} />
            Atualizar
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted">Carregando feedbacks…</Card>
      ) : !filtered.length ? (
        <Card><Empty title="Nenhum feedback nesta situação" detail={isAdmin ? 'Quando um professor enviar um feedback, ele aparecerá aqui.' : 'Seus feedbacks enviados aparecerão aqui.'} /></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              disabled={busy}
              className="surface-card p-4 text-left transition hover:border-line2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold">{item.subject}</span>
                <span className={`status-badge badge-${statusTone[item.status] || 'cyan'}`}>
                  {labels[item.status]}
                </span>
                {item.className && <span className="text-[10px] text-muted">{item.className}</span>}
                <span className="text-[10px] text-dim ml-auto">
                  {new Date(item.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>

              {isAdmin && (
                <div className="mt-2 text-xs text-muted">
                  Professor: <strong className="text-text">{item.teacherName || 'Não informado'}</strong>
                </div>
              )}

              <p className="mt-2 text-sm text-muted line-clamp-2">{item.message}</p>

              {item.status === 'RESOLVED' && item.response && (
                <div className="mt-3 rounded-lg border border-line bg-white/[.03] p-3">
                  <div className="text-[11px] text-muted">Resposta da direção</div>
                  <div className="text-sm mt-1 line-clamp-3">{item.response}</div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null)
          }}
        >
          <div className="modal-panel max-w-2xl">
            <div className="modal-header">
              <div>
                <div className="eyebrow">Feedback #{selected.id}</div>
                <h2 className="text-lg font-bold">{selected.subject}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="Fechar feedback">
                ×
              </button>
            </div>

            <div className="modal-body grid gap-5">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted">Professor</div>
                  <div className="font-semibold">{selected.teacherName || user?.name || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Turma</div>
                  <div className="font-semibold">{selected.className || 'Sem turma específica'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted">Feedback</div>
                <div className="mt-2 rounded-xl border border-line bg-white/[.02] p-4 whitespace-pre-wrap text-sm">
                  {selected.message}
                </div>
              </div>

              <div className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {selected.status === 'RESOLVED' ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                  Situação: {labels[selected.status]}
                </div>
                {selected.handledByName && (
                  <div className="text-xs text-muted mt-2">
                    {selected.status === 'RESOLVED' ? 'Respondido por' : 'Em revisão por'}{' '}
                    <strong className="text-text">{selected.handledByName}</strong>
                  </div>
                )}
              </div>

              {selected.status === 'RESOLVED' ? (
                <div className="rounded-xl border border-line p-4">
                  <div className="text-xs text-muted">Resposta da direção</div>
                  <div className="mt-2 text-sm whitespace-pre-wrap">
                    {selected.response || 'Nenhuma resposta registrada.'}
                  </div>
                  {selected.handledAt && (
                    <div className="text-[11px] text-dim mt-3">
                      Respondido em {new Date(selected.handledAt).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              ) : isAdmin ? (
                <Field label="Resposta da direção" required>
                  <textarea
                    className={`${inputCls} min-h-36 py-2`}
                    value={response}
                    onChange={(event) => setResponse(event.target.value)}
                    maxLength={8000}
                    placeholder="Escreva a resposta, orientação ou encaminhamento para o professor."
                    disabled={busy}
                  />
                </Field>
              ) : (
                <div className="rounded-xl border border-line p-4">
                  <div className="text-xs text-muted">Resposta da direção</div>
                  <p className="text-sm text-muted mt-2">
                    A direção ainda não registrou uma resposta para este feedback.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Fechar
                </Button>
                {isAdmin && selected.status === 'IN_REVIEW' && (
                  <Button onClick={resolveItem} disabled={busy || !response.trim()}>
                    <CheckCircle2 size={15} />
                    Resolver feedback
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
