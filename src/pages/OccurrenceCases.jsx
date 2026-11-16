import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, RefreshCw, Search } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Field, inputCls, showMessage } from '../components/ui/UI'

const STATUS = [
  ['ALL', 'Todas'],
  ['UNREAD', 'Não lidas'],
  ['IN_REVIEW', 'Em revisão'],
  ['RESOLVED', 'Resolvidas'],
]

const labels = {
  UNREAD: 'Não lida',
  IN_REVIEW: 'Em revisão',
  RESOLVED: 'Resolvida',
}

export default function OccurrenceCases({ user, selectedClassId = '' }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [response, setResponse] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isAdmin = user?.role === 'ADMIN'
  const isTeacher = user?.role === 'TEACHER'

  async function load() {
    setLoading(true)
    setError('')

    try {
      if (!selectedClassId) {
        setRows([])
        setLoading(false)
        return
      }

      const data = await api.occurrenceCases(selectedClassId)
      setRows(Array.isArray(data) ? data : [])
    } catch (rpcError) {
      setError(rpcError.message || 'Não foi possível carregar as ocorrências.')
      setRows([])
    }

    setLoading(false)
  }

  useEffect(() => {
    setSelected(null)
    setResponse('')
    load()
  }, [selectedClassId])

  useEffect(() => {
    if (!isTeacher) return undefined

    const refreshWhenVisible = () => {
      if (!document.hidden) load()
    }

    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [isTeacher, selectedClassId])

  const counts = useMemo(() => {
    return rows.reduce((acc, item) => {
      acc.ALL += 1
      if (acc[item.status] !== undefined) acc[item.status] += 1
      return acc
    }, { ALL: 0, UNREAD: 0, IN_REVIEW: 0, RESOLVED: 0 })
  }, [rows])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    const byStatus = status === 'ALL' ? rows : rows.filter((item) => item.status === status)

    if (!query) return byStatus

    return byStatus.filter((item) => [
      item.className,
      item.teacherName,
      ...(item.students || []).map((student) => student.name),
    ].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(query)))
  }, [rows, search, status])

  async function openCase(item) {
    setError('')

    if (!isAdmin || item.status !== 'UNREAD') {
      setSelected(item)
      setResponse(item.response || '')
      return
    }

    setBusy(true)

    let data
    try {
      data = await api.openOccurrenceCase(item.id, selectedClassId)
    } catch (rpcError) {
      setError(rpcError.message || 'Não foi possível abrir a ocorrência.')
      setBusy(false)
      return
    }

    const updated = { ...item, ...data }
    setRows((current) => current.map((row) => row.id === item.id ? updated : row))
    setSelected(updated)
    setResponse(updated.response || '')
    setBusy(false)
  }

  async function resolveCase() {
    if (!selected || !isAdmin) return

    const trimmed = response.trim()
    if (!trimmed) {
      setError('Informe a resposta da direção antes de resolver a ocorrência.')
      return
    }

    setBusy(true)
    setError('')

    let data
    try {
      data = await api.resolveOccurrenceCase(selected.id, selectedClassId, trimmed)
    } catch (rpcError) {
      setError(rpcError.message || 'Não foi possível resolver a ocorrência.')
      setBusy(false)
      return
    }

    showMessage({
      title: 'Ocorrência resolvida',
      message: 'A resposta da direção foi registrada.',
      tone: 'success',
    })

    const updated = { ...selected, ...data }
    setRows((current) => current.map((row) => row.id === selected.id ? updated : row))
    setSelected(updated)
    setResponse(updated.response || trimmed)
    setBusy(false)
  }

  if (!isAdmin && !isTeacher) {
    return (
      <section className="page-section">
        <div className="occurrence-panel p-6">
          <h1 className="text-xl font-semibold">Ocorrências</h1>
          <p className="text-sm text-muted mt-2">
            Você não possui permissão para acessar o acompanhamento de ocorrências.
          </p>
        </div>
      </section>
    )
  }

  const searchPlaceholder = isAdmin
    ? 'Pesquisar turma, professor ou aluno'
    : 'Pesquisar turma ou aluno'

  return (
    <section className="page-section occurrence-cases-page grid gap-5">
      <div className="page-header">
        <div>
          <div className="eyebrow">Acompanhamento</div>
          <h1>{isAdmin ? 'Ocorrências da turma' : 'Minhas ocorrências da turma'}</h1>
          <p>
            {isAdmin
              ? 'Acompanhe as ocorrências desta turma, registre a revisão e informe o desfecho.'
              : 'Acompanhe no site o andamento das ocorrências que você registrou nesta turma.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {STATUS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`occurrence-status-card rounded-xl border px-4 py-3 text-left transition ${status === value ? 'border-cyan bg-cyan/10' : 'border-line bg-white/[.02] hover:border-line2'}`}
          >
            <span className="text-xs text-muted">{label}</span>
            <strong className="block text-lg mt-1">{counts[value]}</strong>
          </button>
        ))}
      </div>

      <div className="occurrence-panel p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dim"
              aria-hidden="true"
            />
            <input
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>
          <Button variant="ghost" onClick={load} disabled={loading || busy}>
            <RefreshCw size={15} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="text-sm text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2"
          role="alert"
        >
          {error}
        </div>
      )}

      {!selectedClassId ? (
        <div className="occurrence-panel p-8 text-center text-sm text-muted">
          Selecione uma turma para consultar as ocorrências.
        </div>
      ) : loading ? (
        <div className="occurrence-panel p-8 text-center text-sm text-muted">
          Carregando ocorrências…
        </div>
      ) : !filtered.length ? (
        <div className="panel p-8 text-center text-sm text-muted">
          Nenhuma ocorrência nesta situação.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openCase(item)}
              disabled={busy}
              className="occurrence-case-card occurrence-panel p-4 text-left transition disabled:opacity-60"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold">{item.className}</span>
                <span className="text-[10px] px-2 py-1 rounded-full border border-line">
                  {labels[item.status]}
                </span>
                <span className="text-[10px] text-dim">{item.date}</span>
              </div>

              <div className="mt-3 text-sm font-semibold">
                {(item.students || []).map((student) => student.name).join(', ')}
              </div>

              {isAdmin && (
                <div className="mt-1 text-xs text-muted">
                  Professor: {item.teacherName || 'Não informado'}
                </div>
              )}

              {item.status === 'RESOLVED' && item.response && (
                <div className="mt-3 rounded-lg border border-line bg-white/[.02] p-3">
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
          className="occurrence-modal-backdrop fixed inset-0 z-50 p-4 grid place-items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null)
          }}
        >
          <div className="occurrence-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 grid gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">Ocorrência #{selected.id}</div>
                <h2 className="text-xl font-semibold">{selected.className}</h2>
                <p className="text-sm text-muted mt-1">{selected.date}</p>
              </div>
              <button
                type="button"
                className="text-sm text-muted hover:text-text"
                onClick={() => setSelected(null)}
              >
                Fechar
              </button>
            </div>

            {isAdmin && (
              <div>
                <div className="text-xs text-muted">Professor</div>
                <div className="text-sm font-semibold">
                  {selected.teacherName || 'Não informado'}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-muted mb-2">Alunos</div>
              <div className="grid gap-2">
                {(selected.students || []).map((student) => (
                  <div key={student.id} className="occurrence-detail-item rounded-lg border border-line p-3">
                    <div className="text-sm font-semibold">{student.name}</div>
                    <div className="text-xs text-muted mt-1">
                      {student.type} · {student.severity}
                    </div>
                    <div className="text-sm mt-2 whitespace-pre-wrap">
                      {student.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="occurrence-detail-card rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {selected.status === 'RESOLVED'
                  ? <CheckCircle2 size={16} />
                  : <Clock3 size={16} />}
                Situação: {labels[selected.status]}
              </div>

              {selected.handledByName && (
                <div className="text-xs text-muted mt-2">
                  {selected.status === 'RESOLVED' ? 'Resolvida por' : 'Em revisão por'}:{' '}
                  <strong className="text-text">{selected.handledByName}</strong>
                </div>
              )}
            </div>

            {selected.status === 'RESOLVED' ? (
              <div className="rounded-xl border border-line p-4">
                <div className="text-xs text-muted">Resposta da direção</div>
                <div className="text-sm mt-2 whitespace-pre-wrap">
                  {selected.response || 'Nenhuma resposta registrada.'}
                </div>
                {selected.handledAt && (
                  <div className="text-[11px] text-dim mt-3">
                    Atualizada em {new Date(selected.handledAt).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            ) : isAdmin ? (
              <Field label="Resposta da direção">
                <textarea
                  className={`${inputCls} min-h-32 py-2`}
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  placeholder="Registre como a ocorrência foi tratada e qual foi o encaminhamento."
                  disabled={busy}
                  maxLength={8000}
                />
              </Field>
            ) : (
              <div className="rounded-xl border border-line p-4">
                <div className="text-xs text-muted">Resposta da direção</div>
                <div className="text-sm mt-2 text-muted">
                  A direção ainda não registrou a resposta desta ocorrência.
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Fechar
              </Button>

              {isAdmin && selected.status === 'IN_REVIEW' && (
                <Button
                  onClick={resolveCase}
                  disabled={busy || !response.trim()}
                >
                  <CheckCircle2 size={15} />
                  Resolver ocorrência
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
