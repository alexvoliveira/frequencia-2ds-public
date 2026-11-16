import React from 'react'

const palette = {
  navy: '#19345F',
  blue: '#5DA7F6',
  cyan: '#66D7F5',
  cream: '#EAF6FF',
  coral: '#FF7E94',
  gold: '#FFBE66',
  mint: '#74DDB4',
  ink: '#263955',
}

export default function FlatIllustration({ type = 'dashboard', className = '', label }) {
  const title = label || 'Ilustração decorativa'
  return (
    <svg viewBox="0 0 420 300" role="img" aria-label={title} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="420" height="300" rx="32" fill="#DDEBF5" fillOpacity=".72" />
      <circle cx="347" cy="58" r="24" fill={palette.cream} />
      <circle cx="77" cy="245" r="30" fill={palette.cyan} opacity=".18" />
      {type === 'login' && <LoginScene />}
      {type === 'dashboard' && <DashboardScene />}
      {type === 'students' && <StudentsScene />}
      {type === 'empty' && <EmptyScene />}
      {type === 'error' && <ErrorScene />}
      {type === 'records' && <RecordsScene />}
    </svg>
  )
}

function LoginScene() {
  return <>
    <rect x="46" y="60" width="328" height="178" rx="18" fill="#FFFFFF" fillOpacity=".44" stroke="#FFFFFF" strokeOpacity=".70" strokeWidth="4" />
    <rect x="46" y="60" width="328" height="34" rx="18" fill={palette.navy} />
    <circle cx="67" cy="77" r="5" fill="#FFFFFF" opacity=".9" />
    <rect x="82" y="112" width="120" height="12" rx="6" fill={palette.ink} opacity=".9" />
    <rect x="82" y="138" width="215" height="12" rx="6" fill="#FFFFFF" fillOpacity=".38" />
    <rect x="82" y="163" width="180" height="30" rx="10" fill="#FFFFFF" fillOpacity=".28" stroke="#FFFFFF" strokeOpacity=".48" strokeWidth="3" />
    <rect x="82" y="201" width="104" height="30" rx="10" fill={palette.blue} />
    <circle cx="329" cy="164" r="22" fill={palette.coral} />
    <path d="M319 165l7 7 13-17" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </>
}

function DashboardScene() {
  return <>
    <rect x="46" y="52" width="328" height="194" rx="18" fill="#FFFFFF" fillOpacity=".44" stroke="#FFFFFF" strokeOpacity=".70" strokeWidth="4" />
    <rect x="46" y="52" width="78" height="194" rx="18" fill={palette.navy} />
    <circle cx="85" cy="82" r="14" fill={palette.cream} />
    {[115,142,169,196].map((y, i) => <rect key={y} x="63" y={y} width={i===0?42:28} height="9" rx="4.5" fill={i===0?palette.cyan:'#7080A4'} opacity={i===0?1:.7} />)}
    <rect x="145" y="73" width="84" height="40" rx="10" fill="#DDEBF5" fillOpacity=".72" />
    <rect x="239" y="73" width="110" height="40" rx="10" fill="#DDEBF5" fillOpacity=".72" />
    <rect x="145" y="126" width="204" height="95" rx="12" fill="#FFFFFF" fillOpacity=".24" stroke="#FFFFFF" strokeOpacity=".48" strokeWidth="2" />
    <path d="M162 196c20-35 29-7 48-43 19-36 25 23 43-9 18-32 27 2 45-24" fill="none" stroke={palette.blue} strokeWidth="7" strokeLinecap="round" />
    <circle cx="275" cy="128" r="25" fill={palette.mint} opacity=".18" />
    <path d="M263 128l8 8 15-17" fill="none" stroke={palette.mint} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </>
}

function StudentsScene() {
  return <>
    <rect x="62" y="68" width="296" height="170" rx="18" fill="#FFFFFF" fillOpacity=".44" stroke="#FFFFFF" strokeOpacity=".70" strokeWidth="4" />
    {[0,1,2].map((i) => { const x=112+i*98; return <g key={i}><circle cx={x} cy="116" r="23" fill={i===0?palette.blue:i===1?palette.coral:palette.cyan} opacity=".18"/><circle cx={x} cy="111" r="11" fill={palette.ink}/><path d={`M${x-18} 143c5-17 31-17 36 0`} fill="none" stroke={palette.ink} strokeWidth="7" strokeLinecap="round"/></g>})}
    <rect x="92" y="172" width="236" height="10" rx="5" fill="#FFFFFF" fillOpacity=".38" />
    <rect x="120" y="191" width="180" height="10" rx="5" fill="#FFFFFF" fillOpacity=".24" />
  </>
}

function EmptyScene() {
  return <>
    <path d="M112 190l58-73 68 35 58-67 35 105H90z" fill="#FFFFFF" fillOpacity=".34" />
    <circle cx="180" cy="105" r="23" fill={palette.gold} opacity=".8" />
    <path d="M135 218h148" stroke={palette.navy} strokeWidth="8" strokeLinecap="round" opacity=".5" />
    <path d="M168 158l24 24m0-24l-24 24" stroke={palette.coral} strokeWidth="6" strokeLinecap="round" />
  </>
}

function ErrorScene() {
  return <>
    <rect x="95" y="72" width="230" height="154" rx="20" fill="#FFFFFF" fillOpacity=".44" stroke="#FFFFFF" strokeOpacity=".70" strokeWidth="4" />
    <circle cx="210" cy="130" r="30" fill={palette.coral} opacity=".18" />
    <path d="M210 111v24M210 150v4" stroke={palette.coral} strokeWidth="7" strokeLinecap="round" />
    <rect x="140" y="180" width="140" height="10" rx="5" fill="#FFFFFF" fillOpacity=".38" />
  </>
}

function RecordsScene() {
  return <>
    <rect x="76" y="62" width="268" height="176" rx="18" fill="#FFFFFF" fillOpacity=".44" stroke="#FFFFFF" strokeOpacity=".70" strokeWidth="4" />
    {[94,126,158,190].map((y,i) => <g key={y}><circle cx="103" cy={y} r="8" fill={i===0?palette.mint:i===1?palette.coral:i===2?palette.blue:palette.gold}/><rect x="124" y={y-6} width={i===2?118:146} height="12" rx="6" fill="#FFFFFF" fillOpacity=".38" /></g>)}
    <rect x="244" y="208" width="55" height="14" rx="7" fill={palette.blue} />
  </>
}
