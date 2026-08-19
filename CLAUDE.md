# KOTA 2 — 내 여행지 주변 축제

한국관광공사 × 카카오 2026 관광데이터 활용 공모전 출품작. **라이브: kota2.vercel.app**
⏰ 1차 심사 서류 **2026-09-21 마감**. 3인 팀, 은미님이 개발·배포 담당(CTO).

**왜 이렇게 만들었는지는 [README.md](README.md)에 있다. 코드를 고치기 전에 읽을 것** —
특히 「기존 구현에서 확인된 사실 (다시 발견하지 말 것)」. 거기 적힌 함정을 다시 밟지 말 것.

`../kota`는 **이전 구현**이다. 웹은 여기(kota2)가 유일한 현행이고, 저쪽 `web/`은 참고용 기록.

## 구조

- `web/` — **Next.js(App Router) + TypeScript + Tailwind.** 화면 전부. `app/[lang]/`로 4개 언어(ko/en/ja/th)
- `pipeline/` — 축제 데이터 수집·병합·번역 스크립트(tsx). 주 1회 GitHub Actions가 돌린다
- `supabase/` — DB 스키마 SQL. `schema.sql`이 본체(festivals·리뷰·찜·조회수), 나머지는 추가 테이블
- `docs/` — 팀 회의록·비즈니스 모델·커버리지 감사·도구 분담. **사람이 읽는 문서**
- `backend/` — **비어 있다.** 별도 API 서버 없음(Supabase가 그 자리)

## 명령어

```bash
cd web && npm run dev          # 개발 서버
cd web && npm run build        # 빌드 (배포 전 반드시 통과시킬 것)
cd web && npm run lint

cd pipeline && npm run all     # 수집→병합→보강→인기도→번역→export→Supabase 반영 (전체)
cd pipeline && npm run push    # 이미 만든 데이터만 Supabase에 밀어넣기
```

## 배포 — 헷갈리기 쉬운 자리

- **main에 push하면 Vercel이 자동 배포한다.** 이게 전부다
- ⛔ `.github/workflows/deploy.yml`(GitHub Pages)은 **2026-08-17에 죽었다.** 수동 실행해도 실패한다. 살리지 말 것
- ✅ `.github/workflows/sync.yml`(주간 데이터 갱신, 월 09:00 KST)은 **살아 있다**
- `trailingSlash: true`는 **건드리지 말 것** — 정적 시절 `/festivals/`로 색인된 주소가 전부 깨진다

## 데이터가 흐르는 길

```
공공 API 5소스 → pipeline(sync→merge→enrich→translate) → Supabase → 화면
```

- **화면이 읽는 건 Supabase다.** `web/data/festivals.json`은 파이프라인의 부산물이지 데이터 출처가 아니다
- 페이지는 ISR(`revalidate 3600`)로 굽는다. 축제는 주 1회만 바뀌니 방문자가 늘어도 DB 부하는 그대로
- 리뷰처럼 즉시 보여야 하는 것만 실시간 조회
- **축제 식별은 반드시 `externalId`.** 숫자 `id`는 환경마다 달라진다 (전에 카드↔상세 불일치 사고)

## 키 관리

- 로컬은 `web/.env.local`, 배포는 Vercel 환경변수, 파이프라인은 GitHub Secrets
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`는 **브라우저에 노출되는 게 정상**이다(접근 통제는 RLS가 함)
- `SUPABASE_SECRET_KEY`는 **저장소에 절대 두지 말 것.** 쓰는 쪽(파이프라인)만 GitHub Secrets에서 받는다

## 손대지 말 것

- `web/AGENTS.md` — Next.js가 `next dev` 돌 때마다 자동으로 다시 쓴다. 지워도 되살아난다
- `web/CLAUDE.md` — 위 AGENTS.md를 가리키는 한 줄짜리. 이 파일과 별개
