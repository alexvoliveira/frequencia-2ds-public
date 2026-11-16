import React, { useEffect, useMemo, useState } from 'react'
import { Accessibility, BarChart3, Check, ChevronDown, CirclePlus, Home, Menu, Moon, PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon, Sun, Users, LogOut, ClipboardList, ClipboardCheck, MessageSquare } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import SchoolLogo from '../ui/SchoolLogo'
import AddRecord from '../modals/AddRecord'

const roleLabels = { ADMIN: 'Administração', TEACHER: 'Professor(a)', STAFF: 'Equipe escolar', VIEWER: 'Consulta' }

export default function Layout({ children, user, onLogout, theme = 'light', onToggleTheme, themeBusy = false, accessibilityMode = 'normal', onAccessibilityChange, selectedClassId = '', onSelectClass }) {
  const [mobileOpen, setMobileOpen] = useState(false); const [compact, setCompact] = useState(false); const [addOpen, setAddOpen] = useState(false); const [classOpen, setClassOpen] = useState(false); const [accessibilityOpen, setAccessibilityOpen] = useState(false); const [classes, setClasses] = useState([]); const [recordModal, setRecordModal] = useState(null)
  const location = useLocation(); const nav = useNavigate(); const { id } = useParams(); const isClassDashboard = location.pathname.startsWith('/dashboard/classes/')
  useEffect(() => { api.classes().then(setClasses).catch(() => setClasses([])) }, [])
  useEffect(() => { if (!mobileOpen) { setAddOpen(false); setClassOpen(false); setAccessibilityOpen(false) } }, [mobileOpen])
  const activeClass = useMemo(() => { const routeClass = isClassDashboard ? classes.find((item) => String(item.id) === String(id)) : null; return routeClass || classes.find((item) => String(item.id) === String(selectedClassId)) || classes[0] }, [classes, id, isClassDashboard, selectedClassId])
  useEffect(() => { const handler = (event) => { const type = event.detail; if (!['attendance', 'occurrence', 'justification'].includes(type)) return; if (!activeClass?.id) return; setAddOpen(false); setRecordModal(type) }; window.addEventListener('open-add', handler); return () => window.removeEventListener('open-add', handler) }, [activeClass?.id])

  const items = [
    ['/dashboard/classes/' + (activeClass?.id || id || ''), 'Início', Home],
    ['/alunos', 'Alunos', Users],
    ['/relatorios', 'Relatórios', BarChart3],
    ...(user?.role === 'ADMIN' || user?.role === 'TEACHER' ? [['/ocorrencias', 'Ocorrências', ClipboardCheck]] : []),
    ...(user?.role === 'ADMIN' || user?.role === 'TEACHER' ? [['/feedback', 'Feedback', MessageSquare]] : []),
    ['/configuracoes', 'Configurações', SettingsIcon],
    ...(user?.role === 'ADMIN' ? [['/logs', 'Logs', ClipboardList]] : []),
  ]
  const openAdd = (type) => { if (!activeClass?.id) return; setAddOpen(false); setMobileOpen(false); setRecordModal(type) }

  return <div className="app-root">
    <a href="#main-content" className="skip-link">Pular para o conteúdo principal</a>
    <div className={`mobile-backdrop ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />
    <aside className={`app-sidebar ${compact ? 'compact' : ''} ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Navegação principal">
      <div className="sidebar-brand"><SchoolLogo size="sm" alt="" className="sidebar-logo" /><div className="brand-copy"><strong>Unidade Polo</strong><span>Frequência escolar</span></div></div>
      <div className="sidebar-section"><span className="sidebar-label">Turma atual</span><div className="relative"><button type="button" className="class-switcher" onClick={() => setClassOpen((v) => !v)} aria-expanded={classOpen} aria-haspopup="menu"><span className="class-avatar"><Users size={19} /></span><span className="class-name">{activeClass?.name || 'Selecione uma turma'}</span><ChevronDown className="class-switcher-chevron" size={17} aria-hidden="true" /></button>{classOpen && <div className="class-menu" role="menu">{(() => { const scoped = user?.role === 'TEACHER' ? classes : (activeClass?.educationLevel ? classes.filter((item) => item.educationLevel === activeClass.educationLevel) : classes); return scoped.length ? scoped.map((item) => <button key={item.id} type="button" role="menuitem" onClick={() => { onSelectClass?.(String(item.id)); nav(`/dashboard/classes/${item.id}`); setClassOpen(false); setMobileOpen(false) }} className="menu-item">{item.name}{String(item.id) === String(activeClass?.id) ? ' · atual' : ''}</button>) : <div className="menu-empty">Nenhuma turma disponível.</div> })()}<div className="class-menu-divider" role="separator" /><button type="button" role="menuitem" className="menu-item menu-item-secondary" onClick={() => { onSelectClass?.(''); setClassOpen(false); setMobileOpen(false); nav('/selecionar-turma') }}><LogOut size={16} aria-hidden="true" /><span>Sair da turma / trocar etapa</span></button></div>}</div></div>
      {user?.role !== 'VIEWER' && <div className="sidebar-section"><span className="sidebar-label">Ações rápidas</span><div className="quick-add-wrap relative"><button type="button" className="quick-add" onClick={() => setAddOpen((v) => !v)} aria-expanded={addOpen} aria-haspopup="menu"><CirclePlus size={20} /><span>Adicionar registro</span></button>{addOpen && <div className="class-menu action-menu" role="menu"><button className="menu-item" role="menuitem" onClick={() => openAdd('attendance')}>Registrar falta</button><button className="menu-item" role="menuitem" onClick={() => openAdd('occurrence')}>Registrar ocorrência</button><button className="menu-item" role="menuitem" onClick={() => openAdd('justification')}>Justificar falta</button></div>}</div></div>}
      <nav className="sidebar-nav" aria-label="Seções">{items.map(([href, label, Icon]) => { const active = location.pathname.startsWith(href) && href !== '/dashboard/classes/'; return <button key={label} type="button" onClick={() => { if (activeClass?.id) onSelectClass?.(String(activeClass.id)); nav(href); setMobileOpen(false) }} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{label}</span></button> })}</nav>
      <div className="sidebar-footer">
        <div className="user-card"><div className="user-avatar" aria-hidden="true">{String(user?.name || 'U').trim().charAt(0).toUpperCase()}</div><div className="user-copy min-w-0"><strong>{user?.name || 'Usuário'}</strong><span>{roleLabels[user?.role] || 'Acesso autorizado'}</span></div><button type="button" className="logout-button" onClick={onLogout}>Sair</button></div>
        <div className="relative"><button type="button" className="sidebar-accessibility" onClick={() => setAccessibilityOpen((value) => !value)} aria-expanded={accessibilityOpen} aria-haspopup="dialog" title="Acessibilidade visual"><Accessibility size={17} aria-hidden="true" /><span>Acessibilidade</span></button>{accessibilityOpen && <div className="accessibility-menu" role="dialog" aria-label="Acessibilidade visual"><div className="accessibility-menu-title">Acessibilidade visual</div><div className="accessibility-menu-help">Escolha uma paleta mais confortável.</div>{[['normal','Cores padrão'],['soft','Cores suaves'],['deuteranopia','Deuteranopia'],['protanopia','Protanopia'],['tritanopia','Tritanopia']].map(([mode,label]) => <button key={mode} type="button" className={`accessibility-option ${accessibilityMode === mode ? 'is-active' : ''}`} onClick={() => { onAccessibilityChange?.(mode); setAccessibilityOpen(false) }} aria-pressed={accessibilityMode === mode}><span>{label}</span>{accessibilityMode === mode && <Check size={15} aria-hidden="true" />}</button>)}<div className="accessibility-menu-note">Fica salva no navegador.</div></div>}</div>
        <button type="button" className="sidebar-theme" onClick={onToggleTheme} disabled={themeBusy} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>{theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}<span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span></button>
        <button type="button" className="sidebar-collapse" onClick={() => setCompact((v) => !v)} aria-label={compact ? 'Expandir menu lateral' : 'Recolher menu lateral'}>{compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}<span>{compact ? 'Expandir' : 'Recolher menu'}</span></button>
      </div>
    </aside>
    {recordModal && activeClass?.id && <AddRecord type={recordModal} classId={String(activeClass.id)} onClose={() => setRecordModal(null)} onSaved={async () => { setRecordModal(null); window.dispatchEvent(new CustomEvent('school-data-changed')) }} />}
    <main id="main-content" className="app-main"><header className="mobile-header"><button type="button" className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu principal"><Menu size={22} /></button><div className="mobile-title"><strong>{activeClass?.name || 'Unidade Polo'}</strong><span>Frequência escolar</span></div><SchoolLogo size="sm" alt="" className="mobile-brand-logo" /></header><div className="content-frame">{children}</div></main>
  </div>
}
