import React, { useEffect, useState } from 'react'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  School,
  Trophy,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'

function formatNumber(value) {
  const number = Number(value)
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(
    Number.isFinite(number) ? number : 0,
  )
}

function formatPercent(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + '%'
}

function formatDate(value) {
  if (!value) return '—'
  const parts = String(value).slice(0, 10).split('-')
  return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : String(value)
}

function ProgressBar({ label, value, tone }) {
  const numericValue = Number(value)
  const percent = Math.max(0, Math.min(100, Number.isFinite(numericValue) ? numericValue : 0))

  return (
    <div
      className="ap-meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div
        className={'ap-meter__fill ap-meter__fill--' + tone}
        style={{ width: percent + '%' }}
      />
    </div>
  )
}

function MetricCard({ label, value, description, icon: Icon, tone }) {
  return (
    <article className="ap-card ap-metric-card">
      <div className={'ap-icon ap-icon--' + tone} aria-hidden="true">
        <Icon size={21} strokeWidth={2} />
      </div>
      <div className="ap-metric-content">
        <p className="ap-metric-label">{label}</p>
        <p className="ap-metric-value">{value}</p>
        <p className="ap-muted ap-metric-description">{description}</p>
      </div>
    </article>
  )
}

function LevelCard({ level }) {
  const fundamental = level.key === 'FUNDAMENTAL'
  const stage = fundamental ? 'fundamental' : 'medio'
  const label = fundamental ? 'Ensino Fundamental' : 'Ensino Médio'

  return (
    <article className={'ap-card ap-level-card ap-level-card--' + stage}>
      <div className="ap-level-heading">
        <div>
          <div className="ap-level-title-row">
            <span className={'ap-level-mark ap-level-mark--' + stage} aria-hidden="true">
              <GraduationCap size={19} />
            </span>
            <h3 className="ap-level-title">{label}</h3>
          </div>
          <p className="ap-muted ap-level-subtitle">Percentual de aulas perdidas</p>
        </div>
        <p className="ap-level-percent">{formatPercent(level.absencePercent)}</p>
      </div>

      <ProgressBar
        label={'Percentual de faltas no ' + label}
        value={level.absencePercent}
        tone={stage}
      />

      <div className="ap-level-stats">
        <div>
          <span>Faltas registradas</span>
          <strong>{formatNumber(level.absences)}</strong>
        </div>
        <div>
          <span>Presenças estimadas</span>
          <strong>{formatNumber(level.estimatedPresences)}</strong>
        </div>
        <div>
          <span>Aulas previstas</span>
          <strong>{formatNumber(level.expectedLessons)}</strong>
        </div>
      </div>
    </article>
  )
}

function ClassRanking({ title, description, items, metric }) {
  const absences = metric === 'absences'
  const Icon = absences ? CalendarDays : CheckCircle2

  return (
    <section className="ap-card ap-ranking-card" aria-label={title}>
      <header className="ap-ranking-header">
        <div className={'ap-icon ap-icon--' + (absences ? 'coral' : 'green')} aria-hidden="true">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="ap-section-title">{title}</h2>
          <p className="ap-muted ap-section-description">{description}</p>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="ap-empty-state">
          {absences
            ? 'Nenhuma falta foi registrada no período.'
            : 'Não há turmas com aulas previstas para calcular as presenças.'}
        </p>
      ) : (
        <ol className="ap-rank-list">
          {items.map((item, index) => {
            const fundamental = item.educationLevel === 'FUNDAMENTAL'
            const stage = fundamental ? 'fundamental' : 'medio'
            const stageLabel = fundamental ? 'Fundamental' : 'Médio'
            const value = Number(absences ? item.absences : item.estimatedPresences) || 0
            const rate = Number(absences ? item.absencePercent : item.attendancePercent) || 0

            return (
              <li className="ap-rank-item" key={item.name + '-' + index}>
                <span className="ap-rank-number" aria-label={'Posição ' + (index + 1)}>
                  {index + 1}
                </span>

                <div className="ap-rank-main">
                  <div className="ap-rank-heading">
                    <h3 className="ap-rank-class-name" title={item.name}>{item.name}</h3>
                    <span className={'ap-stage-chip ap-stage-chip--' + stage}>{stageLabel}</span>
                  </div>
                  <p className="ap-muted ap-rank-students">
                    {formatNumber(item.activeStudents)} alunos ativos
                  </p>
                  <ProgressBar
                    label={(absences ? 'Taxa de faltas de ' : 'Frequência estimada de ') + item.name}
                    value={rate}
                    tone={absences ? 'absence' : 'presence'}
                  />
                  <p className="ap-rank-rate">
                    {absences ? 'Taxa de faltas: ' : 'Frequência estimada: '}
                    <strong>{formatPercent(rate)}</strong>
                  </p>
                </div>

                <div className="ap-rank-value">
                  <strong>{formatNumber(value)}</strong>
                  <span>{absences ? 'faltas' : 'presenças estimadas'}</span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function Loading() {
  return (
    <main className="attendance-public min-h-screen" aria-busy="true" aria-label="Carregando painel de frequência">
      <div className="attendance-public__inner">
        <div className="ap-skeleton ap-skeleton--header" />
        <div className="ap-skeleton ap-skeleton--title" />
        <div className="ap-skeleton-grid ap-skeleton-grid--four">
          {[1, 2, 3, 4].map((item) => <div className="ap-skeleton ap-skeleton--metric" key={item} />)}
        </div>
        <div className="ap-skeleton-grid ap-skeleton-grid--two">
          {[1, 2].map((item) => <div className="ap-skeleton ap-skeleton--panel" key={item} />)}
        </div>
      </div>
    </main>
  )
}

function EmptyDashboard({ title, message, onRetry }) {
  return (
    <main className="attendance-public min-h-screen">
      <div className="attendance-public__inner ap-empty-page">
        <div className="ap-card ap-empty-panel" role="status">
          <div className="ap-icon ap-icon--blue" aria-hidden="true"><School size={23} /></div>
          <h1 className="ap-section-title">{title}</h1>
          <p className="ap-muted">{message}</p>
          <button type="button" className="ap-button" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    </main>
  )
}

export default function PublicAttendanceDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)

    api.publicAttendanceDashboard()
      .then((result) => {
        if (active) setData(result)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [reloadKey])

  if (loading && !data) return <Loading />

  if (!data) {
    return (
      <EmptyDashboard
        title="Painel indisponível"
        message="Não foi possível carregar os indicadores agora. Tente novamente."
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  const hasMetrics = data.summary && Array.isArray(data.classes) && Array.isArray(data.levels)

  if (!hasMetrics) {
    if (loading) return <Loading />
    return (
      <EmptyDashboard
        title="Painel em atualização"
        message="Os indicadores ainda estão sendo atualizados. Tente novamente em instantes."
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  const summary = data.summary
  const classes = data.classes
  const absenceClasses = classes
    .filter((item) => Number(item.absences) > 0)
    .sort((a, b) => (Number(b.absences) - Number(a.absences)) || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 6)
  const presenceClasses = classes
    .filter((item) => Number(item.expectedLessons) > 0)
    .sort((a, b) => (
      (Number(b.estimatedPresences) - Number(a.estimatedPresences))
      || (Number(b.attendancePercent) - Number(a.attendancePercent))
      || a.name.localeCompare(b.name, 'pt-BR')
    ))
    .slice(0, 6)
  const year = data.period?.year || new Date().getFullYear()
  const dateLabel = formatDate(data.period?.endDate)

  return (
    <main className="attendance-public min-h-screen" aria-busy={loading}>
      <div className="attendance-public__inner">
        <header className="ap-header">
          <div className="ap-brand">
            <img
              className="ap-logo"
              src="/ceup-logo.svg"
              alt="Logo do Colégio Estadual Unidade Polo"
              width="54"
              height="54"
            />
            <div>
              <p className="ap-kicker">Painel público</p>
              <p className="ap-school-name">Colégio Estadual Unidade Polo</p>
            </div>
          </div>

          <div className="ap-header-actions">
            <div className="ap-period">
              <span className="ap-period-label">Ano letivo</span>
              <strong>{year}</strong>
              <span className="ap-period-date">Dados até {dateLabel}</span>
            </div>
            <button
              type="button"
              className="ap-button"
              onClick={() => setReloadKey((value) => value + 1)}
              disabled={loading}
              aria-label={loading ? 'Atualizando indicadores' : 'Atualizar indicadores'}
            >
              <RefreshCw size={16} className={loading ? 'ap-spin' : ''} aria-hidden="true" />
              <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>
        </header>

        <section className="ap-page-intro" aria-labelledby="attendance-title">
          <p className="ap-kicker">Visão geral</p>
          <h1 id="attendance-title" className="ap-page-title">Frequência escolar</h1>
          <p className="ap-page-description">
            Acompanhe as faltas e a frequência estimada das turmas do Ensino Fundamental e do Ensino Médio.
          </p>
        </section>

        {error && (
          <p className="ap-update-warning" role="status">
            Não foi possível atualizar os dados. Exibindo os últimos indicadores carregados.
          </p>
        )}

        <section className="ap-metric-grid" aria-label="Resumo geral do ano letivo">
          <MetricCard
            label="Faltas registradas"
            value={formatNumber(summary.absences)}
            description="Aulas não frequentadas no período"
            icon={CalendarDays}
            tone="coral"
          />
          <MetricCard
            label="Taxa média de faltas"
            value={formatPercent(summary.absencePercent)}
            description="Ponderada pelas aulas previstas"
            icon={Activity}
            tone="blue"
          />
          <MetricCard
            label="Frequência estimada"
            value={formatPercent(summary.attendancePercent)}
            description="Estimativa de aulas frequentadas"
            icon={CheckCircle2}
            tone="green"
          />
          <MetricCard
            label="Turmas ativas"
            value={formatNumber(summary.activeClasses)}
            description={formatNumber(summary.activeStudents) + ' alunos ativos'}
            icon={Users}
            tone="purple"
          />
        </section>

        <section className="ap-content-section" aria-labelledby="levels-title">
          <div className="ap-section-heading">
            <div>
              <p className="ap-kicker">Comparativo</p>
              <h2 id="levels-title" className="ap-section-title">Faltas por etapa de ensino</h2>
            </div>
            <p className="ap-muted ap-section-aside">Percentual sobre as aulas previstas</p>
          </div>
          <div className="ap-level-grid">
            {data.levels.map((level) => <LevelCard key={level.key} level={level} />)}
          </div>
        </section>

        <section className="ap-content-section" aria-label="Rankings de frequência por turma">
          <div className="ap-section-heading">
            <div>
              <p className="ap-kicker">Destaques do ano</p>
              <h2 className="ap-section-title">Comparativo entre turmas</h2>
            </div>
            <div className="ap-ranking-legend">
              <span><i className="ap-legend-dot ap-legend-dot--absence" />Faltas</span>
              <span><i className="ap-legend-dot ap-legend-dot--presence" />Presenças estimadas</span>
            </div>
          </div>
          <div className="ap-ranking-grid">
            <ClassRanking
              title="Turmas com mais faltas"
              description="Maior volume de aulas não frequentadas"
              items={absenceClasses}
              metric="absences"
            />
            <ClassRanking
              title="Turmas com mais presenças"
              description="Maior volume estimado de aulas frequentadas"
              items={presenceClasses}
              metric="presences"
            />
          </div>
        </section>

        <footer className="ap-footer-note">
          <Trophy size={16} aria-hidden="true" />
          <p>
            Os percentuais e as presenças são estimativas calculadas com base nas aulas previstas configuradas e nas faltas registradas.
            O indicador não desconta feriados e recessos por data.
          </p>
        </footer>
      </div>
    </main>
  )
}
