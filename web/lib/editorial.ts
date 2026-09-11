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

type VerifiedFields = Pick<Festival, 'homepage' | 'hours' | 'program' | 'operatingWeekdays'> & {
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
  "ids": [
    "stdfest:팔공산왕건축제-2026-09-11"
  ],
  "name": "팔공산 왕건축제",
  "startDate": "2026-09-11",
  "endDate": "2026-09-12",
  "fields": {
    "homepage": "https://www.dong.daegu.kr/portal/saeol/news/view.do?mid=0201070000&newsEpctNo=10835",
    "hours": "9/11 17:30~21:00 · 9/12 12:00~21:00",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://www.dong.daegu.kr/portal/saeol/news/view.do?mid=0201070000&newsEpctNo=10835"
  }
},
{
  "ids": [
    "manual:gongju-library-book-fest-2026"
  ],
  "name": "공주시 도서관 책축제 : 전지적 독서시점",
  "startDate": "2026-09-12",
  "endDate": "2026-09-12",
  "fields": {
    "homepage": "https://www.gongjulib.go.kr/_prog/_board/?mode=V&no=9544&code=sub_080203&site_dvs_cd=kr&menu_dvs_cd=080203",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://www.gongjulib.go.kr/_prog/_board/?mode=V&no=9544&code=sub_080203&site_dvs_cd=kr&menu_dvs_cd=080203",
    "hours": "13:00~18:00",
    "program": "아트센터 고마 야외무대. 우천 시 백제체육관으로 장소가 변경됩니다."
  }
},
{
  "ids": [
    "manual:nonsan-hanok-wedding-2026"
  ],
  "name": "논산한옥마을 합동전통혼례",
  "startDate": "2026-09-12",
  "endDate": "2026-09-12",
  "fields": {
    "homepage": "https://www.nonsan.go.kr/kor/html/sub03/030101.html?mode=V&no=52a9ad09e8a05a9eb0c100d50481ffdf",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://www.nonsan.go.kr/kor/html/sub03/030101.html?mode=V&no=52a9ad09e8a05a9eb0c100d50481ffdf",
    "hours": "11:00 / 13:00",
    "program": "첨부 포스터의 접수기간은 2026년 6월 30일까지였습니다. 현재 참여 가능 여부는 공식 안내에서 확인하세요."
  }
},
{
  "ids": [
    "stdfest:동부창고페스타-2026-09-12"
  ],
  "name": "동부창고페스타",
  "startDate": "2026-09-12",
  "endDate": "2026-09-13",
  "fields": {
    "homepage": "https://dbchangko.org/sub.php?code=78&mode=view&no=336",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://dbchangko.org/sub.php?code=78&mode=view&no=336",
    "hours": "15:00~21:00"
  }
},
{
  "ids": [
    "stdfest:제3회허준인트로축제-2026-09-12"
  ],
  "name": "제3회 허준인트로 축제",
  "startDate": "2026-09-12",
  "endDate": "2026-09-12",
  "fields": {
    "homepage": "https://festival.seoul.go.kr/festival/main/festivalView.do?festacode=487",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://festival.seoul.go.kr/festival/main/festivalView.do?festacode=487",
    "hours": "12:00~18:00"
  }
},
{
  "ids": [
    "stdfest:당진삽교호드론라이트쇼-2026-04-04"
  ],
  "name": "당진 삽교호 드론 라이트 쇼 (하반기)",
  "startDate": "2026-09-12",
  "endDate": "2026-10-17",
  "fields": {
    "homepage": "https://www.dangjin.go.kr/prog/fstvlSchedule/tour/selectList.do",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://www.dangjin.go.kr/prog/fstvlSchedule/tour/selectList.do",
    "program": "하반기 행사는 9월 12일부터 10월 17일까지 매주 토요일에 열립니다. 기상 상황과 개별 회차 변경은 공식 안내를 확인하세요."
  }
},
{
  "ids": [
    "stdfest:계절이들리는원도심(2026버스킹있는날in제주시)-2026-04-01"
  ],
  "name": "계절이 들리는 원도심 (2026 버스킹 있는 날 in 제주시)",
  "startDate": "2026-04-01",
  "endDate": "2026-12-09",
  "fields": {
    "homepage": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014266",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014266",
    "hours": "11:30 / 12:30",
    "program": "매주 수요일에 진행합니다. 주말에는 열리지 않습니다."
  }
},
{
  "ids": [
    "stdfest:2026새연교주말문화공연금토새연쇼-2026-04-25"
  ],
  "name": "새연교 주말 문화공연 금토 새연쇼",
  "startDate": "2026-04-25",
  "endDate": "2026-10-31",
  "fields": {
    "homepage": "https://www.visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014207",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://www.visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014207",
    "hours": "19:00~20:40",
    "program": "금요일과 토요일 공연입니다. 기상 악화 시 취소될 수 있습니다."
  }
},
{
  "ids": [
    "stdfest:2026제주목관아야간개장-2026-05-01"
  ],
  "name": "제주목 관아 야간개장",
  "startDate": "2026-05-01",
  "endDate": "2026-10-31",
  "fields": {
    "homepage": "https://m.visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014416&menuId=DOM_000001718007000000",
    "verifiedAt": "2026-09-11",
    "verificationSource": "https://m.visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014416&menuId=DOM_000001718007000000",
    "hours": "18:00~21:00",
    "program": "야간산책은 수요일부터 일요일까지 운영합니다. 버스킹·특별공연·교대의식은 별도 지정일에 열립니다."
  }
},
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
      operatingWeekdays: [0], homepage: jamsugyoSource, hours: '매주 일요일 14:00~22:00 (평일·토요일 미운영)',
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

  "https://www.gongjulib.go.kr/_prog/_board/?mode=V&no=9544&code=sub_080203&site_dvs_cd=kr&menu_dvs_cd=080203": {
    "en": {
      "program": "At the outdoor stage of Art Center Goma. In case of rain, the venue moves to Baekje Gymnasium."
    },
    "ja": {
      "program": "アートセンター・コマの屋外ステージで開催。雨天時は百済体育館に会場を変更します。"
    },
    "th": {
      "program": "จัดที่เวทีกลางแจ้งของ Art Center Goma หากฝนตกจะย้ายไปจัดที่โรงยิมแพ็กเจ"
    }
  },
  "https://www.nonsan.go.kr/kor/html/sub03/030101.html?mode=V&no=52a9ad09e8a05a9eb0c100d50481ffdf": {
    "en": {
      "program": "The application period shown on this poster ended on June 30, 2026. Check the official notice for current participation availability."
    },
    "ja": {
      "program": "このポスターに記載された受付期間は2026年6月30日まででした。現在の参加可否は公式案内をご確認ください。"
    },
    "th": {
      "program": "ระยะเวลารับสมัครที่ระบุในโปสเตอร์นี้สิ้นสุดวันที่ 30 มิถุนายน 2026 โปรดตรวจสอบประกาศทางการว่ายังสามารถเข้าร่วมได้หรือไม่"
    }
  },
  "https://www.dangjin.go.kr/prog/fstvlSchedule/tour/selectList.do": {
    "en": {
      "program": "The autumn season runs every Saturday from September 12 to October 17. Check the official notices for weather-related updates and changes to individual shows."
    },
    "ja": {
      "program": "秋の開催期間は9月12日から10月17日までの毎週土曜日です。天候や各回の変更については公式案内をご確認ください。"
    },
    "th": {
      "program": "กิจกรรมช่วงครึ่งปีหลังจัดทุกวันเสาร์ ตั้งแต่วันที่ 12 กันยายนถึง 17 ตุลาคม โปรดตรวจสอบประกาศทางการเกี่ยวกับสภาพอากาศและการเปลี่ยนแปลงการแสดงแต่ละรอบ"
    }
  },
  "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014266": {
    "en": {
      "program": "Held every Wednesday. There are no weekend performances."
    },
    "ja": {
      "program": "毎週水曜日に開催します。週末の開催はありません。"
    },
    "th": {
      "program": "จัดทุกวันพุธ ไม่จัดในวันเสาร์และวันอาทิตย์"
    }
  },
  "https://www.visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014207": {
    "en": {
      "program": "Performances take place on Fridays and Saturdays. They may be cancelled in bad weather."
    },
    "ja": {
      "program": "金曜日と土曜日の公演です。悪天候時は中止になる場合があります。"
    },
    "th": {
      "program": "มีการแสดงในวันศุกร์และวันเสาร์ อาจยกเลิกหากสภาพอากาศไม่เอื้ออำนวย"
    }
  },
  "https://m.visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014416&menuId=DOM_000001718007000000": {
    "en": {
      "program": "Evening walks are available Wednesday through Sunday. Busking, special performances and the changing-of-the-guard ceremony take place on separately scheduled dates."
    },
    "ja": {
      "program": "夜の散策は水曜日から日曜日まで楽しめます。バスキング、特別公演、交代儀式は、それぞれ指定された日に開催します。"
    },
    "th": {
      "program": "เปิดให้เดินชมยามค่ำคืนตั้งแต่วันพุธถึงวันอาทิตย์ การแสดงเปิดหมวก การแสดงพิเศษ และพิธีเปลี่ยนเวรยามจัดตามวันที่กำหนดแยกต่างหาก"
    }
  }
,
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

/** IDs whose verified information must survive a change of source representative. */
export const editorialSourceIds = [...new Set([...Object.keys(names), ...details.flatMap(e => e.ids)])]

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
