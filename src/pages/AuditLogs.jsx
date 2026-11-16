import React, { useCallback, useEffect, useState } from 'react'
import { ClipboardList, RefreshCw, ShieldCheck } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDateTimeBR } from '../lib/date'
import { Badge, Button, Card, PageError, Skeleton } from '../components/ui/UI'

const ACTION_LABELS = {
  CREATE: 'Criou', INSERT: 'Criou',
  UPDATE: 'Editou', EDIT: 'Editou',
  DELETE: 'Apagou', DELETE_BULK: 'Apagou',
  LOGIN: 'Entrou', LOGOUT: 'Saiu',
  PASSWORD_CHANGE: 'Alterou senha',
}

const ENTITY_LABELS = {
  AUTH: 'Autenticação',
  CLASS: 'Turma',
  STUDENT: 'Aluno',
  ATTENDANCE: 'Falta',
  JUSTIFICATION: 'Justificativa',
  OCCURRENCE: 'Ocorrência',
  SETTINGS: 'Configurações',
  OCCURRENCE_TYPE: 'Tipo de ocorrência',
}

function actionLabel(action) {
  const key = String(action || '').toUpperCase()
  if (ACTION_LABELS[key]) return ACTION_LABELS[key]
  if (key.includes('CREATE') || key.includes('INSERT')) return 'Criou'
  if (key.includes('UPDATE') || key.includes('EDIT')) return 'Editou'
  if (key.includes('DELETE') || key.includes('REMOVE')) return 'Apagou'
  return String(action || 'Registro')
}

function entityLabel(entity) {
  const key = String(entity || '').toUpperCase()
  return ENTITY_LABELS[key] || String(entity || '—')
}

function metadataText(value) {
  if (value == null || (typeof value === 'object' && Object.keys(value).length === 0)) return ''
  try { return typeof value === 'string' ? value : JSON.stringify(value) } catch { return String(value) }
}

export default function AuditLogs({ user }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await api.audit(200))
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (user?.role !== 'ADMIN') return <Navigate to="/selecionar-turma" replace />

  if (error && !rows.length && !loading) {
    return <PageError message={error} onRetry={load} />
  }

  return (
    <div className="space-y-5">
      <header className="page-heading">
        <div>
          <div className="eyebrow">Administração</div>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-1">Logs de alterações</h1>
          <p className="text-muted mt-2 max-w-2xl">Consulte quem criou, editou ou apagou registros, com e-mail, IP e horário da operação.</p>
        </div>
        <Button variant="ghost" className="w-full sm:w-auto" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </Button>
      </header>

      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3 pb-4 border-b border-line">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 grid place-items-center text-cyan shrink-0">
            <ShieldCheck size={19} />
          </div>
          <div>
            <div className="font-semibold">Auditoria administrativa</div>
            <div className="text-xs text-muted mt-1">Os dados de responsável e IP são preenchidos no banco a partir da sessão autenticada e do contexto da requisição.</div>
          </div>
        </div>

        {loading ? <Skeleton className="h-96 mt-4" /> : rows.length === 0 ? (
          <div className="page-state py-14">
            <ClipboardList size={28} className="text-cyan" />
            <div className="page-state-copy"><h2>Nenhum log encontrado</h2><p>As próximas alterações registradas aparecerão aqui.</p></div>
          </div>
        ) : (
          <div className="scroll-x-safe mt-4">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="text-[11px] text-dim border-b border-line">
                <tr>
                  <th className="py-2 px-2">Data</th>
                  <th className="py-2 px-2">Ação</th>
                  <th className="py-2 px-2">Item</th>
                  <th className="py-2 px-2">Responsável</th>
                  <th className="py-2 px-2">E-mail</th>
                  <th className="py-2 px-2">IP</th>
                  <th className="py-2 px-2">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const details = metadataText(row.metadata)
                  return (
                    <tr key={row.id} className="border-b border-line/70 text-xs align-top">
                      <td className="py-3 px-2 whitespace-nowrap">{formatDateTimeBR(row.created_at)}</td>
                      <td className="py-3 px-2"><Badge tone={actionLabel(row.action) === 'Apagou' ? 'pink' : actionLabel(row.action) === 'Editou' ? 'orange' : 'cyan'}>{actionLabel(row.action)}</Badge></td>
                      <td className="py-3 px-2"><div className="font-semibold">{entityLabel(row.entity_type)}</div><div className="text-[10px] text-dim mt-1">ID: {row.entity_id ?? '—'}</div></td>
                      <td className="py-3 px-2 font-semibold">{row.actor_name || '—'}</td>
                      <td className="py-3 px-2 text-muted">{row.actor_email || '—'}</td>
                      <td className="py-3 px-2 font-mono text-[11px] text-muted">{row.ip_address || '—'}</td>
                      <td className="py-3 px-2 max-w-[280px] text-muted break-words">{details || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {error && <div className="app-alert alert-error mt-4" role="alert">{error}</div>}
      </Card>
    </div>
  )
}
