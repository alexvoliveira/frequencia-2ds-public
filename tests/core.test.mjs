import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('.')
const api = fs.readFileSync(path.join(root, 'src/lib/api.js'), 'utf8')
const supabaseClient = fs.readFileSync(path.join(root, 'src/lib/supabase.js'), 'utf8')
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8')
const layout = fs.readFileSync(path.join(root, 'src/components/layout/Layout.jsx'), 'utf8')
const occurrencePage = fs.readFileSync(path.join(root, 'src/pages/OccurrenceCases.jsx'), 'utf8')
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261003170136_occurrence_direction_email_workflow.sql'), 'utf8')
const deliveryMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261003174746_occurrence_email_delivery_status.sql'), 'utf8')
const managerMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261003174807_occurrence_direction_manager_email.sql'), 'utf8')
const payloadMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261003174926_occurrence_email_payload_hardening.sql'), 'utf8')
const notesMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261003175028_occurrence_remove_legacy_notes.sql'), 'utf8')
const securityMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261009184726_security_hardening_and_teacher_occurrence_delete.sql'), 'utf8')
const inactiveAccessMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20261009184900_fail_closed_inactive_profiles_and_class_access.sql'), 'utf8')
const studentDetails = fs.readFileSync(path.join(root, 'src/pages/StudentDetails.jsx'), 'utf8')
const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))

test('Supabase is the configured backend dependency', () => {
  assert.ok(pkg.dependencies['@supabase/supabase-js'])
  assert.equal(pkg.scripts.build, 'vite build')
  assert.match(supabaseClient, /createClient\(/)
})

test('frontend uses Supabase Auth and secure RPC boundaries', () => {
  assert.match(api, /signInWithPassword/)
  assert.match(api, /auth\.signOut/)
  assert.match(api, /app_dashboard_secure/)
  assert.match(api, /app_students_list_secure/)
  assert.match(api, /app_current_user_context_secure/)
  assert.match(api, /app_record_audit/)
  assert.doesNotMatch(api, /service_role|sb_secret_/i)
})

test('occurrence creation returns a case shared by bulk records', () => {
  assert.match(api, /app_create_occurrence'/)
  assert.match(api, /app_create_occurrence_bulk'/)
  assert.match(migration, /create table public\.occurrence_cases/)
  assert.match(migration, /case_id bigint/)
  assert.match(migration, /status text not null default 'UNREAD'/)
})

test('direction workflow has explicit statuses, responsible user and response', () => {
  assert.match(migration, /UNREAD.*IN_REVIEW.*RESOLVED/s)
  assert.match(migration, /handled_by uuid/)
  assert.match(migration, /response text/)
  assert.match(migration, /app_review_occurrence_case/)
  assert.match(occurrencePage, /Não lidas/)
  assert.match(occurrencePage, /Em revisão/)
  assert.match(occurrencePage, /Resolvidas/)
})

test('direction access is controlled by the database authorization function', () => {
  assert.match(managerMigration, /app_is_occurrence_manager/)
  assert.doesNotMatch(managerMigration, /@[A-Z0-9.-]+\.[A-Z]{2,}/i)
})

test('occurrence notification payload remains authorized server-side', () => {
  assert.match(migration, /app_occurrence_notification_payload/)
  assert.match(payloadMigration, /o\.created_by=\(select auth\.uid\(\)\)/)
  assert.match(payloadMigration, /app_is_occurrence_manager\(\)/)
})

test('occurrence notification is resilient to email failure', () => {
  assert.match(deliveryMigration, /email_status=p_status/)
  assert.match(migration, /email_status text not null default 'PENDING'/)
  assert.match(migration, /FAILED/)
})

test('legacy occurrence observation is removed from persisted data and hidden from occurrence dialogs', () => {
  assert.match(notesMigration, /update public\.occurrences set notes=null/)
  assert.match(notesMigration, /notes=null,updated_by/)
})

test('student history exposes occurrence review data', () => {
  assert.match(api, /app_student_detail_secure'/)
})

test('email payload is authorized against the occurrence creator or direction manager', () => {
  assert.match(payloadMigration, /o\.created_by=\(select auth\.uid\(\)\)/)
  assert.match(payloadMigration, /app_is_occurrence_manager\(\)/)
})

test('post-login keeps the class selection flow and exposes direction occurrences route', () => {
  assert.match(app, /selecionar-turma/)
  assert.match(app, /ClassSelection/)
  assert.match(app, /path="\/ocorrencias"/)
  assert.match(layout, /\['\/ocorrencias', 'Ocorrências'/)
})

test('Vercel remains configured as a static Vite SPA', () => {
  assert.deepEqual(vercel.rewrites, [{ source: '/(.*)', destination: '/index.html' }])
})

test('legacy server files are absent', () => {
  for (const name of ['app.js', 'compose.yml', 'Dockerfile']) assert.equal(fs.existsSync(path.join(root, name)), false)
  assert.equal(fs.existsSync(path.join(root, 'backend')), false)
  assert.equal(fs.existsSync(path.join(root, 'data')), false)
})


test('teacher deletion is restricted to their own pending occurrence in UI and database', () => {
  assert.match(studentDetails, /user\?\.role === 'TEACHER'/)
  assert.match(studentDetails, /record\.createdBy/)
  assert.match(studentDetails, /record\.caseStatus === 'UNREAD'/)
  assert.match(studentDetails, /canDeleteRecord && <button/)
  assert.match(securityMigration, /v_created_by is distinct from v_user_id/)
  assert.match(securityMigration, /v_case_status is distinct from 'UNREAD'/)
  assert.match(securityMigration, /for update of o, oc/i)
  assert.match(securityMigration, /grant execute on function public\.app_delete_occurrence\(bigint\) to authenticated/i)
})

test('SECURITY DEFINER search paths are hardened and student detail is scoped', () => {
  assert.match(securityMigration, /set search_path = ''/i)
  assert.match(securityMigration, /alter function %I\.%I\(%s\) set search_path/i)
  assert.match(securityMigration, /revoke all on function public\.app_student_detail\(bigint\) from public, anon, authenticated/i)
  assert.match(securityMigration, /'createdBy', o\.created_by/)
  assert.match(securityMigration, /'caseStatus', oc\.status/)
})

test('inactive or profile-less accounts cannot gain class access', () => {
  assert.match(inactiveAccessMigration, /coalesce\(p\.active, false\)/)
  assert.match(inactiveAccessMigration, /if v_email is null or v_active is not true then/)
  assert.match(inactiveAccessMigration, /select public\.app_is_active_user\(\)/)
})

test('generated dependencies and builds are excluded from version control', () => {
  assert.match(gitignore, /node_modules\//)
  assert.match(gitignore, /dist\//)
  assert.match(gitignore, /\.vite\//)
  assert.match(gitignore, /\.env\.\*/)
  assert.match(gitignore, /!\.env\.example/)
})

test('application source avoids known dangerous HTML and secret sinks', () => {
  const sourceFiles = []
  const visit = (directory) => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, item.name)
      if (item.isDirectory()) visit(filePath)
      else if (/\.(?:js|jsx|ts|tsx)$/.test(item.name)) sourceFiles.push(fs.readFileSync(filePath, 'utf8'))
    }
  }
  visit(path.join(root, 'src'))
  const source = sourceFiles.join('\n')
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\s*\(|\bnew Function\s*\(/)
  assert.doesNotMatch(source, /sb_secret_[A-Za-z0-9_-]{10,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}/)
})
