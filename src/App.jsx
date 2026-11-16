import React, { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api } from './lib/api'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import StudentDetails from './pages/StudentDetails'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import OccurrenceCases from './pages/OccurrenceCases'
import TeacherFeedback from './pages/TeacherFeedback'
import Login from './pages/Login'
import ClassSelection from './pages/ClassSelection'
import AuditLogs from './pages/AuditLogs'
import PublicAttendanceDashboard from './pages/PublicAttendanceDashboard'
import { FullPageLoading, MessageHost } from './components/ui/UI'
import './styles/index.css'

function normalizeTheme(theme) { return theme === 'dark' ? 'dark' : 'light' }
function applyTheme(theme) { document.documentElement.dataset.theme = theme; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#090d14' : '#eef4f9') }
const ACCESSIBILITY_MODES = new Set(['normal', 'soft', 'deuteranopia', 'protanopia', 'tritanopia'])
function normalizeAccessibilityMode(mode) { return ACCESSIBILITY_MODES.has(mode) ? mode : 'normal' }
function accessibilityStorageKey(userId) { return userId ? `school-accessibility-${userId}` : 'school-accessibility-default' }
function readAccessibilityMode(userId) { try { return normalizeAccessibilityMode(localStorage.getItem(accessibilityStorageKey(userId))) } catch { return 'normal' } }
function persistAccessibilityMode(userId, mode) { try { localStorage.setItem(accessibilityStorageKey(userId), mode) } catch {} }
function Protected({ user, children }) { return user ? children : <Navigate to="/login" replace /> }
function Home({ user }) { return user ? <Navigate to="/selecionar-turma" replace /> : <Navigate to="/login" replace /> }
function Shell({ user, setUser, theme, onToggleTheme, themeBusy, accessibilityMode, onAccessibilityChange, selectedClassId, onSelectClass, children }) {
  const navigate = useNavigate()
  const handleLogout = async () => { await api.logout().catch(() => {}); setUser(null); setSelectedClassId(''); navigate('/login', { replace: true }) }
  return <Layout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={onToggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={onAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={onSelectClass}>{children}</Layout>
}
export default function App() {
  const [user, setUser] = useState(null); const [ready, setReady] = useState(false); const [theme, setTheme] = useState('light'); const [themeBusy, setThemeBusy] = useState(false); const [accessibilityMode, setAccessibilityMode] = useState('normal')
  const [selectedClassId, setSelectedClassIdState] = useState(() => { try { return sessionStorage.getItem('selected-class-id') || '' } catch { return '' } })
  const setSelectedClassId = (value) => { const next = value ? String(value) : ''; setSelectedClassIdState(next); try { if (next) sessionStorage.setItem('selected-class-id', next); else sessionStorage.removeItem('selected-class-id') } catch {} }
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { const mode = readAccessibilityMode(user?.id); setAccessibilityMode(mode); document.documentElement.dataset.accessibility = mode }, [user?.id])
  useEffect(() => {
    let active = true
    const refreshUser = async () => { try { const response = await api.me(); if (active) { const nextUser = response.user || response; setUser(nextUser); setTheme(normalizeTheme(response.theme ?? nextUser?.theme)) } } catch { if (active) setUser(null) } finally { if (active) setReady(true) } }
    refreshUser(); let unsubscribe = () => {}
    try { unsubscribe = api.onAuthStateChange(({ event }) => { if (event === 'SIGNED_OUT') setUser(null); if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') window.setTimeout(refreshUser, 0) }) } catch {}
    return () => { active = false; unsubscribe() }
  }, [])
  const handleLogin = (nextUser) => { setUser(nextUser); setTheme(normalizeTheme(nextUser?.theme)) }
  const handleAccessibilityChange = (mode) => { const nextMode = normalizeAccessibilityMode(mode); setAccessibilityMode(nextMode); document.documentElement.dataset.accessibility = nextMode; persistAccessibilityMode(user?.id, nextMode) }
  const toggleTheme = async () => { if (themeBusy) return; const nextTheme = theme === 'dark' ? 'light' : 'dark'; const previousTheme = theme; setTheme(nextTheme); setThemeBusy(true); try { await api.updateTheme(nextTheme) } catch (error) { setTheme(previousTheme); console.error('Não foi possível salvar a preferência de tema.', error) } finally { setThemeBusy(false) } }
  if (!ready) return <FullPageLoading label="Verificando sua sessão…" />
  return <>
    <MessageHost />
    <svg className="a11y-filter-definitions" aria-hidden="true" focusable="false" width="0" height="0"><defs><filter id="a11y-deuteranopia" colorInterpolationFilters="sRGB"><feColorMatrix values="0.625 0.375 0 0 0 0.700 0.300 0 0 0 0 0.300 0.700 0 0 0 0 0 1 0" /></filter><filter id="a11y-protanopia" colorInterpolationFilters="sRGB"><feColorMatrix values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0" /></filter><filter id="a11y-tritanopia" colorInterpolationFilters="sRGB"><feColorMatrix values="0.950 0.050 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0" /></filter></defs></svg>
    <Routes>
      <Route path="/login" element={user ? <Home user={user} /> : <Login onLogin={handleLogin} />} />
      <Route path="/selecionar-turma" element={<Protected user={user}><ClassSelection user={user} onSelectClass={setSelectedClassId} /></Protected>} />
      <Route path="/" element={<Home user={user} />} />
      <Route path="/dashboard" element={<Home user={user} />} />
      <Route path="/painel/frequencia" element={<PublicAttendanceDashboard />} />
      <Route path="/dashboard/classes/:id" element={<Protected user={user}><Shell user={user} setUser={setUser} theme={theme} onToggleTheme={toggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={handleAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId}><Dashboard user={user} /></Shell></Protected>} />
      <Route path="/alunos" element={<Protected user={user}><Shell user={user} setUser={setUser} theme={theme} onToggleTheme={toggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={handleAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId}><Students selectedClassId={selectedClassId} /></Shell></Protected>} />
      <Route path="/alunos/:id" element={<Protected user={user}><Shell user={user} setUser={setUser} theme={theme} onToggleTheme={toggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={handleAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId}><StudentDetails user={user} /></Shell></Protected>} />
      <Route path="/relatorios" element={<Protected user={user}><Shell user={user} setUser={setUser} theme={theme} onToggleTheme={toggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={handleAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId}><Reports selectedClassId={selectedClassId} /></Shell></Protected>} />
      <Route path="/ocorrencias" element={<Protected user={user}><Shell user={user} setUser={setUser} theme={theme} onToggleTheme={toggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={handleAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId}><OccurrenceCases user={user} selectedClassId={selectedClassId} /></Shell></Protected>} />
      <Route path="/feedback" element={<Protected user={user}><Shell user={user} setUser={setUser} theme={theme} onToggleTheme={toggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={handleAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId}><TeacherFeedback user={user} selectedClassId={selectedClassId} /></Shell></Protected>} />
      <Route path="/configuracoes" element={<Protected user={user}><Shell user={user} setUser={setUser} theme={theme} onToggleTheme={toggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={handleAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId}><Settings /></Shell></Protected>} />
      <Route path="/logs" element={<Protected user={user}><Shell user={user} setUser={setUser} theme={theme} onToggleTheme={toggleTheme} themeBusy={themeBusy} accessibilityMode={accessibilityMode} onAccessibilityChange={handleAccessibilityChange} selectedClassId={selectedClassId} onSelectClass={setSelectedClassId}><AuditLogs user={user} /></Shell></Protected>} />
      <Route path="/students" element={<Navigate to="/alunos" replace />} />
      <Route path="/students/:id" element={<Navigate to="/alunos" replace />} />
      <Route path="/settings" element={<Navigate to="/configuracoes" replace />} />
      <Route path="*" element={<Home user={user} />} />
    </Routes>
  </>
}
