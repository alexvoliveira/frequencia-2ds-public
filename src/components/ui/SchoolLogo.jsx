import React from 'react'

export default function SchoolLogo({ size = 'md', alt = '', className = '' }) {
  const sizes = {
    sm: 'school-logo-sm',
    md: 'school-logo-md',
    lg: 'school-logo-lg',
  }

  return (
    <img
      src="/ceup-logo.png"
      alt={alt}
      className={`school-logo ${sizes[size] || sizes.md} ${className}`}
      width="640"
      height="640"
      decoding="async"
    />
  )
}
