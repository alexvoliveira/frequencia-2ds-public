import React from 'react'
import { UserRound } from 'lucide-react'

export default function StudentSelect({ value, onChange, students = [], disabled = false, loading = false }) {
  return (
    <div className="relative">
      <UserRound size={17} aria-hidden="true" className="select-leading-icon" />
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || loading}
        aria-label="Aluno"
        className="app-input app-select student-select"
      >
        <option value="">{loading ? 'Carregando alunos…' : students.length ? 'Selecione um aluno' : 'Nenhum aluno disponível'}</option>
        {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
      </select>
    </div>
  )
}
