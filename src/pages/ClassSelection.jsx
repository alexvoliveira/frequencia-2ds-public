import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap, Layers3, LoaderCircle, School, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import SchoolLogo from '../components/ui/SchoolLogo'
import { Button } from '../components/ui/UI'

const LEVELS = {
  FUNDAMENTAL: { title: 'Ensino Fundamental', description: 'Acesse as turmas do Ensino Fundamental disponíveis para sua conta.', icon: BookOpen },
  MEDIO: { title: 'Ensino Médio', description: 'Escolha primeiro a modalidade para visualizar as turmas correspondentes.', icon: GraduationCap },
}
const MODALITIES = {
  INTEGRAL: { title: 'Ensino Médio Integral', description: 'Turmas do Ensino Médio Integral.', icon: School },
  TECNICO: { title: 'Ensino Médio Técnico', description: 'Turmas do Ensino Médio Técnico.', icon: Wrench },
}

function ChoiceCard({ icon: Icon, title, description, count, disabled, onClick }) {
  return <button type="button" className="class-selection-choice" onClick={onClick} disabled={disabled}>
    <span className="class-selection-choice-icon"><Icon size={24} /></span>
    <span className="class-selection-choice-copy"><strong>{title}</strong><small>{description}</small><em>{count === 1 ? '1 turma disponível' : `${count} turmas disponíveis`}</em></span>
    <ArrowRight size={19} aria-hidden="true" />
  </button>
}

export default function ClassSelection({ user, onSelectClass }) {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [level, setLevel] = useState(null)
  const [modality, setModality] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.classes().then((rows) => { if (active) setClasses(rows) }).catch((err) => { if (active) setError(err.message || 'Não foi possível carregar as turmas.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const authorizedClasses = useMemo(
    () => classes.filter((item) => item?.active !== false && (item.educationLevel === 'FUNDAMENTAL' || item.educationLevel === 'MEDIO')),
    [classes],
  )
  const fundamental = useMemo(() => authorizedClasses.filter((item) => item.educationLevel === 'FUNDAMENTAL'), [authorizedClasses])
  const medio = useMemo(() => authorizedClasses.filter((item) => item.educationLevel === 'MEDIO'), [authorizedClasses])
  const byModality = (value) => medio.filter((item) => item.educationModality === value)
  const visibleClasses = level === 'FUNDAMENTAL'
    ? fundamental
    : modality
      ? byModality(modality)
      : []

  function back() {
    if (modality) setModality(null)
    else if (level) setLevel(null)
  }

  return <main className="class-selection-shell">
    <section className="class-selection-panel" aria-labelledby="class-selection-title">
      <header className="class-selection-header">
        <div className="class-selection-brand"><SchoolLogo size="sm" alt="" className="class-selection-logo" /><div><strong>Unidade Polo</strong><span>Frequência escolar</span></div></div>
        <div className="class-selection-user"><span>Olá, {user?.name || 'usuário'}</span><small>{user?.role === 'ADMIN' ? 'Direção' : 'Acesso às turmas disponíveis'}</small></div>
      </header>
      <div className="class-selection-content">
        {loading ? <div className="class-selection-state"><LoaderCircle className="animate-spin" size={26} /><span>Carregando suas turmas…</span></div> : error ? <div className="class-selection-state class-selection-state-error" role="alert"><span>{error}</span><Button onClick={() => window.location.reload()}>Tentar novamente</Button></div> : !authorizedClasses.length ? <div className="class-selection-state"><Layers3 size={28} /><strong>Nenhuma turma vinculada</strong><span>Sua conta ainda não possui uma turma liberada para acesso.</span></div> : <>
          <div className="class-selection-intro">{(level || modality) && <button type="button" className="class-selection-back page-back-button" onClick={back}><ArrowLeft size={17} /> Voltar</button>}<span className="class-selection-kicker">Seleção de turma</span><h1 id="class-selection-title">Qual etapa de ensino você deseja acessar?</h1><p>Selecione a etapa e, no Ensino Médio, a modalidade. Depois escolha a turma que deseja acessar.</p></div>
          {!level && <div className="class-selection-grid">{Object.entries(LEVELS).map(([key, item]) => { const Icon = item.icon; const count = key === 'FUNDAMENTAL' ? fundamental.length : medio.length; const disabled = count === 0; return <ChoiceCard key={key} icon={Icon} title={item.title} description={item.description} count={count} disabled={disabled} onClick={() => { if (disabled) return; setLevel(key); setModality(null) }} /> })}</div>}
          {level === 'MEDIO' && !modality && <div className="class-selection-grid">{Object.entries(MODALITIES).map(([key, item]) => { const Icon = item.icon; const count = byModality(key).length; const disabled = count === 0; return <ChoiceCard key={key} icon={Icon} title={item.title} description={item.description} count={count} disabled={disabled} onClick={() => { if (!disabled) setModality(key) }} /> })}</div>}
          {(level === 'FUNDAMENTAL' || modality) && <section className="class-selection-list" aria-labelledby="class-list-title"><div className="class-selection-list-heading"><div><span className="class-selection-kicker">Turmas disponíveis</span><h2 id="class-list-title">{level === 'FUNDAMENTAL' ? 'Ensino Fundamental' : MODALITIES[modality].title}</h2></div><span>{visibleClasses.length} {visibleClasses.length === 1 ? 'turma' : 'turmas'}</span></div>{visibleClasses.length ? <div className="class-selection-classes">{visibleClasses.map((item) => <button key={item.id} type="button" className="class-selection-class" onClick={() => { onSelectClass?.(String(item.id)); navigate(`/dashboard/classes/${item.id}`) }}><span className="class-selection-class-icon"><GraduationCap size={20} /></span><span className="class-selection-class-copy"><strong>{item.name}</strong><small>{item.educationLevel === 'FUNDAMENTAL' ? 'Ensino Fundamental' : item.educationModality === 'INTEGRAL' ? 'Ensino Médio Integral' : 'Ensino Médio Técnico'}</small></span><ArrowRight size={18} /></button>)}</div> : <div className="class-selection-empty">Nenhuma turma cadastrada nesta categoria.</div>}</section>}
        </>}
      </div>
    </section>
  </main>
}
