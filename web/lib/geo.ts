// 위치 요청 — 거절당한 뒤에 벌어지는 일을 다룬다.
//
// 브라우저의 위치 권한은 세 가지 상태다. 그런데 getCurrentPosition은 뒤의 둘을 구분해
// 주지 않는다 — 둘 다 그냥 '실패'로 온다.
//   prompt  물어본 적 없음        → 부르면 허용창이 뜬다
//   granted 허용함                → 바로 좌표가 온다
//   denied  거절했거나 창을 닫음  → 부르면 창 없이 즉시 실패한다
//
// 문제가 여기서 생겼다(2026-08-22 은미님 제보). 처음엔 허용창이 떴는데 그걸 무시하자
// 크롬이 '거절'로 기억했고, 그 뒤로는 버튼을 눌러도 창이 안 뜬다. 화면은 '위치 허용하기'
// 버튼을 계속 보여주지만 그 버튼은 이제 아무것도 못 한다 — 눌러도 즉시 실패하고 같은
// 화면으로 돌아오니, 쓰는 사람 눈에는 '아무 반응이 없는' 것이다.
//
// 그래서 두 가지를 한다.
//   1) 부르기 전에 permissions API로 상태를 본다. denied면 헛된 버튼 대신 푸는 방법을 띄운다.
//   2) 실패 사유를 코드로 갈라 받는다. 거절인지, 위치를 못 잡은 건지, 시간이 초과된 건지
//      쓰는 사람에게는 완전히 다른 이야기다.

export type GeoOutcome =
  | { k: 'ok'; coords: { lat: number; lng: number } }
  /** 브라우저가 막았다 — 다시 눌러도 창이 안 뜬다. 설정에서 풀어야 한다 */
  | { k: 'blocked' }
  /** 기기가 위치를 못 잡았다(실내·GPS 꺼짐 등) — 다시 시도할 만하다 */
  | { k: 'unavailable' }
  /** 시간 초과 — 다시 시도할 만하다 */
  | { k: 'timeout' }
  | { k: 'unsupported' }

/**
 * 지금 권한이 'denied'로 굳어 있는지 미리 본다.
 *
 * permissions API가 없는 브라우저(구형 사파리 등)에서는 알 수 없으므로 null을 준다.
 * 그때는 그냥 불러 보고 실패 코드로 판단한다.
 */
export async function permissionState(): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null
  try {
    const s = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return s.state
  } catch {
    return null
  }
}

export async function requestPosition(timeoutMs = 10_000): Promise<GeoOutcome> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return { k: 'unsupported' }

  // 이미 막혀 있으면 부르지 않는다. 불러 봐야 창은 안 뜨고 실패만 한다.
  if ((await permissionState()) === 'denied') return { k: 'blocked' }

  return new Promise<GeoOutcome>((resolve) => {
    let done = false
    const finish = (o: GeoOutcome) => {
      if (done) return
      done = true
      resolve(o)
    }

    // 안전장치 — 허용창을 열어둔 채 아무것도 안 하면 콜백이 영영 안 오는 경우가 있다.
    // 그대로 두면 '위치를 확인하는 중…'에서 화면이 멈춘다.
    const guard = setTimeout(() => finish({ k: 'timeout' }), timeoutMs + 2_000)

    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(guard)
        finish({ k: 'ok', coords: { lat: p.coords.latitude, lng: p.coords.longitude } })
      },
      (err) => {
        clearTimeout(guard)
        if (err.code === err.PERMISSION_DENIED) finish({ k: 'blocked' })
        else if (err.code === err.POSITION_UNAVAILABLE) finish({ k: 'unavailable' })
        else finish({ k: 'timeout' })
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300_000 },
    )
  })
}
