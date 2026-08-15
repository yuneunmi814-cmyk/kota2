import Icon from './Icon'

// 정적 지도 — 서버·API 키·외부 JS 없이 OSM 타일 <img> 9장 + 핀 하나.
//
// 왜 이렇게: 정적 사이트라 서버 키를 숨길 곳이 없다. 카카오/네이버 지도 SDK는 JS 키가
// HTML에 노출되고 도메인 등록이 필요하며, 지도 한 장 보여주자고 200KB 스크립트를 얹는다.
// OSM 타일은 키가 없고, 타일 URL은 위경도→타일번호 공식 한 줄이면 나온다.
// 저작권 표기(© OpenStreetMap contributors)는 필수라 항상 붙인다.

const Z = 14 // 시가지 축척 — 축제장 주변 도로·지명이 보이는 정도
const TILE = 256

function tileXY(lat: number, lng: number, z: number) {
  const n = 2 ** z
  const x = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

export default function StaticMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const { x, y } = tileXY(lat, lng, Z)
  const cx = Math.floor(x)
  const cy = Math.floor(y)
  // 중심 타일 안에서 핀이 놓일 픽셀 오프셋
  const px = Math.round((x - cx) * TILE)
  const py = Math.round((y - cy) * TILE)
  // 5×5 그리드(1280px)를 중심 타일이 정중앙에 오게 깔고, 컨테이너(최대 ~730×410)를 잘라 보여준다.
  // 3×3(768px)이면 핀이 타일 가장자리에 있을 때 한쪽이 빈다 — 실측으로 확인.
  const R = 2
  const tiles: { dx: number; dy: number }[] = []
  for (let dy = -R; dy <= R; dy += 1) for (let dx = -R; dx <= R; dx += 1) tiles.push({ dx, dy })

  const W = (2 * R + 1) * TILE
  const H = (2 * R + 1) * TILE
  // 핀의 그리드 내 절대 좌표 = 중심 타일 좌상단 + 오프셋
  const pinX = R * TILE + px
  const pinY = R * TILE + py

  return (
    <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden">
        {/* 그리드를 컨테이너 중앙에 — 핀이 정중앙 */}
        <div
          className="absolute"
          style={{ width: W, height: H, left: `calc(50% - ${pinX}px)`, top: `calc(50% - ${pinY}px)` }}
        >
          {tiles.map(({ dx, dy }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${dx},${dy}`}
              src={`https://tile.openstreetmap.org/${Z}/${cx + dx}/${cy + dy}.png`}
              alt=""
              width={TILE}
              height={TILE}
              loading="lazy"
              className="absolute"
              style={{ left: (dx + R) * TILE, top: (dy + R) * TILE }}
            />
          ))}
        </div>
        {/* 핀 — 짱구 빨강, 진갈 윤곽 */}
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-r drop-shadow-[0_2px_0_var(--color-ink)]"
          aria-hidden
        >
          <Icon name="pin" size={34} strokeWidth={2.4} />
        </span>
      </div>
      <figcaption className="flex items-center justify-between gap-3 px-3 py-1.5 text-[11px] text-hint">
        <span className="truncate">{label}</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="shrink-0 hover:underline">
          © OpenStreetMap contributors
        </a>
      </figcaption>
    </figure>
  )
}
