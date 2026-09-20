// IndexNow — 새로 생기거나 바뀐 주소를 검색엔진에 바로 알린다(네이버·빙이 받는다. 구글은 안 받는다).
//
// 사용: node scripts/indexnow.mjs            → 사이트맵의 모든 주소
//       node scripts/indexnow.mjs /ko/ /en/  → 적어 준 경로만
//
// 키는 비밀이 아니다. public/<키>.txt 로 공개돼 있어야 "이 사이트 주인이 보낸 것"이 증명된다.
const HOST = 'ko-ta.co.kr'
const KEY = 'f644e39e7ea5c097d586834fa2afc562'
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow']

const args = process.argv.slice(2)
let urls
if (args.length) urls = args.map((p) => `https://${HOST}${p.startsWith('/') ? p : `/${p}`}`)
else {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text()
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}
console.log(`주소 ${urls.length}개`)
for (const endpoint of ENDPOINTS) {
  for (let i = 0; i < urls.length; i += 10000) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(i, i + 10000) }),
    })
    // 200·202 = 받음. 403 = 키 파일을 못 읽음(배포 전이거나 주소가 다름). 422 = 주소가 host와 안 맞음.
    console.log(`${endpoint} → ${res.status} ${res.statusText}`)
  }
}
