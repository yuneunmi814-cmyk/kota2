import { fetchKfes } from './sources/kfes.js'
const rows = await fetchKfes()
console.log('건수', rows.length)
const c = (k: keyof typeof rows[0]) => rows.filter(r => r[k]).length
console.log(`이미지 ${c('imageUrl')} · 좌표 ${rows.filter(r=>r.lat&&r.lng).length} · 개요 ${c('summary')} · 요금 ${c('fee')} · 홈페이지 ${c('homepage')} · 인스타 ${c('instagram')} · 전화 ${c('tel')}`)
const s = rows[5]!
console.log(JSON.stringify({...s, summary: s.summary?.slice(0,80)+'…'}, null, 1))
