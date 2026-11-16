import React, { useState } from 'react'
import { ArrowRight, BarChart3, ClipboardCheck, Eye, EyeOff, FileText, LockKeyhole, Mail, ShieldCheck, Users } from 'lucide-react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { Button, inputCls } from '../components/ui/UI'
import FlatIllustration from '../components/ui/Illustration'
import SchoolLogo from '../components/ui/SchoolLogo'

const features = [
  { icon: ClipboardCheck, title: 'Acompanhamento', detail: 'Registre e acompanhe a frequência dos alunos.' },
  { icon: Users, title: 'Gestão de alunos', detail: 'Consulte os alunos e o histórico da turma.' },
  { icon: FileText, title: 'Relatórios', detail: 'Visualize informações importantes em poucos cliques.' },
  { icon: BarChart3, title: 'Visão da turma', detail: 'Entenda os principais indicadores de forma clara.' },
]

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const normalizedEmail = String(email).trim().toLowerCase()
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (authError || !data.session || !data.user) throw authError || new Error('Credenciais inválidas.')

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      const response = await api.me()
      const nextUser = { ...(response.user || response), theme: response.theme }
      onLogin(nextUser)
    } catch (err) {
      const message = String(err?.message || '').toLowerCase()
      if (message.includes('invalid login credentials')) setError('E-mail ou senha inválidos.')
      else if (message.includes('42501') || message.includes('permission') || message.includes('not authorized')) setError('Sua conta não está autorizada a acessar o sistema.')
      else setError(err.message || 'Não foi possível entrar. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-labelledby="login-title">
        <div className="login-brand">
          <SchoolLogo size="lg" alt="Logotipo do Colégio Estadual Unidade Polo" className="login-brand-logo" />
          <div>
            <p className="login-school-name">Colégio Estadual</p>
            <p className="login-school-name login-school-name-secondary">Unidade Polo</p>
          </div>
        </div>

        <div className="login-hero-copy">
          <div className="eyebrow">Sistema de acompanhamento escolar</div>
          <h1 id="login-title">Frequência escolar feita para pessoas.</h1>
          <p>Uma experiência simples para acompanhar presença, faltas, justificativas e ocorrências da turma.</p>
        </div>

        <div className="login-feature-grid" aria-label="Recursos do sistema">
          {features.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="login-feature">
              <span className="login-feature-icon" aria-hidden="true"><Icon size={19} /></span>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
            </div>
          ))}
        </div>

        <div className="login-illustration-wrap">
          <FlatIllustration type="login" className="login-illustration" label="Ilustração vetorial representando o acesso ao sistema escolar" />
        </div>
      </section>

      <section className="login-form-area" aria-label="Área de acesso">
        <div className="access-card">
          <div className="access-card-heading">
            <span className="access-kicker">Acesso ao sistema</span>
            <h2>Entrar</h2>
            <p>Informe seus dados para continuar.</p>
          </div>

          <form onSubmit={submit} className="login-form">
            <label className="field">
              <span className="field-label">E-mail</span>
              <div className="input-with-icon">
                <Mail size={18} aria-hidden="true" />
                <input className={inputCls} type="email" required autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu-email@escola" />
              </div>
            </label>

            <label className="field">
              <span className="field-label">Senha</span>
              <div className="input-with-icon input-with-action">
                <LockKeyhole size={18} aria-hidden="true" />
                <input className={inputCls} type={showPassword ? 'text' : 'password'} required autoComplete="current-password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" />
                <button type="button" className="input-action" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </label>

            {error && <div className="app-alert alert-error" role="alert"><ShieldCheck size={18} aria-hidden="true" /><span>{error}</span></div>}

            <Button className="login-submit" disabled={busy} type="submit">
              {busy ? 'Verificando…' : <>Entrar <ArrowRight size={17} /></>}
            </Button>
          </form>

          <div className="login-help">
            <ShieldCheck size={17} aria-hidden="true" />
            <div>
              <strong>Ambiente interno da escola</strong>
              <span>O acesso é destinado a usuários autorizados.</span>
            </div>
          </div>

          <p className="login-support">Problemas para entrar? Procure a equipe responsável pelo sistema na escola.</p>
        </div>
      </section>
    </main>
  )
}
