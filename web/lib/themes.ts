import type { Lang } from './i18n'

// 여행 목적 테마 — 팀 인터뷰(8/12)에서 나온 "여행계획의 기본은 목적"에 대응하는 축.
// 지역(어디로)만 있던 탐색에 목적(뭐 하러)을 더한다. 백엔드 분류와 1:1로 맞춘다.

export const THEMES = ['food', 'nature', 'heritage', 'music', 'family', 'night'] as const
export type Theme = (typeof THEMES)[number]
export const isTheme = (v: string): v is Theme => (THEMES as readonly string[]).includes(v)

const LABEL: Record<Theme, Record<Lang, string>> = {
  food: { ko: '먹거리', en: 'Food', ja: 'グルメ', th: 'อาหาร' },
  nature: { ko: '꽃·자연', en: 'Nature', ja: '花・自然', th: 'ธรรมชาติ' },
  heritage: { ko: '역사·전통', en: 'Heritage', ja: '歴史・伝統', th: 'ประวัติศาสตร์' },
  music: { ko: '음악·공연', en: 'Music', ja: '音楽・公演', th: 'ดนตรี' },
  family: { ko: '가족·체험', en: 'Family', ja: '家族・体験', th: 'ครอบครัว' },
  night: { ko: '야경·불빛', en: 'Night lights', ja: '夜景・イルミ', th: 'แสงไฟยามค่ำ' },
}

const DESC: Record<Theme, Record<Lang, string>> = {
  food: {
    ko: '지역 특산물과 먹거리를 즐기는 축제',
    en: 'Festivals built around local food and produce',
    ja: '地域の特産品とグルメを楽しむ祭り',
    th: 'เทศกาลอาหารและของดีประจำถิ่น',
  },
  nature: {
    ko: '꽃·바다·숲 등 자연을 즐기는 축제',
    en: 'Flowers, sea and forest',
    ja: '花・海・森など自然を楽しむ祭り',
    th: 'ดอกไม้ ทะเล และป่า',
  },
  heritage: {
    ko: '문화유산과 전통을 만나는 축제',
    en: 'Heritage sites and living traditions',
    ja: '文化遺産と伝統に出会う祭り',
    th: 'มรดกและวัฒนธรรมดั้งเดิม',
  },
  music: {
    ko: '음악·공연·예술을 즐기는 축제',
    en: 'Concerts, performances and art',
    ja: '音楽・公演・芸術を楽しむ祭り',
    th: 'ดนตรี การแสดง และศิลปะ',
  },
  family: {
    ko: '아이와 함께 체험하기 좋은 축제',
    en: 'Hands-on fun with kids',
    ja: '子どもと一緒に体験できる祭り',
    th: 'กิจกรรมสนุกสำหรับครอบครัว',
  },
  night: {
    ko: '밤에 빛나는 야경·불빛 축제',
    en: 'Lights, lanterns and after dark',
    ja: '夜に輝く夜景・イルミネーション',
    th: 'แสงไฟและบรรยากาศยามค่ำคืน',
  },
}

export const themeLabel = (k: Theme, lang: Lang) => LABEL[k][lang]
export const themeDesc = (k: Theme, lang: Lang) => DESC[k][lang]
