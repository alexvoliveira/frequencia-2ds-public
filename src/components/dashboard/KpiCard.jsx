import React from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card } from '../ui/UI'
export default function KpiCard({title,value,sub,delta,icon:Icon,tone='cyan'}){
  const tones={cyan:'#00D9FF',pink:'#FF176B',orange:'#FFAA32',purple:'#8B5CF6'}; const c=tones[tone]
  return <Card className="relative overflow-hidden p-5 group hover:shadow-hover motion"><div className="absolute -right-8 -top-12 w-32 h-32 rounded-full blur-2xl opacity-20" style={{background:c}}/><div className="flex items-start gap-3"><div className="w-11 h-11 rounded-full grid place-items-center border" style={{background:`${c}18`,borderColor:`${c}42`,color:c}}><Icon size={21}/></div><div className="min-w-0"><div className="text-xs font-semibold text-muted">{title}</div><div className="text-[32px] leading-9 font-extrabold mt-1 tracking-tight">{value}</div>{delta!=null&&<div className={`text-xs mt-2 font-semibold flex items-center gap-1 ${delta>=0?'text-green':'text-red'}`}>{delta>=0?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>} {Math.abs(delta)}% <span className="text-dim font-normal">vs. período anterior</span></div>}{sub&&<div className="text-[11px] text-dim mt-1">{sub}</div>}</div></div></Card>
}
