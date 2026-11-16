import { supabase, supabaseConfigured } from './supabase'
import { todayIsoBrazil } from './date'

function emitRecordsChanged(detail = {}) {
  window.dispatchEvent(new CustomEvent('school-data-changed', { detail }))
}

function appError(error, fallback = 'Não foi possível concluir a operação.') {
  const code = error?.code || error?.status
  const message = String(error?.message || '').toLowerCase()
  if (code === '42501' || code === 401 || code === 403) return new Error('Você não possui permissão para realizar esta ação.')
  if (code === 429 || error?.status === 429 || message.includes('rate limit') || message.includes('muitas requisições')) return new Error('Muitas requisições. Tente novamente em alguns segundos.')
  if (code === '23505') return new Error('Já existe um registro com esses dados.')
  if (code === '23503' || code === '23514') return new Error('Os dados informados não atendem às regras do sistema.')
  if (code === '22007' || code === '22023') return new Error('Revise os dados informados e tente novamente.')
  if (code === 'PGRST202' || message.includes('could not find the function')) return new Error('A estrutura do banco está desatualizada. Aplique a migração mais recente do Supabase e tente novamente.')
  if (code === 'PGRST204' || message.includes('column') && message.includes('does not exist')) return new Error('A estrutura do banco está desatualizada. Aplique a migração mais recente do Supabase e tente novamente.')
  if (message.includes('invalid login credentials')) return new Error('E-mail ou senha inválidos.')
  if (message.includes('email not confirmed')) return new Error('O e-mail desta conta ainda precisa ser confirmado.')
  if (message.includes('network') || message.includes('fetch')) return new Error('Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.')
  return new Error(fallback)
}

function ensureConfigured() {
  if (!supabaseConfigured || !supabase) throw new Error('A conexão com o serviço de dados não foi configurada.')
}

function positiveId(value, label = 'Identificador') {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} inválido.`)
  return id
}

async function currentAuthUser() {
  ensureConfigured()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw appError(error, 'Sua sessão não pôde ser verificada.')
  return data.user
}

async function currentUserContext() {
  const result = await rpc(
    'app_current_user_context_secure',
    {},
    'Sua sessão não pôde ser validada.',
  )
  if (!result || typeof result !== 'object') throw new Error('Sua conta não está autorizada a acessar o sistema.')
  return result
}

function normalizeRole(context) {
  const roles = new Set(['ADMIN', 'TEACHER', 'STAFF', 'VIEWER'])
  const candidates = []

  function collect(value, parentKey = '') {
    if (!value || typeof value !== 'object') return
    for (const [key, item] of Object.entries(value)) {
      const field = key.toLowerCase().replace(/[^a-z0-9]/g, '')
      const isRoleField = ['role', 'rolecode', 'accessrole', 'accessrolecode'].includes(field)
        || (field === 'code' && /role|profile|permission/i.test(parentKey))
      if (isRoleField && typeof item === 'string') candidates.push(item.trim().toUpperCase())
      collect(item, key)
    }
  }

  collect(context)
  return candidates.find((candidate) => roles.has(candidate)) || ''
}

async function rpc(name, args = {}, fallback) {
  ensureConfigured()
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw appError(error, fallback)
  return formatPeopleFields(data)
}

const NAME_PARTICLES = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'del', 'della', 'di', 'van', 'von'])

function formatPeopleFields(value, parentPath = '') {
  if (Array.isArray(value)) return value.map((item) => formatPeopleFields(item, parentPath))
  if (!value || typeof value !== 'object') return value
  const isPersonContext = /(?:^|\.)(?:students?|teachers?|professors?|actors?|users?|profiles?|people|attentionStudents|rankings?)(?:\.|$)/i.test(parentPath)
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const isPersonName = /^(student|teacher|professor|actor)(name|_name)$/i.test(key)
      || (typeof item === 'string' && /^(student|teacher|professor)$/i.test(key))
      || (key.toLowerCase() === 'name' && isPersonContext)
    return [key, isPersonName ? formatPersonName(item) : formatPeopleFields(item, parentPath ? `${parentPath}.${key}` : key)]
  }))
}

function formatPersonName(value) {
  if (typeof value !== 'string') return value
  const words = value.trim().toLocaleLowerCase('pt-BR').split(/\s+/).filter(Boolean)
  return words.map((word, index) => {
    if (index > 0 && NAME_PARTICLES.has(word)) return word
    return word.split(/([-'])/).map((part) => part === '-' || part === "'" ? part : part ? part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1) : part).join('')
  }).join(' ')
}

function mapClass(row) {
  return {
    id: row.id,
    name: row.name,
    educationLevel: row.education_level ?? row.educationLevel ?? null,
    educationModality: row.education_modality ?? row.educationModality ?? null,
    active: row.active,
  }
}

function mapStudent(row) {
  return {
    id: row.id,
    classId: row.class_id ?? row.classId,
    name: formatPersonName(row.name),
    registrationNumber: row.registration_number ?? row.registrationNumber ?? null,
    active: row.active ?? true,
  }
}

async function readRows(queryBuilder) {
  const { data, error } = await queryBuilder
  if (error) throw appError(error)
  return data || []
}

export const api = {
  onAuthStateChange(callback) {
    ensureConfigured()
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback?.({ event, session })
    })
    return () => data.subscription.unsubscribe()
  },

  async me() {
    const user = await currentAuthUser()
    const context = await currentUserContext()
    if (String(context.id) !== String(user.id)) throw new Error('Sua sessão não pôde ser validada.')
    return {
      authenticated: true,
      user: {
        id: context.id,
        name: formatPersonName(context.name),
        email: user.email || '',
        role: normalizeRole(context),
      },
      theme: context.theme,
    }
  },

  async login(email, password) {
    ensureConfigured()
    const { data, error } = await supabase.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password })
    if (error || !data.user) throw appError(error, 'Credenciais inválidas.')
    const context = await currentUserContext()
    const profile = {
      id: context.id,
      name: formatPersonName(context.name),
      email: data.user.email || '',
      role: normalizeRole(context),
    }
    const theme = context.theme
    await rpc(
      'app_record_audit',
      { p_action: 'LOGIN', p_entity_type: 'AUTH', p_entity_id: data.user.id, p_metadata: { method: 'password' } },
      'Não foi possível registrar o login.',
    ).catch((auditError) => {
      console.warn('Falha ao registrar o login na auditoria.', auditError)
    })
    return { ...profile, theme }
  },

  async updateTheme(theme) {
    ensureConfigured()
    const nextTheme = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : null
    if (!nextTheme) throw new Error('Tema inválido.')

    const { error } = await supabase
      .from('user_theme_preferences')
      .upsert({ theme: nextTheme }, { onConflict: 'user_id' })
    if (error) throw appError(error, 'Não foi possível salvar sua preferência de tema.')
    return { theme: nextTheme }
  },

  async logout() {
    ensureConfigured()
    const user = await supabase.auth.getUser().then((r) => r.data.user).catch(() => null)
    if (user) await rpc('app_record_audit', { p_action: 'LOGOUT', p_entity_type: 'AUTH', p_entity_id: user.id, p_metadata: {} }, 'Não foi possível registrar a saída.').catch(() => {})
    const { error } = await supabase.auth.signOut()
    if (error) throw appError(error, 'Não foi possível sair.')
    return { ok: true }
  },

  async changePassword({ currentPassword, newPassword }) {
    ensureConfigured()
    if (!newPassword || String(newPassword).length < 12) throw new Error('A nova senha deve possuir pelo menos 12 caracteres.')
    const user = await currentAuthUser()
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (reauthError) throw new Error('A senha atual está incorreta.')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw appError(error, 'Não foi possível alterar a senha.')
    await rpc('app_record_audit', { p_action: 'PASSWORD_CHANGE', p_entity_type: 'AUTH', p_entity_id: user.id, p_metadata: {} }, 'Não foi possível registrar a alteração.')
    return { ok: true }
  },

  async classes() {
    const rows = await rpc('app_available_classes_secure', {}, 'Não foi possível carregar as turmas.')
    return (Array.isArray(rows) ? rows : []).map(mapClass)
  },

  async createClass(body) {
    return rpc('app_create_class_v2', {
      p_name: body.name,
      p_code: body.code,
      p_education_level: body.educationLevel || 'MEDIO',
      p_education_modality: body.educationModality || null,
    }, 'Não foi possível criar a turma.')
  },

  async updateClass(id, body) {
    return rpc('app_update_class', { p_id: positiveId(id), p_name: body.name ?? null, p_code: body.code ?? null, p_active: body.active ?? null }, 'Não foi possível atualizar a turma.')
  },

  async deleteClass(id) {
    return rpc('app_delete_class', { p_id: positiveId(id) }, 'Não foi possível desativar a turma.')
  },

  async dashboard(id, period = 'month', startDate, endDate) {
    return rpc('app_dashboard_secure', {
      p_class_id: positiveId(id, 'Turma'),
      p_period: period,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    }, 'Não foi possível carregar o dashboard.')
  },

  async publicAttendanceDashboard() {
    return rpc('app_public_attendance_dashboard', {}, 'Não foi possível carregar o painel de frequência.')
  },

  async students(classId, q = '') {
    const first = await rpc('app_students_list_secure', {
      p_class_id: positiveId(classId, 'Turma'),
      p_page: 1,
      p_limit: 50,
      p_search: String(q || '').trim() || null,
    }, 'Não foi possível carregar os alunos.')

    const rows = Array.isArray(first?.data) ? first.data.map(mapStudent) : []
    const pages = Math.max(1, Number(first?.pagination?.pages) || 1)

    if (pages > 1 && !q) {
      for (let page = 2; page <= pages; page += 1) {
        const result = await rpc('app_students_list_secure', {
          p_class_id: positiveId(classId, 'Turma'),
          p_page: page,
          p_limit: 50,
          p_search: null,
        }, 'Não foi possível carregar os alunos.')
        if (Array.isArray(result?.data)) rows.push(...result.data.map(mapStudent))
      }
    }

    return rows
  },

  async studentsPaged(params = {}) {
    const result = await rpc('app_students_list_secure', {
      p_class_id: positiveId(params.classId, 'Turma'),
      p_page: Math.max(1, Number(params.page) || 1),
      p_limit: Math.min(50, Math.max(1, Number(params.limit) || 20)),
      p_search: String(params.search ?? params.q ?? '').trim() || null,
    }, 'Não foi possível carregar os alunos.')
    return formatPeopleFields(result, 'students')
  },

  async createStudent(body) {
    return rpc('app_create_student', { p_class_id: Number(body.classId), p_name: body.name, p_registration_number: body.registrationNumber || null }, 'Não foi possível cadastrar o aluno.')
  },

  async updateStudent(id, body) {
    return rpc('app_update_student', { p_id: positiveId(id), p_name: body.name ?? null, p_registration_number: body.registrationNumber ?? null, p_class_id: body.classId ? Number(body.classId) : null, p_active: body.active ?? null }, 'Não foi possível atualizar o aluno.')
  },

  async deleteStudent(id) {
    return rpc('app_delete_student', { p_id: positiveId(id) }, 'Não foi possível desativar o aluno.')
  },

  async student(id) {
    const result = await rpc('app_student_detail_secure', { p_student_id: positiveId(id, 'Aluno') }, 'Não foi possível carregar o aluno.')
    if (result?.student) result.student = { ...result.student, name: formatPersonName(result.student.name) }
    if (Array.isArray(result?.history)) result.history = result.history.map((row) => ({ ...row, studentName: formatPersonName(row.studentName ?? row.student_name) }))
    return result
  },

  async occurrenceTypes(includeInactive = false) {
    ensureConfigured()
    let query = supabase.from('occurrence_types').select('id,name,description,active').order('name')
    if (!includeInactive) query = query.eq('active', true)
    return readRows(query)
  },

  async occurrenceCases(classId) {
    return rpc(
      'app_occurrence_cases_secure',
      { p_class_id: positiveId(classId, 'Turma'), p_status: null },
      'Não foi possível carregar o acompanhamento de ocorrências.',
    )
  },

  async openOccurrenceCase(id, classId) {
    return rpc(
      'app_open_occurrence_case',
      {
        p_case_id: positiveId(id, 'Ocorrência'),
        p_class_id: positiveId(classId, 'Turma'),
      },
      'Não foi possível abrir a ocorrência.',
    )
  },

  async resolveOccurrenceCase(id, classId, response) {
    return rpc(
      'app_review_occurrence_case',
      {
        p_case_id: positiveId(id, 'Ocorrência'),
        p_class_id: positiveId(classId, 'Turma'),
        p_status: 'RESOLVED',
        p_response: String(response || '').trim(),
      },
      'Não foi possível resolver a ocorrência.',
    )
  },

  async teacherFeedback() {
    return rpc(
      'app_teacher_feedback_secure',
      { p_status: null },
      'Não foi possível carregar os feedbacks.',
    )
  },

  async createTeacherFeedback({ classId = null, subject, message }) {
    return rpc(
      'app_create_teacher_feedback',
      {
        p_class_id: classId ? positiveId(classId, 'Turma') : null,
        p_subject: String(subject || '').trim(),
        p_message: String(message || '').trim(),
      },
      'Não foi possível enviar o feedback.',
    )
  },

  async openTeacherFeedback(id) {
    return rpc(
      'app_open_teacher_feedback',
      { p_feedback_id: positiveId(id, 'Feedback') },
      'Não foi possível abrir o feedback.',
    )
  },

  async resolveTeacherFeedback(id, response) {
    return rpc(
      'app_resolve_teacher_feedback',
      {
        p_feedback_id: positiveId(id, 'Feedback'),
        p_response: String(response || '').trim(),
      },
      'Não foi possível registrar a resposta.',
    )
  },

  async createOccurrenceType(body) {
    const settings = await this.settings()
    const occurrenceTypes = [...settings.occurrenceTypes, { id: `tmp-${Date.now()}`, name: body.name, description: body.description || null, active: true }]
    return this.saveSettings({ ...settings, occurrenceTypes })
  },

  async updateOccurrenceType(id, body) {
    const settings = await this.settings()
    const occurrenceTypes = settings.occurrenceTypes.map((item) => String(item.id) === String(id) ? { ...item, ...body } : item)
    return this.saveSettings({ ...settings, occurrenceTypes })
  },

  async deleteOccurrenceType(id) {
    const settings = await this.settings()
    const occurrenceTypes = settings.occurrenceTypes.map((item) => String(item.id) === String(id) ? { ...item, active: false } : item)
    return this.saveSettings({ ...settings, occurrenceTypes })
  },

  async attendance(params = {}) {
    ensureConfigured()
    const classId = positiveId(params.classId, 'Turma')
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    let query = supabase.from('attendance_records').select('id,student_id,class_id,date,status,quantity,notes,created_by,created_at', { count: 'exact' }).eq('class_id', classId).order('date', { ascending: false }).order('id', { ascending: false })
    if (params.studentId) query = query.eq('student_id', positiveId(params.studentId, 'Aluno'))
    if (params.startDate || params.start) query = query.gte('date', params.startDate || params.start)
    if (params.endDate || params.end) query = query.lte('date', params.endDate || params.end)
    query = query.range((page - 1) * limit, page * limit - 1)
    const { data, error, count } = await query
    if (error) throw appError(error)
    return { data: data || [], pagination: { page, limit, total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / limit)) } }
  },

  async createAttendance(body) {
    const result = await rpc('app_create_attendance', {
      p_student_id: Number(body.studentId), p_class_id: Number(body.classId), p_date: body.date, p_quantity: Number(body.quantity), p_notes: body.notes || null,
    }, 'Não foi possível registrar a falta.')
    emitRecordsChanged({ kind: 'attendance', action: 'create' })
    return result
  },

  async createAttendanceBulk(body) {
    const students = Array.isArray(body.students) ? body.students : []
    const result = await rpc('app_create_attendance_bulk', {
      p_class_id: Number(body.classId),
      p_date: body.date,
      p_quantity: Number(body.quantity),
      p_general_message: body.generalMessage || null,
      p_students: students.map((item) => ({
        studentId: Number(item.studentId),
        notes: item.notes || null,
      })),
    }, 'Não foi possível registrar as faltas.')
    emitRecordsChanged({ kind: 'attendance', action: 'bulk-create', count: students.length })
    return result
  },

  async updateAttendance(id, body) {
    const result = await rpc('app_update_attendance', {
      p_id: positiveId(id), p_student_id: Number(body.studentId), p_class_id: Number(body.classId), p_date: body.date, p_quantity: Number(body.quantity), p_notes: body.notes || null,
    }, 'Não foi possível atualizar a falta.')
    emitRecordsChanged({ kind: 'attendance', action: 'update', id })
    return result
  },

  async deleteAttendance(id) {
    const result = await rpc('app_delete_attendance', { p_id: positiveId(id) }, 'Não foi possível excluir a falta.')
    emitRecordsChanged({ kind: 'attendance', action: 'delete', id })
    return result
  },

  async deleteRecordsBulk(records) {
    const items = Array.isArray(records)
      ? records.filter(Boolean).map((item) => ({
          entityType: String(item.entityType || '').toUpperCase(),
          id: positiveId(item.id),
        }))
      : []
    if (!items.length) return { deleted: 0 }
    const result = await rpc(
      'app_delete_records_bulk',
      { p_records: items },
      'Não foi possível excluir os registros.',
    )
    emitRecordsChanged({ kind: 'records', action: 'bulk-delete', count: result?.deleted ?? items.length })
    return result
  },

  async createJustification(body) {
    const result = await rpc('app_create_justification', {
      p_student_id: Number(body.studentId), p_attendance_id: Number(body.attendanceId), p_date: body.date, p_reason: body.reason, p_description: body.description || null, p_attachment_id: body.attachmentId || null,
    }, 'Não foi possível registrar a justificativa.')
    emitRecordsChanged({ kind: 'justification', action: 'create' })
    return result
  },

  async createJustificationBulk(body) {
    const students = Array.isArray(body.students) ? body.students : []
    const result = await rpc('app_create_justification_bulk', {
      p_date: body.date,
      p_reason: body.reason,
      p_general_message: body.generalMessage || null,
      p_students: students.map((item) => ({
        studentId: Number(item.studentId),
        attendanceId: Number(item.attendanceId),
        description: item.description || null,
      })),
    }, 'Não foi possível registrar as justificativas.')
    emitRecordsChanged({ kind: 'justification', action: 'bulk-create', count: students.length })
    return result
  },

  async updateJustification(id, body) {
    const result = await rpc('app_update_justification', {
      p_id: positiveId(id), p_student_id: Number(body.studentId), p_attendance_id: Number(body.attendanceId), p_date: body.date, p_reason: body.reason, p_description: body.description || null, p_attachment_id: body.attachmentId || null,
    }, 'Não foi possível atualizar a justificativa.')
    emitRecordsChanged({ kind: 'justification', action: 'update', id })
    return result
  },

  async deleteJustification(id) {
    const result = await rpc('app_delete_justification', { p_id: positiveId(id) }, 'Não foi possível excluir a justificativa.')
    emitRecordsChanged({ kind: 'justification', action: 'delete', id })
    return result
  },

  async createOccurrence(body) {
    const result = await rpc('app_create_occurrence', {
      p_student_id: Number(body.studentId), p_class_id: Number(body.classId), p_date: body.date, p_type_id: Number(body.occurrenceTypeId), p_description: body.description, p_severity: body.severity || 'LOW',
    }, 'Não foi possível registrar a ocorrência.')
    emitRecordsChanged({ kind: 'occurrence', action: 'create' })
    return result
  },

  async createOccurrenceBulk(body) {
    const students = Array.isArray(body.students) ? body.students : []
    const result = await rpc('app_create_occurrence_bulk', {
      p_class_id: Number(body.classId),
      p_date: body.date,
      p_type_id: Number(body.occurrenceTypeId),
      p_severity: body.severity || 'LOW',
      p_general_message: body.generalMessage || null,
      p_students: students.map((item) => ({
        studentId: Number(item.studentId),
        description: item.description || null,
      })),
    }, 'Não foi possível registrar as ocorrências.')
    emitRecordsChanged({ kind: 'occurrence', action: 'bulk-create', count: students.length })
    return result
  },

  async updateOccurrence(id, body) {
    const result = await rpc('app_update_occurrence', {
      p_id: positiveId(id), p_student_id: Number(body.studentId), p_class_id: Number(body.classId), p_date: body.date, p_type_id: Number(body.occurrenceTypeId), p_description: body.description, p_severity: body.severity || 'LOW',
    }, 'Não foi possível atualizar a ocorrência.')
    emitRecordsChanged({ kind: 'occurrence', action: 'update', id })
    return result
  },

  async deleteOccurrence(id) {
    const result = await rpc('app_delete_occurrence', { p_id: positiveId(id) }, 'Não foi possível excluir a ocorrência.')
    emitRecordsChanged({ kind: 'occurrence', action: 'delete', id })
    return result
  },

  async ranking(classId, metric, period = 'GENERAL') {
    const key = period === 'WEEKLY' ? 'week' : period === 'MONTHLY' ? 'month' : 'all'
    let startDate = null
    let endDate = null
    if (key !== 'all') {
      const end = todayIsoBrazil()
      const [year, month, day] = end.split('-').map(Number)
      const today = new Date(Date.UTC(year, month - 1, day))
      if (key === 'month') {
        startDate = `${year}-${String(month).padStart(2, '0')}-01`
      } else {
        const weekday = today.getUTCDay()
        const mondayOffset = weekday === 0 ? 6 : weekday - 1
        today.setUTCDate(today.getUTCDate() - mondayOffset)
        startDate = today.toISOString().slice(0, 10)
      }
      endDate = end
    }
    const result = await rpc('app_ranking_json_secure', {
      p_class_id: positiveId(classId, 'Turma'),
      p_metric: String(metric).toUpperCase(),
      p_start_date: startDate,
      p_end_date: endDate,
    }, 'Não foi possível carregar o ranking.')
    return formatPeopleFields(result, 'rankings')
  },

  reports: {
    async attendance(params = {}) {
      const result = await rpc('app_report_attendance_secure', { p_class_id: positiveId(params.classId, 'Turma'), p_student_id: params.studentId ? positiveId(params.studentId, 'Aluno') : null, p_period: params.period || 'month', p_start_date: params.startDate || null, p_end_date: params.endDate || null }, 'Não foi possível carregar o relatório de frequência.')
      return { ...result, rows: (result?.rows || []).map((row) => ({ ...row, studentName: formatPersonName(row.student_name) })) }
    },
    async occurrences(params = {}) {
      const result = await rpc('app_report_occurrences_secure', { p_class_id: positiveId(params.classId, 'Turma'), p_student_id: params.studentId ? positiveId(params.studentId, 'Aluno') : null, p_period: params.period || 'month', p_start_date: params.startDate || null, p_end_date: params.endDate || null, p_type_id: params.typeId ? Number(params.typeId) : null }, 'Não foi possível carregar o relatório de ocorrências.')
      return { ...result, rows: (result?.rows || []).map((row) => ({ ...row, studentName: formatPersonName(row.student_name), occurrenceTypeName: row.occurrence_type_name })) }
    },
    async student(id) {
      return rpc('app_student_detail_secure', { p_student_id: positiveId(id, 'Aluno') }, 'Não foi possível carregar o relatório do aluno.')
    },
    async exportCsv(params = {}) {
      const type = params.type || 'attendance'
      const data = type === 'occurrences' ? await this.occurrences(params) : await this.attendance(params)
      const rows = data.rows || []
      const headers = type === 'occurrences' ? ['Data','Aluno','Tipo','Gravidade','Descrição','Observação'] : ['Data','Aluno','Status','Quantidade','Observação']
      const escape = (value) => {
        const text = String(value ?? '')
        const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
        return `"${safe.replaceAll('"', '""')}"`
      }
      const body = [headers, ...rows.map((row) => type === 'occurrences'
        ? [row.date,row.studentName,row.occurrenceTypeName,row.severity,row.description,row.notes]
        : [row.date,row.studentName,row.status,row.quantity,row.notes])].map((row) => row.map(escape).join(',')).join('\n')
      return new Blob([`\ufeff${body}`], { type: 'text/csv;charset=utf-8' })
    },
  },

  async settings() {
    const result = await rpc('app_settings_json', {}, 'Não foi possível carregar as configurações.')
    return result
  },

  async saveSettings(body) {
    const result = await rpc('app_save_settings', {
      p_school_name: body.schoolName,
      p_timezone: body.timezone || 'America/Sao_Paulo',
      p_days: Number(body.schoolDaysPerYear),
      p_lessons: Number(body.lessonsPerDay),
      p_min_attendance: Number(body.minAttendancePercent),
      p_types: body.occurrenceTypes || [],
    }, 'Não foi possível salvar as configurações.')
    emitRecordsChanged({ kind: 'settings', action: 'update' })
    return result
  },

  async audit(limit = 100) {
    ensureConfigured()
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100))
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id,user_id,action,entity_type,entity_id,metadata,actor_name,actor_email,ip_address,created_at')
      .order('created_at', { ascending: false })
      .limit(safeLimit)
    if (error) throw appError(error)
    return (data || []).map((row) => ({ ...row, actor_name: formatPersonName(row.actor_name) }))
  },
}
