# pipeline — 축제 데이터 파이프라인

DB 없이 JSON으로만 돈다. 정적 사이트(web/)는 빌드 시 `data/festivals.json` 하나만 읽으므로
Postgres·Render 같은 서버가 필요 없다 → 유료 전환도, 콜드 스타트도, 만료 걱정도 사라진다.

## 소스 (우선순위 순)

1. **kfes** — 한국관광공사 구석구석 축제 포털. 615건 전부 이미지·좌표·산문 개요·요금·SNS 보유.
   이전 구현은 detailCommon2로 우회하다 이미지를 놓치고, 이름 중복 판정으로 413건을 버렸다.
2. **TourAPI searchFestival2** — 공식 API. 이미지 100%.
3. **문체부 연간 개최계획(MCST)** — 290건, 이미지 8%. kfes/TourAPI로 이미지 보강.
4. **전국문화축제표준데이터(STDFEST)** — 204건, 이미지 13%.
5. **수기(manual.json)**

## 병합 규칙
- 식별자는 `externalId` (예: `kfes:4098571`, `tourapi:3481597`). 숫자 id는 쓰지 않는다.
- 같은 축제가 여러 소스에 있으면 **정보가 풍부한 쪽이 이긴다**: 이미지·좌표·개요는 있는 값을 채운다.
- 매칭: ① kfes.cmsCntntsId == tourapi.contentid ② 이름 정규화 + 시도 일치 + 날짜 겹침

## 실행
    npm run sync        # 5소스 수집 → data/raw/*.json
    npm run merge       # 병합·정규화 → data/festivals.json (web/data로 복사)
    npm run translate   # 번역 엔진(en/ja/th)
    npm run all         # 위 순서 전부
