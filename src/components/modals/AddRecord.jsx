import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarX, Check, FileCheck2, Search, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { Button, Field, inputCls, Modal, showMessage } from '../ui/UI'
import StudentSelect from '../ui/StudentSelect'
import { todayIsoBrazil, formatDateBR } from '../../lib/date'

const today = todayIsoBrazil()

const recordTypes = [
  { value: 'attendance', label: 'Falta', description: 'Registrar aulas não frequentadas.', icon: CalendarX, tone: 'pink' },
  { value: 'occurrence', label: 'Ocorrência', description: 'Registrar um acontecimento disciplinar ou escolar.', icon: AlertTriangle, tone: 'orange' },
  { value: 'justification', label: 'Justificativa', description: 'Relacionar uma falta existente a uma justificativa.', icon: FileCheck2, tone: 'purple' },
]

function normalizeRows(result) {
  return Array.isArray(result) ? result : (result?.data || [])
}

export default function AddRecord({ type: initialType = 'attendance', classId = '1', students = [], onClose, onSaved }) {
  const [type, setType] = useState(initialType)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [studentFilter, setStudentFilter] = useState('')
  const [perStudent, setPerStudent] = useState({})
  const [data, setData] = useState({
    studentId: '',
    date: today,
    quantity: 9,
    reason: '',
    notes: '',
    generalMessage: '',
    occurrenceTypeId: '',
    description: '',
    severity: 'LOW',
    attendanceId: '',
  })
  const [options, setOptions] = useState(students)
  const [types, setTypes] = useState([])
  const [absenceOptions, setAbsenceOptions] = useState([])
  const [absenceByStudent, setAbsenceByStudent] = useState({})
  const [existingAttendanceStudents, setExistingAttendanceStudents] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setLoading(true)

    Promise.all([
      api.students(classId),
      api.occurrenceTypes(),
    ])
      .then(([studentRows, occurrenceTypes]) => {
        if (!live) return
        setOptions(Array.isArray(studentRows) ? studentRows : [])
        setTypes(Array.isArray(occurrenceTypes) ? occurrenceTypes : [])
      })
      .catch((e) => {
        if (live) setError(e.message || 'Não foi possível carregar os dados do formulário.')
      })
      .finally(() => live && setLoading(false))

    return () => {
      live = false
    }
  }, [classId])

  useEffect(() => {
    setData((current) => ({
      ...current,
      occurrenceTypeId: type === 'occurrence' ? current.occurrenceTypeId : '',
      attendanceId: type === 'justification' ? current.attendanceId : '',
    }))
    setError('')
    setExistingAttendanceStudents(new Set())
    setAbsenceByStudent({})
    setAbsenceOptions([])
    setPerStudent({})
    setData((current) => ({ ...current, generalMessage: '' }))
  }, [type])

  useEffect(() => {
    setPerStudent((current) => {
      const next = { ...current }
      for (const id of selectedStudentIds) {
        if (!next[id]) next[id] = { detail: '', notes: '', attendanceId: '' }
      }
      for (const id of Object.keys(next)) {
        if (!selectedStudentIds.includes(id)) delete next[id]
      }
      return next
    })
  }, [selectedStudentIds])

  useEffect(() => {
    let live = true
    if (!data.date || !classId || !['attendance', 'justification'].includes(type)) return undefined

    setRecordsLoading(true)
    api.attendance({ classId, startDate: data.date, endDate: data.date, limit: 100 })
      .then((result) => {
        if (!live) return
        const rows = normalizeRows(result).filter((row) => row.status === 'ABSENT')
        if (type === 'attendance') {
          setExistingAttendanceStudents(new Set(rows.map((row) => String(row.student_id ?? row.studentId))))
          setSelectedStudentIds((current) => current.filter((id) => !rows.some((row) => String(row.student_id ?? row.studentId) === String(id))))
        } else {
          const grouped = rows.reduce((acc, row) => {
            const studentId = String(row.student_id ?? row.studentId)
            if (!acc[studentId]) acc[studentId] = []
            acc[studentId].push(row)
            return acc
          }, {})
          setAbsenceByStudent(grouped)
          if (!bulkMode && data.studentId) {
            setAbsenceOptions(grouped[String(data.studentId)] || [])
          }
          setPerStudent((current) => {
            const next = { ...current }
            for (const studentId of Object.keys(next)) {
              const matches = grouped[studentId] || []
              if (matches.length === 1) next[studentId] = { ...next[studentId], attendanceId: String(matches[0].id) }
              else if (!matches.some((item) => String(item.id) === String(next[studentId]?.attendanceId))) next[studentId] = { ...next[studentId], attendanceId: '' }
            }
            return next
          })
        }
      })
      .catch(() => {
        if (!live) return
        if (type === 'attendance') setExistingAttendanceStudents(new Set())
        else setAbsenceByStudent({})
      })
      .finally(() => live && setRecordsLoading(false))

    return () => {
      live = false
    }
  }, [classId, data.date, data.studentId, type, bulkMode])

  useEffect(() => {
    if (type !== 'justification' || bulkMode || !data.studentId || !data.date) {
      if (!bulkMode) setAbsenceOptions([])
      return
    }
    setAbsenceOptions(absenceByStudent[String(data.studentId)] || [])
  }, [absenceByStudent, bulkMode, data.date, data.studentId, type])

  const selectedStudents = useMemo(
    () => options.filter((student) => selectedStudentIds.includes(String(student.id))),
    [options, selectedStudentIds],
  )

  const filteredStudents = useMemo(() => {
    const query = studentFilter.trim().toLocaleLowerCase('pt-BR')
    if (!query) return options
    return options.filter((student) => String(student.name || '').toLocaleLowerCase('pt-BR').includes(query))
  }, [options, studentFilter])

  const availableForBulk = filteredStudents.filter((student) => {
    if (type !== 'attendance') return true
    return !existingAttendanceStudents.has(String(student.id))
  })

  const allFilteredSelected = availableForBulk.length > 0 && availableForBulk.every((student) => selectedStudentIds.includes(String(student.id)))

  const bulkReady = selectedStudentIds.length > 0 && (
    type !== 'justification' || selectedStudentIds.every((id) => Boolean(perStudent[id]?.attendanceId))
  )

  const set = (key, value) => setData((current) => ({ ...current, [key]: value }))

  function setStudentDetail(studentId, key, value) {
    const id = String(studentId)
    setPerStudent((current) => ({
      ...current,
      [id]: { ...(current[id] || { detail: '', notes: '', attendanceId: '' }), [key]: value },
    }))
  }

  function toggleBulk(enabled) {
    setBulkMode(enabled)
    setError('')
    if (enabled) {
      setSelectedStudentIds(data.studentId ? [String(data.studentId)] : [])
      setStudentFilter('')
      return
    }
    const fallback = selectedStudentIds[0] || ''
    setData((current) => ({ ...current, studentId: fallback, attendanceId: fallback ? String(perStudent[fallback]?.attendanceId || '') : '' }))
    setSelectedStudentIds([])
  }

  function toggleStudent(studentId) {
    const id = String(studentId)
    if (type === 'attendance' && existingAttendanceStudents.has(id)) return
    setSelectedStudentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function toggleAllFiltered() {
    const ids = availableForBulk.map((student) => String(student.id))
    setSelectedStudentIds((current) => {
      if (allFilteredSelected) return current.filter((id) => !ids.includes(id))
      return Array.from(new Set([...current, ...ids]))
    })
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      if (!bulkMode && !data.studentId) throw new Error('Selecione um aluno.')
      if (bulkMode && !bulkReady) throw new Error(type === 'justification' ? 'Selecione uma falta para cada aluno.' : 'Selecione pelo menos um aluno.')
      if (bulkMode && !data.generalMessage.trim()) throw new Error('A mensagem geral é obrigatória para adicionar registros a vários alunos.')

      if (type === 'attendance') {
        if (bulkMode) {
          await api.createAttendanceBulk({
            classId: Number(classId),
            date: data.date,
            quantity: Number(data.quantity),
            generalMessage: data.generalMessage,
            students: selectedStudentIds.map((studentId) => ({ studentId, notes: perStudent[studentId]?.notes || null })),
          })
        } else {
          await api.createAttendance({
            studentId: Number(data.studentId),
            classId: Number(classId),
            date: data.date,
            status: 'ABSENT',
            quantity: Number(data.quantity),
            notes: data.notes || null,
          })
        }
      } else if (type === 'occurrence') {
        if (!data.occurrenceTypeId) throw new Error('Selecione o tipo de ocorrência.')
        if (bulkMode) {
          await api.createOccurrenceBulk({
            classId: Number(classId),
            date: data.date,
            occurrenceTypeId: Number(data.occurrenceTypeId),
            severity: data.severity,
            generalMessage: data.generalMessage,
            students: selectedStudentIds.map((studentId) => ({
              studentId,
              description: perStudent[studentId]?.detail || null,
            })),
          })
        } else {
          await api.createOccurrence({
            studentId: Number(data.studentId),
            classId: Number(classId),
            date: data.date,
            occurrenceTypeId: Number(data.occurrenceTypeId),
            description: data.description,
            severity: data.severity,
          })
        }
      } else if (bulkMode) {
        if (!data.reason.trim()) throw new Error('Informe o motivo da justificativa.')
        await api.createJustificationBulk({
          date: data.date,
          reason: data.reason,
          generalMessage: data.generalMessage,
          students: selectedStudentIds.map((studentId) => ({
            studentId,
            attendanceId: perStudent[studentId]?.attendanceId,
            description: perStudent[studentId]?.detail || null,
          })),
        })
      } else {
        if (!data.attendanceId) throw new Error('Selecione a falta que será justificada.')
        await api.createJustification({
          studentId: Number(data.studentId),
          date: data.date,
          attendanceId: Number(data.attendanceId),
          reason: data.reason,
          description: data.description || data.notes || '',
        })
      }

      const savedCount = bulkMode ? selectedStudentIds.length : 1
      const labels = { attendance: 'falta(s)', occurrence: 'ocorrência(s)', justification: 'justificativa(s)' }
      showMessage({
        title: bulkMode ? 'Registros adicionados' : 'Registro adicionado',
        message: `${savedCount} ${labels[type]} foram adicionados com sucesso.`,
        tone: 'success',
      })
      if (onSaved) await onSaved()
      onClose()
    } catch (e) {
      const message = e.message || 'Não foi possível salvar o registro.'
      setError(message)
      showMessage({ title: 'Não foi possível salvar', message, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const currentType = recordTypes.find((item) => item.value === type) || recordTypes[0]
  const TitleIcon = currentType.icon
  const title = `Adicionar ${currentType.label.toLowerCase()}`

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Tipo de registro">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de registro">
            {recordTypes.map((item) => {
              const Icon = item.icon
              const selected = type === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setType(item.value)}
                  className={`min-h-[92px] text-left rounded-xl border px-3 py-3 transition ${selected ? 'border-cyan bg-cyan/10 ring-2 ring-cyan/10' : 'border-line bg-white/[.02] hover:border-line2 hover:bg-white/[.04]'}`}
                >
                  <Icon size={18} className={selected ? 'text-cyan' : 'text-muted'} />
                  <div className="text-sm font-semibold mt-2">{item.label}</div>
                  <div className="text-[10px] leading-4 text-dim mt-1">{item.description}</div>
                </button>
              )
            })}
          </div>
        </Field>

        <div className="flex items-center gap-2 rounded-xl border border-line bg-white/[.02] px-3 py-2.5">
          <TitleIcon size={16} className="text-cyan" />
          <div className="text-xs text-muted">Você está adicionando um registro de <b className="text-text">{currentType.label.toLowerCase()}</b>.</div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-line bg-white/[.02] px-3 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={bulkMode}
            onChange={(event) => toggleBulk(event.target.checked)}
            disabled={busy || loading}
            className="w-4 h-4 accent-cyan"
          />
          <span>
            <span className="block text-sm font-semibold">Adicionar para vários alunos</span>
            <span className="block text-[11px] text-dim mt-0.5">Selecione vários alunos de uma vez e, quando necessário, informe detalhes individuais.</span>
          </span>
        </label>

        {!bulkMode ? (
          <Field label="Aluno">
            <StudentSelect
              value={data.studentId}
              onChange={(value) => setData((current) => ({ ...current, studentId: value, attendanceId: '' }))}
              students={options}
              loading={loading}
              disabled={busy}
            />
            {type === 'attendance' && data.studentId && existingAttendanceStudents.has(String(data.studentId)) && (
              <div className="text-[11px] text-orange mt-1.5">Já existe um registro de falta para este aluno nesta data.</div>
            )}
          </Field>
        ) : (
          <Field label="Alunos">
            <div className="rounded-xl border border-line overflow-hidden">
              <div className="p-3 border-b border-line grid gap-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <div className="text-xs text-muted inline-flex items-center gap-1.5"><Users size={14} className="text-cyan" /> {selectedStudentIds.length} selecionado(s)</div>
                  <button type="button" onClick={toggleAllFiltered} disabled={availableForBulk.length === 0 || recordsLoading} className="text-xs font-semibold text-cyan hover:underline disabled:opacity-50">
                    {allFilteredSelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}
                  </button>
                </div>
                <div className="relative">
                  <Search size={15} aria-hidden="true" className="bulk-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none z-10" />
                  <input className={`${inputCls} bulk-student-search`} value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)} placeholder="Pesquisar aluno" />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                {filteredStudents.map((student) => {
                  const id = String(student.id)
                  const selected = selectedStudentIds.includes(id)
                  const disabled = type === 'attendance' && existingAttendanceStudents.has(id)
                  return (
                    <button key={id} type="button" onClick={() => toggleStudent(id)} disabled={disabled || busy} className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${selected ? 'bg-cyan/10 border border-cyan/25' : 'border border-transparent hover:bg-white/[.03]'} disabled:opacity-45`}>
                      <span className="min-w-0"><span className="block text-sm font-semibold truncate">{student.name}</span><span className="block text-[10px] text-dim">{disabled ? 'Já possui registro nesta data' : 'Aluno ativo'}</span></span>
                      <span className={`w-6 h-6 rounded-md border grid place-items-center shrink-0 ${selected ? 'bg-cyan text-slate-950 border-cyan' : 'border-line text-transparent'}`}><Check size={14} /></span>
                    </button>
                  )
                })}
                {!filteredStudents.length && <div className="py-8 text-center text-xs text-muted">Nenhum aluno encontrado.</div>}
              </div>
            </div>
          </Field>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Data">
            <input className={inputCls} type="date" value={data.date} onChange={(event) => set('date', event.target.value)} required />
          </Field>

          {type === 'attendance' && (
            <Field label="Quantidade de aulas" hint="Um dia completo corresponde a 9 aulas.">
              <input className={inputCls} type="number" min="1" max="9" value={data.quantity} onChange={(event) => set('quantity', event.target.value)} required />
            </Field>
          )}

          {type === 'occurrence' && (
            <Field label="Tipo">
              <select className={inputCls} value={data.occurrenceTypeId} onChange={(event) => set('occurrenceTypeId', event.target.value)} required>
                <option value="">Selecione</option>
                {types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
          )}

          {type === 'justification' && !bulkMode && (
            <Field label="Falta relacionada">
              <select className={inputCls} value={data.attendanceId} onChange={(event) => set('attendanceId', event.target.value)} required>
                <option value="">Selecione</option>
                {absenceOptions.map((absence) => <option key={absence.id} value={absence.id}>{formatDateBR(absence.date)} — {absence.quantity} aula(s)</option>)}
              </select>
            </Field>
          )}
        </div>

        {type === 'occurrence' && (
          <Field label="Gravidade">
            <select className={inputCls} value={data.severity} onChange={(event) => set('severity', event.target.value)}>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </Field>
        )}

        {type === 'justification' && (
          <Field label="Motivo">
            <input className={inputCls} value={data.reason} onChange={(event) => set('reason', event.target.value)} required placeholder="Ex.: Atestado médico" />
          </Field>
        )}

        {!bulkMode && type !== 'attendance' && (
          <Field label="Descrição">
            <textarea className={`${inputCls} h-24 py-2`} value={data.description} onChange={(event) => set('description', event.target.value)} required={type === 'occurrence'} placeholder={type === 'justification' ? 'Detalhes da justificativa…' : 'Descreva o registro…'} />
          </Field>
        )}

        {!bulkMode && type === 'attendance' && (
          <Field label="Observação">
            <textarea className={`${inputCls} h-20 py-2`} value={data.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Opcional" />
          </Field>
        )}

        {bulkMode && selectedStudentIds.length > 0 && (
          <Field label="Mensagem geral *" hint="Obrigatória. Esta mensagem será aplicada a todos os alunos selecionados. Você ainda pode acrescentar informações individuais abaixo.">
            <textarea
              className={`${inputCls} h-24 py-2`}
              value={data.generalMessage}
              onChange={(event) => set('generalMessage', event.target.value)}
              required
              maxLength={4000}
              placeholder={
                type === 'attendance'
                  ? 'Ex.: Alunos ausentes na atividade avaliativa de hoje.'
                  : type === 'occurrence'
                    ? 'Ex.: A ocorrência foi registrada durante a aula de hoje.'
                    : 'Ex.: Justificativa referente às ausências desta data.'
              }
            />
          </Field>
        )}

        {bulkMode && selectedStudentIds.length > 1 && (
          <Field label="Informações individuais (opcional)">
            <div className="rounded-xl border border-line p-3 space-y-3">
              <div className="text-[11px] text-dim">Você pode registrar um detalhe diferente para cada aluno. Deixar em branco é permitido.</div>
              {selectedStudents.map((student) => {
                const id = String(student.id)
                const detail = perStudent[id] || { detail: '', notes: '', attendanceId: '' }
                const absences = absenceByStudent[id] || []
                return (
                  <div key={id} className="rounded-lg border border-line/80 bg-white/[.02] p-3 grid gap-2.5">
                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold truncate">{student.name}</span><span className="text-[10px] text-dim">individual</span></div>
                    {type === 'justification' && (
                      <Field label="Falta relacionada">
                        <select className={inputCls} value={detail.attendanceId || ''} onChange={(event) => setStudentDetail(id, 'attendanceId', event.target.value)} required>
                          <option value="">Selecione a falta</option>
                          {absences.map((absence) => <option key={absence.id} value={absence.id}>{formatDateBR(absence.date)} — {absence.quantity} aula(s)</option>)}
                        </select>
                        {!absences.length && <div className="text-[11px] text-orange mt-1.5">Nenhuma falta em aberto encontrada para este aluno nesta data.</div>}
                      </Field>
                    )}
                    {type === 'occurrence' && (
                      <Field label="O que aconteceu com este aluno? (opcional)">
                        <textarea className={`${inputCls} h-20 py-2`} value={detail.detail || ''} onChange={(event) => setStudentDetail(id, 'detail', event.target.value)} placeholder="Ex.: desrespeitou a orientação, saiu da sala..." />
                      </Field>
                    )}
                    {type === 'attendance' && (
                      <Field label="Observação deste aluno (opcional)">
                        <textarea className={`${inputCls} h-20 py-2`} value={detail.notes || ''} onChange={(event) => setStudentDetail(id, 'notes', event.target.value)} placeholder="Opcional" />
                      </Field>
                    )}
                    {type === 'justification' && (
                      <Field label="Detalhes desta justificativa (opcional)">
                        <textarea className={`${inputCls} h-20 py-2`} value={detail.detail || ''} onChange={(event) => setStudentDetail(id, 'detail', event.target.value)} placeholder="Opcional" />
                      </Field>
                    )}
                  </div>
                )
              })}
            </div>
          </Field>
        )}

        {bulkMode && selectedStudentIds.length === 1 && type === 'justification' && (
          <Field label="Falta relacionada">
            <select className={inputCls} value={perStudent[selectedStudentIds[0]]?.attendanceId || ''} onChange={(event) => setStudentDetail(selectedStudentIds[0], 'attendanceId', event.target.value)} required>
              <option value="">Selecione a falta</option>
              {(absenceByStudent[selectedStudentIds[0]] || []).map((absence) => <option key={absence.id} value={absence.id}>{formatDateBR(absence.date)} — {absence.quantity} aula(s)</option>)}
            </select>
          </Field>
        )}

        {error && <div className="text-sm text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2" role="alert">{error}</div>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button className="w-full sm:w-auto" variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button
            className="w-full sm:w-auto"
            type="submit"
            disabled={busy || loading || recordsLoading || options.length === 0 || (!bulkMode && !data.studentId) || (bulkMode && !bulkReady) || (bulkMode && !data.generalMessage.trim()) || (!bulkMode && type === 'justification' && !data.attendanceId)}
          >
            {busy ? 'Salvando…' : bulkMode ? `Salvar ${selectedStudentIds.length || ''} registro(s)` : 'Salvar registro'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
