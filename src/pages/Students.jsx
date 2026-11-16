import React, { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Search, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button, Card, Empty, Skeleton, inputCls, PageError } from '../components/ui/UI'
import FlatIllustration from '../components/ui/Illustration'

export default function Students({ selectedClassId = '' }) {
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState({ data: [], pagination: { page: 1, pages: 1, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    api.classes().then((rows) => { setClasses(rows); const preferred = rows.find((row) => String(row.id) === String(selectedClassId)); setClassId(String(preferred?.id || rows[0]?.id || '')) }).catch((e) => setError(e.message))
  }, [selectedClassId])

  useEffect(() => {
    if (!classId) return
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      api.studentsPaged({ classId, q: query, search: query, page: result.pagination.page, limit: 20 })
        .then(setResult)
        .catch((e) => setError(e.message || 'Não foi possível carregar os alunos.'))
        .finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(timer)
  }, [classId, query, result.pagination.page])

  const goPage = (page) => setResult((current) => ({ ...current, pagination: { ...current.pagination, page } }))

  if (error && !result.data.length && !loading) return <PageError message={error} onRetry={() => window.location.reload()} />

  return (
    <div className="space-y-5">
      <header className="page-heading">
        <div><div className="eyebrow">Cadastros</div><h1 className="text-2xl md:text-3xl font-extrabold mt-1">Alunos</h1><p className="text-muted mt-2 max-w-2xl">Encontre um aluno e abra seu histórico de frequência e ocorrências.</p></div>
        <FlatIllustration type="students" className="page-heading-illustration hidden lg:block" label="Ilustração de três estudantes" />
      </header>

      <Card className="p-4">
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-3">
          <label className="field"><span className="field-label">Turma</span><select className={inputCls} value={classId} onChange={(e) => { setClassId(e.target.value); setResult((r) => ({ ...r, pagination: { ...r.pagination, page: 1 } })) }}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="field"><span className="field-label">Pesquisar</span><div className="input-with-icon"><Search size={18} aria-hidden="true" /><input className={inputCls} value={query} onChange={(e) => { setQuery(e.target.value); setResult((r) => ({ ...r, pagination: { ...r.pagination, page: 1 } })) }} placeholder="Digite o nome do aluno" aria-label="Pesquisar aluno" /></div></label>
        </div>
      </Card>

      {error && <div className="app-alert alert-error" role="alert">{error}</div>}
      {loading ? <Skeleton className="h-96" /> : (
        <Card className="p-4">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {result.data.map((student) => (
              <button key={student.id} type="button" onClick={() => nav(`/alunos/${student.id}`)} className="student-card">
                <div className="flex items-center justify-between gap-2"><div className="student-avatar"><UserRound size={18} aria-hidden="true" /></div><ArrowUpRight size={18} aria-hidden="true" className="text-blue" /></div>
                <div className="mt-4 font-extrabold leading-snug text-left">{student.name}</div>
                {student.registrationNumber && <div className="text-xs text-muted mt-1 text-left">{student.registrationNumber}</div>}
                <div className="student-metrics"><div><span>Faltas</span><strong>{student.absences ?? 0}</strong></div><div><span>Ocorrências</span><strong>{student.occurrences ?? 0}</strong></div></div>
                <div className="mt-3 text-[11px] text-muted text-left"><CalendarDays size={13} aria-hidden="true" className="inline mr-1" />Histórico individual</div>
              </button>
            ))}
            {result.data.length === 0 && <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4"><Empty title="Nenhum aluno encontrado" detail="Tente outro nome ou selecione uma turma diferente." /></div>}
          </div>
          <div className="pagination-bar">
            <span>{result.pagination.total || 0} aluno(s)</span>
            <div className="flex items-center gap-2"><Button variant="ghost" aria-label="Página anterior" disabled={result.pagination.page <= 1} onClick={() => goPage(result.pagination.page - 1)}><ChevronLeft size={16} /></Button><span>Página {result.pagination.page} de {Math.max(1, result.pagination.pages)}</span><Button variant="ghost" aria-label="Próxima página" disabled={result.pagination.page >= result.pagination.pages} onClick={() => goPage(result.pagination.page + 1)}><ChevronRight size={16} /></Button></div>
          </div>
        </Card>
      )}
    </div>
  )
}
