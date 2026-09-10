import type { Festival, Translation } from './festivals'

/** Reviewed display names, not claims of official translated branding. Korean source names
 * were checked against the committed festival snapshot on 2026-09-11. No substring-wide
 * replacements: even IDs are edition scoped, since TourAPI reuses them in later years. */
const names: Record<string, [string, string, string, string]> = {
  'tourapi:4056606': ['청백리의 집, 오늘을 비추다', 'The Home of an Honest Official: Reflections on Today', '清廉な官吏の家、今を照らす', 'บ้านของขุนนางผู้ซื่อสัตย์ ส่องสะท้อนปัจจุบัน'],
  'tourapi:2864606': ['제5회 호러 홀로그램 페스티벌', '5th Horror Hologram Festival', '第5回 ホラーホログラムフェスティバル', 'เทศกาลโฮโลแกรมสยองขวัญ ครั้งที่ 5'],
  'stdfest:청주전통공예페스티벌-2026-09-17': ['청주전통공예페스티벌', 'Cheongju Traditional Crafts Festival', '清州伝統工芸フェスティバル', 'เทศกาลหัตถกรรมดั้งเดิมช็องจู'],
  'tourapi:4106719': ['달빛 음악공감', 'Music Together in the Moonlight', '月明かりの音楽交流', 'ร่วมสัมผัสดนตรีใต้แสงจันทร์'],
  'tourapi:1018469': ['서울국제작가축제', "Seoul International Writers’ Festival", 'ソウル国際作家フェスティバル', 'เทศกาลนักเขียนนานาชาติโซล'],
  'tourapi:3301271': ['청송백자축제', 'Cheongsong White Porcelain Festival', '青松白磁祭り', 'เทศกาลเครื่องเคลือบขาวช็องซง'],
  'stdfest:팔공산왕건축제-2026-09-11': ['팔공산 왕건축제', 'Palgongsan Wang Geon Festival', '八公山・王建祭り', 'เทศกาลวังกอนแห่งพัลกงซาน'],
  'kfes:3520705': ['노원수제맥주축제', 'Nowon Craft Beer Festival', '蘆原クラフトビール祭り', 'เทศกาลคราฟต์เบียร์โนวอน'],
  'tourapi:4098740': ['동대문구 북 페스티벌', 'Dongdaemun-gu Book Festival', '東大門区ブックフェスティバル', 'เทศกาลหนังสือเขตทงแดมุน'],
  'tourapi:2505657': ['서울무형문화축제', 'Seoul Intangible Cultural Heritage Festival', 'ソウル無形文化祭り', 'เทศกาลมรดกภูมิปัญญาทางวัฒนธรรมโซล'],
  'tourapi:1019773': ['제주레저힐링축제', 'Jeju Leisure and Wellness Festival', '済州レジャー・ヒーリング祭り', 'เทศกาลกิจกรรมพักผ่อนและสุขภาวะเชจู'],
  'tourapi:3113583': ['차 없는 잠수교 뚜벅뚜벅축제', 'Car-free Jamsugyo Walking Festival', '車のない潜水橋ウォーキングフェスティバル', 'เทศกาลเดินเล่นบนสะพานชัมซูปลอดรถ'],
  'manual:manus3-차없는-잠수교-뚜벅뚜벅축제-하반기-2026-09-06': ['차없는 잠수교 뚜벅뚜벅축제 하반기', 'Car-free Jamsugyo Walking Festival — Autumn', '車のない潜水橋ウォーキングフェスティバル・秋', 'เทศกาลเดินเล่นบนสะพานชัมซูปลอดรถ ฤดูใบไม้ร่วง'],
  'tourapi:2392105': ['달성 대구현대미술제  Movement: Flow-Ringer-Flux', 'Dalseong Daegu Contemporary Art Festival — Movement: Flow-Ringer-Flux', '達城・大邱現代美術祭 Movement: Flow-Ringer-Flux', 'เทศกาลศิลปะร่วมสมัยทัลซอง แทกู Movement: Flow-Ringer-Flux'],
}

type VerifiedFields = Pick<Festival, 'homepage' | 'hours' | 'program'> & {
  verifiedAt: string
  verificationSource: string
}
interface EditorialEntry {
  ids: readonly string[]
  name: string
  startDate: string
  endDate: string
  fields: VerifiedFields
}
const pohangSource = 'https://www.phcf.or.kr/phcf/festival_detail/view.do?festivalId=FST_FEST_2026_001'
const jamsugyoSource = 'https://www.seoul.go.kr/news/news_report.do?nttNo=464567&srchCtgry=471'
const ddpSource = 'https://news.seoul.go.kr/culture/archives/534071?listPage=1'
const writersSource = 'https://www.siwf.or.kr/ko/program/latest.do?type=isProgram'

/** Only these fields were checked, not every field on the festival. Recheck if dates
 * change: never carry operating hours or programmes into another season/edition. */
const details: readonly EditorialEntry[] = [
  {
    ids: ['stdfest:포항흥해국가유산야행-2026-06-12'], name: '포항 흥해 국가유산야행',
    startDate: '2026-09-11', endDate: '2026-09-12',
    fields: {
      homepage: pohangSource, hours: '16:00~22:00',
      program: '흥해읍성길 역사 투어, 미디어파사드, 암각화 전시, 한지 탁본 체험, 음악회와 지역 장터. 세부 일정은 공식 안내 참고.',
      verifiedAt: '2026-09-11', verificationSource: pohangSource,
    },
  },
  {
    ids: ['tourapi:3113583', 'manual:manus3-차없는-잠수교-뚜벅뚜벅축제-하반기-2026-09-06'],
    name: '차 없는 잠수교 뚜벅뚜벅축제', startDate: '2026-09-06', endDate: '2026-10-25',
    fields: {
      homepage: jamsugyoSource, hours: '매주 일요일 14:00~22:00 (평일·토요일 미운영)',
      program: '9/13 동아리 공연·체험, 9/20 가을 운동회, 9/27 세계 전통 공연, 10/4 미식로드, 10/11 미디어아트, 10/18 요가·명상. 일부 프로그램은 사전 신청 필요. 10/25 프로그램은 확인일 기준 미공개.',
      verifiedAt: '2026-09-11', verificationSource: jamsugyoSource,
    },
  },
  {
    ids: ['tourapi:2640874'], name: '서울라이트 DDP 가을', startDate: '2026-09-03', endDate: '2026-09-13',
    fields: {
      homepage: ddpSource, hours: '19:30~22:30',
      program: 'DAYBREAKER를 주제로 한 DDP 미디어아트. 백남준·유영국의 작품과 한글 노랫말을 바탕으로 한 영상, 레이저·라이브 퍼포먼스를 선보입니다.',
      verifiedAt: '2026-09-11', verificationSource: ddpSource,
    },
  },
  {
    ids: ['tourapi:1018469'], name: '서울국제작가축제', startDate: '2026-09-11', endDate: '2026-09-16',
    fields: {
      homepage: writersSource,
      program: '작가 대담, 글쓰기 워크숍, 기획전시와 서점 협업 프로그램. 9/11 개막대담은 아라아트센터에서 18시에 시작합니다. 프로그램마다 장소와 시간이 다르므로 공식 시간표에서 확인하세요.',
      verifiedAt: '2026-09-11', verificationSource: writersSource,
    },
  },
]

type EditorialLanguage = 'en' | 'ja' | 'th'
type EditorialTranslation = Translation & { program?: string; hours?: string }

// KOTA translations of the same verified facts above; not official translated copy.
const translatedDetails: Record<string, Record<EditorialLanguage, { program: string; hours?: string }>> = {
  [pohangSource]: {
    en: { program: 'Historic walks in Heunghae, projected media art, rock-carving exhibitions, paper rubbing activities, concerts and a local market. See the official guide for the schedule.' },
    ja: { program: '興海の歴史散策、建物への映像投影、岩刻画の展示、韓紙の拓本体験、音楽会、地元の市場。詳しい日程は公式案内をご確認ください。' },
    th: { program: 'เดินชมประวัติศาสตร์ฮึงแฮ ชมศิลปะฉายภาพ นิทรรศการภาพสลักหิน ทดลองทำภาพพิมพ์ถูบนกระดาษเกาหลี คอนเสิร์ต และตลาดท้องถิ่น ดูกำหนดการในประกาศทางการ' },
  },
  [jamsugyoSource]: {
    en: { hours: 'Sundays only, 14:00–22:00 (closed Monday–Saturday)', program: 'Sep 13: student club performances and activities. Sep 20: sports day. Sep 27: traditional performances from around the world. Oct 4: food festival. Oct 11: media art. Oct 18: yoga and meditation. Some activities require advance registration. The Oct 25 programme had not been announced as of Sep 11.' },
    ja: { hours: '毎週日曜日のみ 14:00～22:00（月～土曜日は開催なし）', program: '9/13 学生サークルの公演・体験、9/20 秋の運動会、9/27 世界の伝統公演、10/4 グルメイベント、10/11 メディアアート、10/18 ヨガ・瞑想。一部は事前申込が必要です。10/25の内容は9/11確認時点で未発表です。' },
    th: { hours: 'เฉพาะวันอาทิตย์ 14:00–22:00 (ไม่จัดวันจันทร์–เสาร์)', program: '13 ก.ย. การแสดงและกิจกรรมชมรมนักศึกษา; 20 ก.ย. วันกีฬา; 27 ก.ย. การแสดงพื้นเมืองนานาชาติ; 4 ต.ค. เทศกาลอาหาร; 11 ต.ค. มีเดียอาร์ต; 18 ต.ค. โยคะและสมาธิ บางกิจกรรมต้องลงทะเบียนล่วงหน้า รายการวันที่ 25 ต.ค. ยังไม่ประกาศ ณ วันที่ 11 ก.ย.' },
  },
  [ddpSource]: {
    en: { program: 'DDP media art on the theme DAYBREAKER, with video inspired by Nam June Paik, Yoo Youngkuk and Korean song lyrics, plus lasers and live performances.' },
    ja: { program: 'DAYBREAKERをテーマにしたDDPのメディアアート。ナム・ジュン・パイク、ユ・ヨングクの作品と韓国語の歌詞を題材にした映像、レーザー、ライブパフォーマンスを紹介します。' },
    th: { program: 'มีเดียอาร์ตที่ DDP ในธีม DAYBREAKER นำเสนอวิดีโอจากผลงานของนัมจุนไพก์ ยูยองกุก และเนื้อเพลงภาษาเกาหลี พร้อมเลเซอร์และการแสดงสด' },
  },
  [writersSource]: {
    en: { program: 'Author talks, writing workshops, an exhibition and events with bookshops. The opening talk starts at 18:00 on Sep 11 at Ara Art Center. Venues and times vary; check the official timetable.' },
    ja: { program: '作家対談、執筆ワークショップ、企画展、書店との共同企画。9/11の開幕対談はアラアートセンターで18時開始です。会場と時間は企画ごとに異なるため、公式時間表をご確認ください。' },
    th: { program: 'เสวนานักเขียน เวิร์กช็อปการเขียน นิทรรศการ และกิจกรรมร่วมกับร้านหนังสือ เสวนาเปิดงานเริ่ม 18:00 น. วันที่ 11 ก.ย. ที่ Ara Art Center สถานที่และเวลาแตกต่างกันในแต่ละกิจกรรม โปรดตรวจสอบตารางทางการ' },
  },
}

/** Read the reviewed translation when present, otherwise retain existing source text.
 * Numeric-only hours need no translation. Korean always uses the source field. */
export function editorialField(f: Festival, lang: string, field: 'program' | 'hours'): string | null | undefined {
  if (lang === 'ko') return f[field]
  const translated = f.translations?.find(t => t.langCode === lang) as EditorialTranslation | undefined
  return translated?.[field] || f[field]
}

function updateDetails(translations: Translation[] | undefined, entry: EditorialEntry, koreanName: string): EditorialTranslation[] {
  const result: EditorialTranslation[] = (translations ?? []).map(t => ({ ...t }))
  for (const langCode of ['en', 'ja', 'th'] as const) {
    const patch = translatedDetails[entry.fields.verificationSource]?.[langCode]
    if (!patch) continue
    const existing = result.find(t => t.langCode === langCode)
    if (existing) Object.assign(existing, patch)
    // Never invent a translated name merely to attach a translated programme.
    else result.push({ langCode, name: koreanName, ...patch })
  }
  return result
}

function updateNames(translations: Translation[] | undefined, values: [string, string, string, string]): Translation[] {
  const result = (translations ?? []).map(t => ({ ...t }))
  for (const [index, langCode] of ['en', 'ja', 'th'].entries()) {
    const existing = result.find(t => t.langCode === langCode)
    if (existing) existing.name = values[index + 1]!
    else result.push({ langCode, name: values[index + 1]! })
  }
  return result
}

/** Apply after date corrections and live overlays. Does not mutate cached input or DB. */
export function applyEditorial<T extends Festival>(items: T[]): T[] {
  return items.map(f => {
    if (!f.startDate.startsWith('2026-') || !f.endDate.startsWith('2026-')) return f
    const ids = [f.externalId, ...(f.sourceIds ?? [])]
    const named = ids.map(id => names[id]).find(n => n?.[0] === f.name)
    const entry = details.find(e => e.startDate === f.startDate && e.endDate === f.endDate &&
      (e.ids.some(id => ids.includes(id)) || e.name === f.name))
    if (!named && !entry) return f
    let translations = named ? updateNames(f.translations, named) : f.translations
    if (entry) translations = updateDetails(translations, entry, f.name)
    return { ...f, ...(entry?.fields ?? {}), translations }
  })
}
