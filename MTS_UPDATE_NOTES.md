# MTS 업데이트 노트

X-MAS MTS 기능의 버전별 변경 내역을 기록합니다.
기획·기능 정의·I/O·알고리즘 명세는 [`MTS.md`](./MTS.md)를 참조하세요.

---

## v1.1.0 (2026-04)

### 핵심 변경

MTS의 입력 모델이 **단일 Fixed sequence 텍스트 입력**에서 **Peptide Sequence Map (시각적 위치 선택)** 으로 전면 개편됨.

| 영역 | v1.0 | v1.1.0 |
|------|------|--------|
| Fixed 영역 지정 | `Fixed sequence` 텍스트 입력 (단일 연속 시퀀스만) | RNA 번역 펩타이드 위에서 ncAA 위치 클릭 → 다중 고정 세그먼트 자동 생성 |
| 가변 영역 정의 | 별도 없음 (전체 갭이 가변) | ncAA ± 좌우 노랑 범위 (드래그 조정) |
| 중복 감지 | Fixed/RNA 자동 감지 및 알림 | 불필요 (중복 개념 자체 소멸) |
| SA 탐색 공간 | 전체 시퀀스 길이 가변 | 갭 영역만 가변, 고정 세그먼트는 앵커 |
| 결과 재배열 | `rearrangeSequenceToMatch` 후처리 | `assembleTemplateResult` 템플릿 삽입 |

### 추가/변경된 파일

- **신규** `src/type/SequenceTemplate.ts` — 템플릿 타입 정의 (`PositionState`, `NcAAZone`, `FixedSegment`, `GapSegment`, `SequenceTemplate`)
- **신규** `src/lib/components/PeptideSequenceSelector.svelte` — 시각적 위치 선택 UI
- **확장** `src/lib/helper/mass_finder_helper.ts` — `calcByIonTypeWithTemplate`, `calcWithTemplate`, `assembleTemplateResult`, `getMultiSegmentFixedWeight` 추가 (+297 LOC)
- **분기** `src/lib/workers/mass_finder.worker.ts` — `sequenceTemplate` 유무에 따라 신/구 경로 분기
- **간소화** `src/routes/mts/+page.svelte` — Fixed sequence 입력·검증·overlap 로직 제거 (-217 LOC, +32 LOC 효과)

### 제거된 함수/UI

- `validateknownSequence()` — Fixed sequence 텍스트 검증
- `handleknownSequenceInput()` — 대문자 변환 onInput
- `calculatePeptideMass()` — RNA 변환 후 분자량 추정
- `checkSequenceOverlap()` — Fixed/RNA 4단계 중복 감지
- `rearrangeSequenceToMatch()` — 결과 시퀀스 재배열 후처리
- `<input id="essential-sequence">` — Fixed sequence 텍스트 입력 필드
- "Sequence Overlap Detected" 경고 알림

### 하위 호환

- `sequenceTemplate.gapTotalLength === 0` 또는 `sequenceTemplate` 미전달 시 기존 `calcByIonType` 경로로 폴백
- ncAA 미선택·RNA만 입력 시에는 v1.0 동작과 동일
- `MassFinderHelper.calc()` / `calcByIonType()` API는 그대로 유지

---

## v1.1.0 패치

### Patch 1 — Svelte 반응성 의존성 추적 누락

**파일**: `src/lib/components/PeptideSequenceSelector.svelte:281-282`

**증상**: ncAA를 클릭하면 레전드는 `Fixed (1)`처럼 정상 카운트가 표시되지만, 그 아래 "Fixed segments" 요약은 항상 `None`으로 고정되어 표시됨.

**근본 원인**: 반응형 선언이 함수 호출 내부 의존성을 추적하지 못함.

```javascript
$: segments = computeSegments();  // ❌ Bug
```

Svelte 4의 `$:` 반응성은 우변 표현식에 **직접 등장한 식별자만** 의존성으로 추적함. `computeSegments()` 내부에서 `positionStates`/`aminoSequence`를 읽더라도 컴파일러는 함수 호출 너머의 참조까지 트레이스하지 않음. 결과:
- `segments`는 컴포넌트 마운트 시 1회 평가 후 재실행되지 않음 → 빈 배열로 고정 → 디스플레이는 `None`
- `$: fixedCount = positionStates.filter(...)`는 `positionStates`를 직접 참조하므로 정상 업데이트 → 레전드는 옳게 보임 → 사용자가 일관성 깨짐을 발견

**수정**: 콤마 연산자로 의존성을 우변에 명시
```javascript
// 반응형 세그먼트 정보
// positionStates/aminoSequence를 직접 참조해야 Svelte가 의존성으로 추적함
$: segments = (positionStates, aminoSequence, computeSegments());  // ✅ Fix
```
콤마 연산자는 좌→우로 모든 식을 평가 후 마지막 값을 반환. 컴파일러가 `positionStates`/`aminoSequence`를 의존성으로 등록하므로 둘 중 하나의 값이 바뀔 때마다 `computeSegments()`가 재실행됨.

**영향 범위**: UI 표시(컴포넌트 내부의 `Fixed segments: ...` 텍스트) **만** 영향. `dispatchChange()`는 `computeSegments()`를 직접 호출하므로 부모로 전달되는 페이로드와 워커 계산 결과는 항상 정상이었음 — **계산은 처음부터 옳았고 컴포넌트 자체의 요약 표시만 stale 상태**였던 것.

### Patch 2 — `handleAminoClick` 호출 순서

**파일**: `src/lib/components/PeptideSequenceSelector.svelte:61-63`

**증상**: 인접한 ncAA를 연속 클릭할 때, 한 턴 늦게 노랑 영역이 갱신되는 시각적 지연. 첫 클릭 직후의 `positionStates`가 아직 축소되지 않은 노랑을 반영함.

**근본 원인**: 두 갱신 함수의 호출 순서가 반대였음.

```javascript
recalcPositionStates();  // ❌ 먼저 호출: zone의 축소 전 노랑으로 색상 그림
recalcYellowLimits();    //     그 후: 인접 zone과 충돌 시 노랑 카운트 줄임 (그러나 positionStates는 갱신 안 됨)
dispatchChange();        //     이 시점의 positionStates는 stale
```

`recalcYellowLimits()`는 zone의 leftYellow/rightYellow 카운트만 조정할 뿐 `positionStates` 배열을 다시 그리지 않음. 따라서 색상이 zone 최종 상태와 한 턴 어긋남.

**수정**: 순서 교환
```javascript
recalcYellowLimits();    // ✅ 먼저: 노랑 축소 결정
recalcPositionStates();  //     그 후: 최종 zone 기준 색상 갱신
dispatchChange();        //     일관된 상태로 dispatch
```

### 검증

```
$ ./node_modules/.bin/vite build
✓ 2.15s, exit 0
✓ Wrote site to "build"
```

사진 시나리오(`M N W R R M N W R R`, 위치 3·4·9에 ncAA, 위치 9의 우측 노랑 0)에서 위치 10(R)이 초록으로 남고 `Fixed segments: "R"` 정상 표시됨을 확인.
