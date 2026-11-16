import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { Button, Field, inputCls, Modal } from '../ui/UI'
import StudentSelect from '../ui/StudentSelect'
import { formatDateBR } from '../../lib/date'

export default function EditRecord({ record, students = [], onClose, onSaved }) {
  const [type, setType] = useState(record?.entityType || '')
  const [data, setData] = useState(record || {})
  const [types, setTypes] = useState([])
  const [absenceOptions, setAbsenceOptions] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setType(record?.entityType || '')
    setData(record || {})
    setError('')
  }, [record])

  useEffect(() => {
    if (type !== 'OCCURRENCE') {
      setTypes([])
      return
    }
    api.occurrenceTypes()
      .then((rows) => setTypes(Array.isArray(rows) ? rows : []))
      .catch((e) => setError(e.message || 'Não foi possível carregar os tipos de ocorrência.'))
  }, [type])

  useEffect(() => {
    if (type !== 'JUSTIFICATION' || !data.studentId || !data.date) {
      setAbsenceOptions([])
      return
    }

    api.attendance({
      classId: data.classId,
      studentId: data.studentId,
      startDate: data.date,
      endDate: data.date,
      limit: 20,
    })
      .then((result) => {
        const rows = Array.isArray(result) ? result : (result?.data || [])
        setAbsenceOptions(rows.filter((row) => row.status === 'ABSENT' || String(row.id) === String(data.attendanceId)))
      })
      .catch(() => setAbsenceOptions([]))
  }, [type, data.studentId, data.date, data.classId, data.attendanceId])

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === String(data.studentId)),
    [students, data.studentId],
  )

  const set = (key, value) => setData((current) => ({ ...current, [key]: value }))

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      if (type === 'ATTENDANCE') {
        await api.updateAttendance(record.id, {
          studentId: Number(data.studentId),
          classId: Number(data.classId || selectedStudent?.classId),
          date: data.date,
          status: 'ABSENT',
          quantity: Number(data.quantity),
          notes: data.notes || null,
        })
      } else if (type === 'OCCURRENCE') {
        await api.updateOccurrence(record.id, {
          studentId: Number(data.studentId),
          classId: Number(data.classId || selectedStudent?.classId),
          date: data.date,
          occurrenceTypeId: Number(data.occurrenceTypeId),
          description: data.description,
          severity: data.severity,
        })
      } else if (type === 'JUSTIFICATION') {
        await api.updateJustification(record.id, {
          studentId: Number(data.studentId),
          date: data.date,
          attendanceId: Number(data.attendanceId),
          reason: data.reason,
          description: data.description || null,
        })
      }

      if (onSaved) await onSaved()
      else onClose()
    } catch (e) {
      setError(e.message || 'Não foi possível salvar as alterações.')
    } finally {
      setBusy(false)
    }
  }

  const title = type === 'ATTENDANCE'
    ? 'Editar falta'
    : type === 'OCCURRENCE'
      ? 'Editar ocorrência'
      : 'Editar justificativa'

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4">
        {type !== 'JUSTIFICATION' && (
          <Field label="Aluno">
            <StudentSelect
              value={String(data.studentId || '')}
              onChange={(value) => {
                const student = students.find((item) => String(item.id) === String(value))
                setData((current) => ({
                  ...current,
                  studentId: value,
                  classId: student?.classId || current.classId,
                }))
              }}
              students={students}
              disabled={busy}
            />
          </Field>
        )}

        {type === 'JUSTIFICATION' && (
          <>
            <Field label="Aluno">
              <StudentSelect
                value={String(data.studentId || '')}
                onChange={(value) => {
                  const student = students.find((item) => String(item.id) === String(value))
                  setData((current) => ({
                    ...current,
                    studentId: value,
                    classId: student?.classId || current.classId,
                    attendanceId: '',
                  }))
                }}
                students={students}
                disabled={busy}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Data">
                <input
                  className={inputCls}
                  type="date"
                  value={data.date || ''}
                  onChange={(event) => set('date', event.target.value)}
                  required
                />
              </Field>
              <Field label="Falta relacionada">
                <select
                  className={inputCls}
                  value={data.attendanceId || ''}
                  onChange={(event) => set('attendanceId', event.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {absenceOptions.map((absence) => (
                    <option key={absence.id} value={absence.id}>
                      {formatDateBR(absence.date)} — {absence.quantity} aula(s)
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Motivo">
              <input
                className={inputCls}
                value={data.reason || ''}
                onChange={(event) => set('reason', event.target.value)}
                required
              />
            </Field>
            <Field label="Descrição">
              <textarea
                className={`${inputCls} h-28 py-2`}
                value={data.description || ''}
                onChange={(event) => set('description', event.target.value)}
              />
            </Field>
          </>
        )}

        {type === 'ATTENDANCE' && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Data">
                <input
                  className={inputCls}
                  type="date"
                  value={data.date || ''}
                  onChange={(event) => set('date', event.target.value)}
                  required
                />
              </Field>
              <Field label="Quantidade de aulas" hint="De 1 a 9 aulas.">
                <input
                  className={inputCls}
                  type="number"
                  min="1"
                  max="9"
                  value={data.quantity ?? 1}
                  onChange={(event) => set('quantity', event.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Observação">
              <textarea
                className={`${inputCls} h-24 py-2`}
                value={data.notes || ''}
                onChange={(event) => set('notes', event.target.value)}
              />
            </Field>
          </>
        )}

        {type === 'OCCURRENCE' && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Data">
                <input
                  className={inputCls}
                  type="date"
                  value={data.date || ''}
                  onChange={(event) => set('date', event.target.value)}
                  required
                />
              </Field>
              <Field label="Tipo">
                <select
                  className={inputCls}
                  value={data.occurrenceTypeId || ''}
                  onChange={(event) => set('occurrenceTypeId', event.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {types.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Gravidade">
              <select
                className={inputCls}
                value={data.severity || 'LOW'}
                onChange={(event) => set('severity', event.target.value)}
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
              </select>
            </Field>

            <Field label="Descrição">
              <textarea
                className={`${inputCls} h-28 py-2`}
                value={data.description || ''}
                onChange={(event) => set('description', event.target.value)}
                required
              />
            </Field>

          </>
        )}

        {error && (
          <div className="text-sm text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2" role="alert">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button className="w-full sm:w-auto" variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button className="w-full sm:w-auto" type="submit" disabled={busy || !data.studentId}>
            {busy ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
