import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Square,
  SquareCheck,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../lib/api'
import { formatDateBR } from '../lib/date'
import EditRecord from '../components/modals/EditRecord'
import { Badge, Button, Card, Skeleton, showMessage } from '../components/ui/UI'

export default function StudentDetails({ user }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [selectedRecords, setSelectedRecords] = useState([])
  const [historyFilter, setHistoryFilter] = useState('ALL')

  const load = useCallback(async () => {
    try {
      setError('')
      const student = await api.student(id)
      setData(student)

      if (student?.student?.classId) {
        const classStudents = await api.students(student.student.classId)
        setStudents(Array.isArray(classStudents) ? classStudents : [])
      }
    } catch (e) {
      setError(e.message || 'Não foi possível carregar os dados do aluno.')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const refresh = () => load()
    window.addEventListener('school-data-changed', refresh)
    return () => window.removeEventListener('school-data-changed', refresh)
  }, [load])

  async function remove(record) {
    if (!window.confirm(`Excluir ${record.type.toLowerCase()} deste aluno? Esta ação não poderá ser desfeita.`)) {
      return
    }

    setBusyId(`${record.entityType}-${record.id}`)
    try {
      if (record.entityType === 'ATTENDANCE') {
        await api.deleteAttendance(record.id)
      } else if (record.entityType === 'OCCURRENCE') {
        await api.deleteOccurrence(record.id)
      } else if (record.entityType === 'JUSTIFICATION') {
        await api.deleteJustification(record.id)
      } else {
        throw new Error('Tipo de registro não reconhecido.')
      }
      await load()
      showMessage({ title: 'Registro excluído', message: `${record.type} excluído com sucesso.`, tone: 'success' })
    } catch (e) {
      const message = e.message || 'Não foi possível excluir o registro.'
      showMessage({ title: 'Não foi possível excluir', message, tone: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  const historyRows = Array.isArray(data?.history) ? data.history : []
  const historyItems = historyRows.map((record, index) => ({
    record,
    key: `${record.entityType}-${record.id}-${index}`,
  }))
  const filters = [
    { value: 'ALL', label: 'Todos' },
    { value: 'ATTENDANCE', label: 'Faltas' },
    { value: 'OCCURRENCE', label: 'Ocorrências' },
    { value: 'JUSTIFICATION', label: 'Justificativas' },
  ]
  const visibleHistory = historyItems.filter(({ record }) => (
    historyFilter === 'ALL' || String(record.entityType || '').toUpperCase() === historyFilter
  ))
  const historyKeys = historyItems.map(({ key }) => key)
  const visibleHistoryKeys = visibleHistory.map(({ key }) => key)
  const allVisibleHistorySelected = visibleHistoryKeys.length > 0
    && visibleHistoryKeys.every((key) => selectedRecords.includes(key))

  useEffect(() => {
    setSelectedRecords((current) => current.filter((key) => historyKeys.includes(key)))
  }, [data?.history])

  function toggleRecord(key) {
    setSelectedRecords((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }

  function toggleAllRecords() {
    setSelectedRecords((current) => allVisibleHistorySelected
      ? current.filter((key) => !visibleHistoryKeys.includes(key))
      : [...new Set([...current, ...visibleHistoryKeys])])
  }

  async function removeSelected() {
    if (user?.role !== 'ADMIN' || !selectedRecords.length) return
    const chosen = historyRows.filter((record, index) => selectedRecords.includes(`${record.entityType}-${record.id}-${index}`))
    if (!chosen.length) return
    if (!window.confirm(`Excluir ${chosen.length} registro(s) selecionado(s)? Esta ação não poderá ser desfeita.`)) return
    setBusyId('bulk')
    try {
      const result = await api.deleteRecordsBulk(chosen)
      const deleted = Number(result?.deleted || chosen.length)
      setSelectedRecords([])
      await load()
      showMessage({ title: 'Registros excluídos', message: `${deleted} registro(s) foram excluídos com sucesso.`, tone: 'success' })
    } catch (e) {
      const message = e.message || 'Não foi possível excluir os registros selecionados.'
      showMessage({ title: 'Não foi possível excluir', message, tone: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  if (!data && !error) {
    return <Skeleton className="h-[500px]" />
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red font-semibold">Não foi possível carregar os dados.</div>
        <div className="text-sm text-muted mt-1">{error}</div>
        <Button className="mt-4" onClick={load}>Tentar novamente</Button>
      </Card>
    )
  }

  const summary = data.summary || {}
  const canManage = user?.role !== 'VIEWER'
  const canDelete = user?.role === 'ADMIN'

  return (
    <div className="space-y-5">
      <button
        onClick={() => nav(-1)}
        className="page-back-button"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue/30 to-purple/25 border border-line grid place-items-center">
          <UserRound />
        </div>
        <div>
          <div className="text-xs text-dim">Aluno / {data.student.className}</div>
          <h1 className="text-xl sm:text-2xl font-bold break-words text-wrap-safe">{data.student.name}</h1>
          {data.student.registrationNumber && (
            <div className="text-xs text-muted mt-1">{data.student.registrationNumber}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <K label="Frequência" value={`${Number(summary.attendanceRate || 0).toFixed(1).replace('.', ',')}%`} icon={CheckCircle2} />
        <K label="Faltas" value={summary.absences || 0} icon={CalendarDays} />
        <K label="Justificadas" value={summary.justified || 0} icon={CheckCircle2} />
        <K label="Ocorrências" value={summary.occurrences || 0} icon={AlertTriangle} />
      </div>

      <div className="grid xl:grid-cols-[1.3fr_.7fr] gap-3.5">
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Evolução das faltas</h2>
          {data.evolution?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.evolution}>
                  <CartesianGrid stroke="rgba(168,177,204,.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="#69738F" fontSize={10} />
                  <YAxis allowDecimals={false} stroke="#69738F" fontSize={10} />
                  <Tooltip />
                  <Line
                    dataKey="absences"
                    name="Faltas"
                    stroke="#FF176B"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-14 text-center text-muted">Ainda não há evolução registrada.</div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Indicadores</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Posição em faltas" value={summary.absenceRank ? `#${summary.absenceRank}` : '—'} />
            <Row label="Posição em ocorrências" value={summary.occurrenceRank ? `#${summary.occurrenceRank}` : '—'} />
            <Row label="Limite anual de faltas" value={summary.annualAbsenceLimit || 450} />
            <Row label="Último registro" value={summary.lastDate || '—'} />
          </div>
        </Card>
      </div>

      <Card className="p-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold">Histórico</h2>
            <p className="text-xs text-dim mt-1">
              {historyRows.length} registro(s). Filtre faltas, ocorrências ou justificativas para encontrar o que precisa.
            </p>
          </div>
          {canDelete && historyRows.length > 0 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleAllRecords} className="h-8 px-2.5 rounded-lg border border-line text-xs text-muted hover:text-text inline-flex items-center gap-1.5">
                {allVisibleHistorySelected ? <SquareCheck size={14} /> : <Square size={14} />} {allVisibleHistorySelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}
              </button>
              {selectedRecords.length > 0 && (
                <button type="button" onClick={removeSelected} disabled={busyId === 'bulk'} className="h-8 px-2.5 rounded-lg bg-red/10 border border-red/20 text-xs text-red hover:bg-red/15 disabled:opacity-50 inline-flex items-center gap-1.5">
                  <Trash2 size={14} /> {busyId === 'bulk' ? 'Excluindo…' : `Excluir ${selectedRecords.length}`}
                </button>
              )}
            </div>
          )}
        </div>

        {historyRows.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4" aria-label="Filtrar histórico por tipo">
            {filters.map((filter) => {
              const count = filter.value === 'ALL'
                ? historyRows.length
                : historyRows.filter((record) => String(record.entityType || '').toUpperCase() === filter.value).length
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={historyFilter === filter.value}
                  onClick={() => setHistoryFilter(filter.value)}
                  className={`min-h-9 px-3 rounded-lg border text-xs font-semibold transition-colors ${historyFilter === filter.value ? 'border-cyan/40 bg-cyan/10 text-cyan' : 'border-line text-muted hover:text-text hover:bg-white/[.03]'}`}
                >
                  {filter.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {!historyRows.length ? (
          <div className="py-12 text-center text-muted">Não há registros para este aluno.</div>
        ) : !visibleHistory.length ? (
          <div className="py-12 text-center text-muted">Não há registros nesta categoria.</div>
        ) : (
          <div className="space-y-2">
            {visibleHistory.map(({ record, key }) => {
              const selected = selectedRecords.includes(key)
              const busy = busyId === `${record.entityType}-${record.id}` || busyId === 'bulk'
              const canDeleteRecord = canDelete || (
                user?.role === 'TEACHER'
                && record.entityType === 'OCCURRENCE'
                && String(record.createdBy || '') === String(user?.id || '')
                && record.caseStatus === 'UNREAD'
              )
              const title = record.type === 'Falta'
                ? 'Falta'
                : record.type === 'Justificativa'
                  ? 'Justificativa'
                  : record.type

              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-xl border border-line hover:border-line2"
                >
                  {canDelete && (
                    <button type="button" onClick={() => toggleRecord(key)} aria-label={selected ? 'Desmarcar registro' : 'Selecionar registro'} className={`w-7 h-7 rounded-md border grid place-items-center shrink-0 ${selected ? 'bg-cyan text-slate-950 border-cyan' : 'border-line text-transparent hover:border-line2'}`}>
                      <Check size={13} />
                    </button>
                  )}
                  <div className="w-8 h-8 rounded-lg bg-white/[.04] grid place-items-center shrink-0">
                    <Clock3 size={15} className="text-cyan" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-sm font-semibold">{title}</span>
                      <span className="text-[11px] text-dim">{formatDateBR(record.date)}</span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {record.description || record.reason || 'Sem descrição'}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge tone={record.type === 'Falta' ? 'pink' : record.type === 'Justificativa' ? 'purple' : 'orange'}>
                        {record.status || 'Confirmado'}
                      </Badge>
                      {record.quantity ? (
                        <span className="text-[11px] text-dim">{record.quantity} aula(s)</span>
                      ) : null}
                      {record.occurrenceTypeName ? (
                        <span className="text-[11px] text-dim">{record.occurrenceTypeName}</span>
                      ) : null}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex gap-1 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        className="h-9 sm:h-8 flex-1 sm:flex-none px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-muted hover:text-cyan hover:bg-cyan/10"
                        title="Editar registro"
                        aria-label="Editar registro"
                        onClick={() => setEditing(record)}
                        disabled={busy}
                      >
                        <Pencil size={14} />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      {canDeleteRecord && <button
                        type="button"
                        disabled={busy}
                        className="h-9 sm:h-8 flex-1 sm:flex-none px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-red hover:bg-red/10 disabled:opacity-50"
                        title={`Excluir ${record.type.toLowerCase()}`}
                        aria-label={`Excluir ${record.type.toLowerCase()}`}
                        onClick={() => remove(record)}
                      >
                        <Trash2 size={14} />
                        <span>{busy ? 'Excluindo…' : record.entityType === 'ATTENDANCE' ? 'Excluir falta' : record.entityType === 'OCCURRENCE' ? 'Excluir ocorrência' : 'Excluir justificativa'}</span>
                      </button>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {editing && (
        <EditRecord
          record={editing}
          students={students}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      )}
    </div>
  )
}

function K({ label, value, icon: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex justify-between">
        <span className="text-xs text-muted">{label}</span>
        <Icon size={16} className="text-cyan" />
      </div>
      <div className="text-2xl font-extrabold mt-3">{value}</div>
    </Card>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-line pb-3 gap-4">
      <span className="text-muted">{label}</span>
      <b>{value}</b>
    </div>
  )
}
