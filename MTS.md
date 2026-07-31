# X-MAS (MTS) - 사용자 스토리 및 로직 문서

## 개요
X-MAS의 MTS (Mass to Sequence) 기능은 감지된 분자량으로부터 가능한 아미노산 시퀀스를 예측하는 생화학 분석 도구입니다. 시뮬레이티드 어닐링 알고리즘을 사용하여 최적의 아미노산 조합을 찾아냅니다.

---

> 버전별 변경 이력은 [`MTS_UPDATE_NOTES.md`](./MTS_UPDATE_NOTES.md) 참조.

---

## 주요 사용자 스토리

### 1. 기본 분자량 분석
**As a** 생화학 연구자  
**I want to** 감지된 분자량을 입력하여 가능한 아미노산 시퀀스를 찾고 싶다  
**So that** 질량 분석 데이터로부터 단백질 구조를 추정할 수 있다

**Acceptance Criteria:**
- 감지된 분자량(Detected Mass)을 필수로 입력해야 함
- 시뮬레이티드 어닐링 알고리즘으로 최적해 탐색
- 분자량 정확도 기준으로 결과 정렬
- 최대 100개의 결과 제공

### 2. Peptide Sequence Map — ncAA 위치 시각 지정
**As a** 펩타이드 합성 연구자
**I want to** RNA 번역 펩타이드 위에서 비표준 아미노산(ncAA) 위치를 마우스로 직접 지정하고, 주변 가변 영역의 범위를 시각적으로 조정하고 싶다
**So that** 다중 ncAA가 산재한 펩타이드를 정확한 고정/가변 구획으로 SA 탐색에 넘길 수 있다

**Acceptance Criteria:**
- RNA 입력 → 자동 번역된 아미노산 시퀀스가 타일 그리드로 시각화됨
- 각 타일은 3가지 상태: 🟢 Fixed (불변) / 🔴 ncAA (사용자 지정) / 🟡 Variable (SA 탐색)
- 타일 클릭으로 ncAA 토글 (초록 ↔ 빨강)
- ncAA 지정 시 좌우 기본 3칸씩 노랑 영역 자동 생성 (`DEFAULT_YELLOW_COUNT = 3`)
- 노랑 경계 타일(점선 표시)을 마우스/터치 드래그로 가변 범위 1칸 단위 조정
- 인접 ncAA zone의 노랑 영역끼리 자동 충돌 방지 (`getMaxYellowLeft/Right`)
- 범례: Fixed/ncAA/Variable 카운트 실시간 표시
- 세그먼트 요약: Fixed 세그먼트 시퀀스(`"MW", "ST"`), Variable 갭 길이 표시
- ncAA 미지정 시 컴포넌트는 빈 zone을 dispatch → 워커는 단일 시퀀스 경로로 폴백
- 다중 비연속 고정 세그먼트를 자연스럽게 지원 (조각조각 알려진 시퀀스 패턴)

### 3. RNA 기반 참조 시퀀스 활용
**As a** 분자생물학 연구자  
**I want to** RNA 시퀀스를 입력하여 유사한 아미노산 시퀀스를 찾고 싶다  
**So that** 전사 후 번역 과정을 고려한 분석을 할 수 있다

**Acceptance Criteria:**
- RNA 시퀀스는 A, U, G, C만 허용
- 3의 배수 길이만 유효 (코돈 단위)
- 자동으로 아미노산 시퀀스 변환
- Stop 코돈에서 자동 중단
- 참조 시퀀스 활성화 알림 표시

### 4. 포밀레이션 및 이온 부가물 처리
**As a** 질량분석 전문가
**I want to** 포밀레이션과 이온 부가물을 고려한 분석을 하고 싶다
**So that** 실제 질량분석 조건을 반영한 정확한 결과를 얻을 수 있다

**Acceptance Criteria:**
- 포밀레이션: yes/no 선택 가능 (unknown 옵션 제거됨)
- 9가지 이온 부가물 지원 (H+, Na+, K+ 등)
- 포밀레이션은 결과 시퀀스 맨 앞에 'f'로 표시
- 이온 무게는 최종 분자량에 추가

### 5. 사용자 정의 아미노산 선택
**As a** 연구자  
**I want to** 특정 아미노산만 사용하거나 비표준 아미노산(ncAA)을 추가하고 싶다  
**So that** 특수한 실험 조건에 맞는 분석을 할 수 있다

**Acceptance Criteria:**
- 20개 표준 아미노산 개별 선택/해제 가능
- 6개 ncAA (B, J, O, U, X, Z) 지원
- ncAA는 monoisotopic weight와 molecular weight 직접 입력
- 선택된 아미노산만 알고리즘에서 사용

### 6. Template 기반 다중 고정 세그먼트 계산
**As a** 분석가
**I want to** 펩타이드 중간중간에 산재한 ncAA 영역만 SA로 탐색하고, 나머지 알려진 영역은 RNA 번역 결과 그대로 고정하고 싶다
**So that** 펩타이드의 고정 영역과 가변 영역을 분리해 SA 탐색 공간을 정확히 좁힐 수 있다

**Acceptance Criteria:**
- 다중 Fixed 세그먼트 사이에 다중 Gap 세그먼트가 끼어드는 임의 패턴 지원
- 각 갭의 SA 결과는 원래 갭 크기 비율로 자동 분배 (`assembleTemplateResult` — 마지막 갭이 반올림 나머지 흡수)
- 최종 결과는 전체 시퀀스(고정+갭) 형태로 재조립되어 표시
- 갭이 없으면(`gapTotalLength === 0`) 원본 시퀀스를 그대로 결과로 반환
- 고정 질량이 목표를 초과하면(`adjustedTarget <= 1.0`) 갭 없이 고정 세그먼트만 반환
- 다중 세그먼트의 펩타이드 결합 수에 정확히 맞는 물 증발량 보정 (`addWeight = WATER × (gapLen - 1 + numFixedSegments)`)
- 위치 인덱스 기반으로 fixed/gap을 정의하므로 시퀀스 문자열 간 중복 처리가 불필요

---

## Input / Output 명세

### 입력 (Input)

`MassFinderHelper.calcByIonType()` 또는 `calcByIonTypeWithTemplate()`이 받는 파라미터 (Web Worker `postMessage` 페이로드 기준):

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `detectedMass` | `number` | ✅ | 감지된 분자량 (Da) |
| `proteinSequence` | `string` | optional | RNA 시퀀스 (`A`/`U`/`G`/`C`, 3의 배수 길이). 단일 시퀀스 경로의 SA 참조용 |
| `sequenceTemplate` | `SequenceTemplate \| null` | optional | Peptide Sequence Map 결과. `gapTotalLength > 0`이면 template 경로 활성 |
| `formylation` | `'yes' \| 'no'` | ✅ | N-말단 포밀레이션 적용 여부 |
| `adduct` | `IonType` | ✅ | 이온 부가물 (`'+H'`, `'+Na'`, `'+K'`, `'+NH4'`, `'-H'` 등 9종) |
| `monoisotopicMap` | `{ [aa]: number }` | ✅ | 활성 아미노산의 monoisotopic 분자량 (사용자 선택분만) |
| `molecularMap` | `{ [aa]: number }` | ✅ | 위와 대응되는 평균 분자량 |
| `initialTemperature` | `number` | ✅ | SA 시작 온도 (Standard 10,000 / Think 50,000 / Deep think 100,000) |
| `absoluteTemperature` | `number` | ✅ | SA 종료 최소 온도 (Standard 0.001 / Think 0.00001 / Deep think 0.000001) |
| `saIterations` | `number` | ✅ | SA 반복 횟수 (모든 모드 100 고정) |

UI 레이어에서 추가로 다루는 정의:
- `selectedMonoisotopicAminos: AminoMap` — 표준 20개 아미노산 활성화 상태
- `fullNcAA: NcAAMap` — 비표준 아미노산 (B/J/O/U/X/Z) 사용자 정의 분자량
- `maxResultCount: 20 | 50 | 100` — 화면 표시 결과 개수 (실시간 변경 가능)

### 출력 (Output)

`MassFinderHelper`가 반환하는 결과는 `AminoModel[]`이며, 워커가 `{ type: 'success', solutions: AminoModel[] }`로 메인 스레드에 회신.

| 필드 | 타입 | 설명 |
|------|------|------|
| `code` | `string` | 추정 아미노산 시퀀스. 포밀레이션 시 `'f'` 접두 (예: `"fMWSHPQ"`) |
| `weight` | `number` | Monoisotopic weight (Da, 이온 보정 포함) |
| `molecularWeight` | `number` | Molecular weight (Da) |
| `similarity` | `number` | 분자량 정확도 (%) — `targetMass`와 `weight`의 일치도 |
| `sequenceSimilarity` | `number` | 참조 시퀀스 대비 아미노산 개수 일치도 (%) |
| `formyType` | `FormyType` | `'yes'` / `'no'` |
| `ionType` | `IonType` | 적용된 이온 부가물 |
| `essentialSeq` | `string` | 고정 시퀀스 표시. 다중 세그먼트는 `~`로 구분 (예: `"MW~ST"`) |

UI는 `bestSolutions = allSolutions.slice(0, maxResultCount)`로 사용자 선택 개수만큼 표시. 결과 테이블과 Excel 다운로드 모두 동일 데이터 구조 사용. 에러 시 워커는 `{ type: 'error', error: string }`을 회신.

### 라우팅 결정

```
Worker 분기:
  if (sequenceTemplate && sequenceTemplate.gapTotalLength > 0)
    → calcByIonTypeWithTemplate (다중 고정 세그먼트 + 갭, 갭 영역만 SA 탐색)
  else
    → calcByIonType (단일 시퀀스, proteinSequence 참조)
```

상세 알고리즘은 후술하는 "Peptide Sequence Map & Template 기반 계산", "분자량 계산 로직" 섹션 참조.

---

## 핵심 로직 조건

### 입력 검증 로직

#### 1. Detected Mass 검증
```typescript
// 조건: 필수 입력값
if (detectedMass === null) {
    alert('Please Input Detected Mass');
    return false;
}
```

#### 2. SequenceTemplate 보장 조건

`PeptideSequenceSelector`가 컴포넌트 수준에서 다음을 보장하므로 별도 텍스트 검증이 불필요:
- 모든 타일은 RNA 번역 결과(`convertRnaToAminoAcids` 산출물)에서만 생성 → 유효 아미노산만 존재
- ncAA zone의 노랑 범위는 zone 추가/드래그 시 `getMaxYellowLeft/Right`로 zone 간 충돌 자동 방지
- 부모로 dispatch되는 `fixedSegments`/`gapSegments`는 정의상 well-formed (start index 정렬, 길이 일치, 갭 사이에 fixed 끼워짐)
- `gapTotalLength = Σ gapSegments[i].length`가 워커 라우팅 분기 키

#### 3. RNA Sequence 검증
```typescript
// 조건: A,U,G,C만 허용 + 3의 배수 길이
function validatePeptideSequence() {
    if (proteinSequence === '') return true; // 빈 값은 유효
    
    const validRnaBases = ['A', 'U', 'G', 'C'];
    for (let char of proteinSequence) {
        if (!validRnaBases.includes(char)) return false;
    }
    
    if (proteinSequence.length % 3 !== 0) {
        alert('RNA sequence length must be a multiple of 3 (codon units)');
        return false;
    }
    return true;
}
```

### RNA → 아미노산 변환 로직

```typescript
// 조건: 3개씩 코돈 분할, Stop 코돈에서 중단
function convertRnaToAminoAcids(rnaSequence) {
    const codons = rnaSequence.match(/.{1,3}/g) || [];
    let aminoSequence = '';
    
    for (const codon of codons) {
        if (codon.length === 3) {
            const amino = codonTableRtoS[codon];
            if (amino && amino !== '[Stop]') {
                aminoSequence += amino;
            } else if (amino === '[Stop]') {
                break; // Stop 코돈에서 중단
            }
        }
    }
    return aminoSequence;
}
```

---

## SA Mode Selector (알고리즘 강도 선택)

**파일**: `src/lib/components/SAModeSelector.svelte`, `src/routes/mts/+page.svelte`

**개요**: 사용자가 계산 탐색 범위를 선택할 수 있도록 3가지 모드를 제공합니다. 초기 온도와 최소 온도를 조정하여 탐색 공간의 크기를 제어합니다.

### 모드별 파라미터

| 모드 | 초기 온도 | 최소 온도 | 반복 횟수 | 설명 |
|------|-----------|-----------|-----------|------|
| **Standard** | 10,000 | 0.001 | 100 | 균형잡힌 계산, 적당한 탐색 범위 |
| **Think** | 50,000 | 0.00001 | 100 | 철저한 계산, 광범위한 탐색 |
| **Deep think** | 100,000 | 0.000001 | 100 | 고급 추론, 매우 깊은 탐색 |

**특징**:
- **기본값**: Standard 모드
- **LocalStorage**: 사용자 선택이 자동 저장되어 다음 방문 시 유지
- **반복 횟수**: 모든 모드에서 동일 (100회)
- **탐색 제어**: 초기 온도와 최소 온도로 탐색 범위 조절

**UI 구현**:
```svelte
<div class="sa-mode-options">
  {#each Object.entries(saConfigs) as [mode, config]}
    <div class="form-check">
      <input
        type="radio"
        name="saMode"
        value={mode}
        bind:group={selectedMode}
        on:change={handleModeChange}
      />
      <label>
        <div class="mode-title">{config.label}</div>
        <small class="mode-description">{config.description}</small>
      </label>
    </div>
  {/each}
</div>
```

**알고리즘 적용**:
```typescript
// SAModeSelector 컴포넌트에서 이벤트 수신
function handleSAModeChange(event) {
  const config = event.detail; // { initialTemperature, absoluteTemperature, saIterations }
  saIterations = config.saIterations;
  initialTemperature = config.initialTemperature;
  absoluteTemperature = config.absoluteTemperature;
}
```

**파라미터 설명**:
- **initialTemperature**: 시뮬레이티드 어닐링 시작 온도 (높을수록 초기에 다양한 해 탐색)
- **absoluteTemperature**: 종료 최소 온도 (낮을수록 더 세밀하게 탐색)
- **saIterations**: 반복 횟수 (모든 모드 100회 고정)

---

## 시뮬레이티드 어닐링 알고리즘 로직

### 1. 초기화 조건
```typescript
// 알고리즘 파라미터 (SA Mode에 따라 동적으로 설정)
// Standard 모드 예시:
const saIterations = 100;           // 반복 횟수 (모든 모드 고정)
const initialTemperature = 10000;   // 초기 온도 (Standard: 10,000 / Think: 50,000 / Deep think: 100,000)
const absoluteTemperature = 0.001;  // 최소 온도 (Standard: 0.001 / Think: 0.00001 / Deep think: 0.000001)
const coolingRate = 0.99;           // 냉각률 (고정값)
```

**주요 파라미터 역할**:
- **saIterations**: 알고리즘 반복 횟수 (모든 모드에서 100회로 고정)
- **initialTemperature**: 탐색 시작 온도 (높을수록 초기 단계에서 더 넓은 범위 탐색)
- **absoluteTemperature**: 탐색 종료 온도 (낮을수록 더 세밀한 최적화)
- **coolingRate**: 온도 감소율 (각 반복마다 온도 × 0.99)

### 2. 초기 솔루션 생성 로직
```typescript
// 조건: RNA 시퀀스가 있으면 protein-based, 없으면 random
let currentSolution = proteinSequence ? 
    this.proteinBasedSolution(proteinSequence, targetMass) : 
    this.randomSolution(targetMass);
```

#### Peptide-based Solution 로직
```typescript
// 조건: 선택된 아미노산만 사용, 원본 시퀀스 최대한 보존
static proteinBasedSolution(inputSequence: string, targetMass: number) {
    const isRnaSequence = /^[AUGC]+$/.test(inputSequence) && inputSequence.length % 3 === 0;
    const aminoSequence = isRnaSequence ? this.convertRnaToAminoAcids(inputSequence) : inputSequence;
    
    // 선택된 아미노산만 필터링
    const availableAminos = Object.keys(dataMap);
    const solution = [];
    
    // 초기 시퀀스에서 사용 가능한 아미노산만 추가
    for (const amino of aminoSequence.split('')) {
        if (dataMap[amino]) solution.push(amino);
    }
    
    // 목표 질량에 맞게 조정
    // ... 질량 기반 추가/제거 로직
}
```

#### Random Solution 로직
```typescript
// 조건: 가중치 기반 다양성 확보
static randomSolution(targetMass: number) {
    const aminoKeys = Object.keys(dataMap);
    if (aminoKeys.length === 0) return [];
    
    const randomSeed = Math.random();
    
    // 30% 확률로 가벼운 아미노산 (<120) 우선 선택
    // 30% 확률로 중간 무게 아미노산 (120-150) 우선 선택  
    // 40% 확률로 완전 랜덤 선택
}
```

### 3. Neighbor Solution 생성 로직
```typescript
// 조건: 교체만 수행 (추가/제거 없음)
static neighborSolution(currentSolution: string[], targetMass: number) {
    const neighbor = [...currentSolution];

    if (neighbor.length === 0) return neighbor;

    // 랜덤 위치 선택
    const randomIndex = Math.floor(Math.random() * neighbor.length);

    // 참조 시퀀스가 있으면 90% 확률로 참조 시퀀스에서 선택
    if (referenceSequence && Math.random() < 0.9) {
        // 참조 시퀀스의 해당 위치 아미노산으로 교체
        if (randomIndex < referenceSequence.length) {
            neighbor[randomIndex] = referenceSequence[randomIndex];
        } else {
            // 참조 시퀀스 범위를 벗어나면 랜덤 선택
            neighbor[randomIndex] = selectRandomAmino();
        }
    } else {
        // 10% 확률로 완전 랜덤 아미노산 선택
        neighbor[randomIndex] = selectRandomAmino();
    }

    return neighbor;
}
```

### 4. 평가 함수 로직
```typescript
// 조건: 참조 시퀀스 유무에 따른 복합 평가
static evaluate(solution: string[], targetMass: number) {
    const massDifference = Math.abs(targetMass - calculatedMass);

    if (referenceSequence) {
        // 참조 시퀀스가 있는 경우: 분자량 95% + 시퀀스 유사도 5%
        const sequenceSimilarity = calculateSequenceSimilarity(current, reference);
        const normalizedMassDiff = massDifference / targetMass;
        const sequenceDifference = (100 - sequenceSimilarity) / 100;
        return normalizedMassDiff * 0.95 + sequenceDifference * 0.05;
    } else {
        // 참조 시퀀스가 없는 경우: 분자량 차이만 고려
        return massDifference;
    }
}
```

### 5. 시퀀스 유사도 계산 로직
```typescript
// 조건: 정확한 아미노산 개수 매칭
export function calculateSequenceSimilarity(resultSequence: string, referenceSequence: string) {
    // 포밀화 제거
    const cleanResult = resultSequence.replace(/^f/, '');
    const cleanReference = referenceSequence.replace(/^f/, '');
    
    // 아미노산 개수 카운트
    const getAminoCount = (sequence) => {
        const count = {};
        for (const amino of sequence) {
            count[amino] = (count[amino] || 0) + 1;
        }
        return count;
    };
    
    const resultCount = getAminoCount(cleanResult);
    const referenceCount = getAminoCount(cleanReference);
    
    // 매칭되는 개수 계산 (최솟값 기준)
    let matchedCount = 0;
    let totalReferenceCount = 0;
    
    for (const [amino, refCount] of Object.entries(referenceCount)) {
        const resCount = resultCount[amino] || 0;
        matchedCount += Math.min(refCount, resCount);
        totalReferenceCount += refCount;
    }
    
    return (matchedCount / totalReferenceCount) * 100;
}
```

---

## Peptide Sequence Map & Template 기반 계산

### 1. SequenceTemplate 타입 시스템

**파일**: `src/type/SequenceTemplate.ts`

```typescript
// 각 위치의 시각적 상태
export type PositionState = 'green' | 'yellow' | 'red';

// 단일 ncAA zone (빨강 1칸 + 좌우 노랑 범위)
export interface NcAAZone {
    ncaaIndex: number;         // 빨강 위치
    leftYellowCount: number;   // 좌측 노랑 칸 수 (기본 3, 최소 0)
    rightYellowCount: number;  // 우측 노랑 칸 수 (기본 3, 최소 0)
}

// 연속 고정 세그먼트 (초록 영역)
export interface FixedSegment {
    startIndex: number;
    sequence: string;          // 예: "MW", "ST"
}

// 연속 가변 갭 (빨강+노랑)
export interface GapSegment {
    startIndex: number;
    length: number;
    originalSequence: string;  // 참조용 원본 아미노산
}

// 전체 템플릿 (워커로 전달되는 페이로드)
export interface SequenceTemplate {
    fullSequence: string;
    positionStates: PositionState[];
    fixedSegments: FixedSegment[];
    gapSegments: GapSegment[];
    totalLength: number;
    gapTotalLength: number;    // 라우팅 분기 키 (>0이면 template 경로)
}
```

### 2. PeptideSequenceSelector 컴포넌트

**파일**: `src/lib/components/PeptideSequenceSelector.svelte`

#### 2.1. 상태 모델
```javascript
let positionStates = [];        // PositionState[] — 색상
let ncaaZones = [];             // NcAAZone[] — 사용자 지정 zone (인덱스 오름차순 정렬)
const DEFAULT_YELLOW_COUNT = 3; // 신규 zone의 좌우 기본 노랑 칸 수
```

#### 2.2. 클릭 핸들러 흐름
```javascript
function handleAminoClick(index) {
    // 1) 기존 zone이면 제거, 없으면 추가:
    //    leftYellowCount  = min(DEFAULT_YELLOW_COUNT, getMaxYellowLeft(index))
    //    rightYellowCount = min(DEFAULT_YELLOW_COUNT, getMaxYellowRight(index))
    // 2) zone을 ncaaIndex 오름차순 정렬
    // 3) recalcYellowLimits()  — 인접 zone 충돌 시 노랑 카운트 축소 (먼저!)
    // 4) recalcPositionStates() — 축소된 zone 기준으로 색상 갱신
    // 5) dispatchChange()       — 부모로 segments 페이로드 전달
}
```

> **호출 순서 주의**: `recalcYellowLimits` → `recalcPositionStates` 순서 필수. 반대로 하면 노랑 축소가 색상에 한 턴 늦게 반영됨.

#### 2.3. 드래그 핸들러
```javascript
const tileWidth = 36;                            // 1 타일 ≈ 36px
const tileDiff = Math.round(diff / tileWidth);   // 마우스 이동 → 타일 단위 환산
const newCount = Math.max(0, dragStartCount ± tileDiff);
const max = side === 'left'
    ? getMaxYellowLeft(zone.ncaaIndex)
    : getMaxYellowRight(zone.ncaaIndex);
yellowCount = Math.min(newCount, max);
```

마우스/터치 모두 지원(`mousedown/move/up`, `touchstart/move/end`). 드래그 중에는 클릭 핸들러가 무시됨(`dragging` 플래그).

#### 2.4. 자동 충돌 방지 — `getMaxYellowLeft/Right`
```javascript
function getMaxYellowLeft(ncaaIndex) {
    let max = ncaaIndex;  // 시퀀스 시작까지 거리
    for (const zone of ncaaZones) {
        if (zone.ncaaIndex < ncaaIndex) {
            const zoneBoundary = zone.ncaaIndex + zone.rightYellowCount + 1;
            const available = ncaaIndex - zoneBoundary;
            max = available >= 0 ? Math.min(max, available) : 0;
        }
    }
    return max;
}
```

(우측은 대칭. 시퀀스 끝까지 거리 = `seqLen - ncaaIndex - 1`)

#### 2.5. 세그먼트 추출 — `computeSegments`
```javascript
function computeSegments() {
    let i = 0;
    while (i < seq.length) {
        if (states[i] === 'green') {
            // 연속 초록 → FixedSegment { startIndex, sequence }
        } else {
            // 연속 빨강+노랑 → GapSegment { startIndex, length, originalSequence }
        }
    }
    return { fixedSegments, gapSegments };
}
```

> **반응성 의존성**: `$: segments = (positionStates, aminoSequence, computeSegments());` — Svelte의 `$:`는 우변에 직접 등장한 식별자만 의존성으로 추적하므로, 함수 호출 너머의 참조(`positionStates`/`aminoSequence`)는 콤마 연산자로 우변에 명시해야 재실행됨.

#### 2.6. dispatch 페이로드
```typescript
{
    positionStates: PositionState[],
    fixedSegments: FixedSegment[],
    gapSegments: GapSegment[],
    ncaaZones: NcAAZone[],
    fullSequence: string,
}
```

### 3. 워커 라우팅

**파일**: `src/lib/workers/mass_finder.worker.ts`

```typescript
self.onmessage = (e) => {
    const { sequenceTemplate, ... } = e.data;

    if (sequenceTemplate && sequenceTemplate.gapTotalLength > 0) {
        // ★ Template 경로: 다중 고정 세그먼트 + 다중 갭
        solutions = MassFinderHelper.calcByIonTypeWithTemplate(
            detectedMass, sequenceTemplate,
            formylation, adduct, monoisotopicMap, molecularMap,
            initialTemperature, absoluteTemperature, saIterations
        );
    } else {
        // 단일 시퀀스 경로 (knownSequence는 빈 문자열, proteinSequence만 SA 참조)
        solutions = MassFinderHelper.calcByIonType(
            detectedMass, knownSequence, formylation, adduct,
            monoisotopicMap, molecularMap, proteinSequence,
            initialTemperature, absoluteTemperature, saIterations
        );
    }
};
```

분기 키는 **`gapTotalLength > 0`**:
- 사용자가 ncAA를 하나도 클릭하지 않음 → gap 0 → legacy 경로
- ncAA 1개 이상 → gap > 0 → template 경로

### 4. Template 기반 SA — `calcWithTemplate`

**파일**: `src/lib/helper/mass_finder_helper.ts`

#### 4.1. 다중 고정 세그먼트의 순 질량
```typescript
let fixedRawMass = 0;
let fixedCount = 0;
for (const segment of templateData.fixedSegments) {
    for (const amino of segment.sequence) {
        fixedRawMass += this.dataMap[amino] ?? 0;
        fixedCount++;
    }
}

// 각 세그먼트 내부의 펩타이드 결합 물 증발량 합산 (세그먼트 간은 별도)
let totalFixedInternalWater = 0;
for (const segment of templateData.fixedSegments) {
    totalFixedInternalWater += this.getWaterWeight(segment.sequence.length);
}
const fixedNetMass = fixedRawMass - totalFixedInternalWater;
```

여러 고정 세그먼트가 갭으로 단절되어 있으므로 **각 세그먼트 내부의 물 증발량만** 먼저 빼고, 세그먼트 간 연결 물 분자는 다음 단계의 `addWeight`에서 정확히 보정.

#### 4.2. SA 목표 질량 — gapLen 반복

```typescript
const adjustedTarget = targetMass - fixedNetMass;
const [minGapLen, maxGapLen] = this.getMinMaxRange(this.formyType, adjustedTarget);

for (let gapLen = minGapLen; gapLen < maxGapLen; gapLen++) {
    if (gapLen < 0) continue;
    if (gapLen === 0 && fixedCount > 0) {
        // 갭 아미노산 없이 고정만으로 결과 추가
        bestSolutions.push(new AminoModel({ code: '', /* ... */ }));
        continue;
    }

    const totalWater = this.getWaterWeight(fixedCount + gapLen);
    const addWeight = totalWater - totalFixedInternalWater;
    const saTargetMass = adjustedTarget + addWeight;
    if (saTargetMass <= 0) continue;

    const solutions = this.calcByFType(
        this.formyType, saTargetMass, gapLen,
        gapReferenceSequence,  // 갭들의 originalSequence를 join — neighborSolution의 90% 참조
        initialTemperature, absoluteTemperature, saIterations
    );
    bestSolutions = bestSolutions.concat(removeSingleFSequences(removeDuplicates(solutions)));
}
```

#### 4.3. 핵심 수식

```
totalMass = fixedRawMass + gapRawSum
          - (fixedCount + gapLen - 1) × WATER       // 전체 시퀀스의 펩타이드 결합 물 증발
          [+ formylation 27.99]

addWeight = totalWater - totalFixedInternalWater
          = WATER × (fixedCount + gapLen - 1) - WATER × Σ(segment.length - 1)
          = WATER × (gapLen - 1 + numFixedSegments)
```

이는 v1.0의 `connectionWater = WATER` 단일 보정을 일반화한 것으로, **N개 고정 세그먼트가 갭들로 분리되어 1개의 완성된 펩타이드로 합쳐지는 결합 수**를 정확히 반영함.

#### 4.4. 엣지 케이스

| 조건 | 동작 |
|------|------|
| `templateData.gapSegments.length === 0` | 원본 `fullSequence` 그대로 1개 결과 반환 |
| `adjustedTarget <= 1.0 && fixedCount > 0` | 갭 없이 고정 세그먼트만 1개 결과 추가 후 SA 반복도 계속 |
| `gapLen === 0 && fixedCount > 0` | 빈 갭(고정만) 결과 추가하고 다음 gapLen으로 |
| `saTargetMass <= 0` | 해당 gapLen 건너뜀 |

### 5. 결과 재조립 — `assembleTemplateResult`

SA가 반환하는 `code`는 갭 영역에 들어갈 아미노산만의 순열. 이를 원래 템플릿의 fixed/gap 위치에 다시 끼워 넣어야 함.

#### 5.1. 갭 분배 비율
```typescript
const totalOriginalGapLen = gaps.reduce((sum, g) => sum + g.length, 0);
let distributed = 0;
const gapDistribution = gaps.map((g, idx) => {
    if (totalOriginalGapLen === 0 || totalGapAminos === 0) return 0;
    if (idx === gaps.length - 1) {
        return totalGapAminos - distributed;  // 마지막 갭이 반올림 나머지 흡수
    }
    const share = Math.round(totalGapAminos * g.length / totalOriginalGapLen);
    distributed += share;
    return share;
});
```

원래 갭 길이 비율 그대로 SA가 찾은 아미노산을 분배. `Math.round` 누적 오차는 마지막 갭이 흡수해 총합 보존.

#### 5.2. 파트별 조립 (start index 순서)
```typescript
const parts = [...fixed, ...gaps].sort((a, b) => a.startIndex - b.startIndex);
let fullCode = '';
let gapOffset = 0;
for (const part of parts) {
    if (part.type === 'fixed') {
        fullCode += fixed[part.index].sequence;
    } else {
        const count = gapDistribution[part.index];
        fullCode += cleanGapAminos.substring(gapOffset, gapOffset + count);
        gapOffset += count;
    }
}
if (hasFormylation) fullCode = 'f' + fullCode;
```

#### 5.3. 질량 재계산

조립된 `fullCode`로 `getMonoisotopicWeightSum`/`getMolecularWeightSum`을 다시 호출하여 부동소수점 누적 오차 없이 정확한 전체 분자량을 산출.

### 6. UI 통합 — `/mts/+page.svelte`

#### 6.1. 상태와 이벤트 핸들러
```svelte
<script>
  let sequenceTemplate = null; // PeptideSequenceSelector → handleTemplateChange로 채워짐

  function handleTemplateChange(e) {
    const { fullSequence, positionStates, fixedSegments, gapSegments } = e.detail;
    if (!fullSequence) return (sequenceTemplate = null);

    sequenceTemplate = {
      fullSequence, positionStates, fixedSegments, gapSegments,
      totalLength: fullSequence.length,
      gapTotalLength: gapSegments.reduce((sum, g) => sum + g.length, 0),
    };
  }
</script>

<InitialRnaInput bind:value={proteinSequence} />
<PeptideSequenceSelector
  aminoSequence={convertedAminoSequence}
  on:change={handleTemplateChange}
/>
```

#### 6.2. 워커 페이로드 분기
```javascript
const workerData = { detectedMass, formylation, adduct, monoisotopicMap, molecularMap, /* ... */ };

if (sequenceTemplate && sequenceTemplate.gapTotalLength > 0) {
  workerData.sequenceTemplate = sequenceTemplate;        // template 경로
} else {
  workerData.knownSequence = "";
  workerData.proteinSequence = proteinSequence;          // legacy 경로 (RNA 참조 시퀀스만)
}
worker.postMessage(workerData);
```

#### 6.3. UI 알림 변경

| 조건 | 표시되는 알림 |
|------|--------------|
| RNA 입력 + ncAA 지정 (`gapTotalLength > 0`) | 🔵 **Template Mode Active** — `Fixed: ..., Variable: N positions` |
| RNA만 입력, ncAA 미지정 | 🔵 **참조 시퀀스 활성화** — 단일 시퀀스 경로 안내 |

---

## 분자량 계산 로직

### 1. Monoisotopic Weight 계산
```typescript
// 조건: 포밀레이션 별도 처리, 물 증발량 계산
static getMonoisotopicWeightSum(solutionCombine: string) {
    if (solutionCombine.startsWith('f')) {
        // 포밀레이션이 있는 경우
        const aminoSequence = solutionCombine.slice(1); // 'f' 제외
        let result = aminoSequence.split('').reduce((sum, e) => sum + (dataMap[e] ?? 0), 0);
        result -= this.getWaterWeight(aminoSequence.length); // 아미노산만의 물 증발량
        result += fWeight; // 포밀레이션 무게 추가 (27.99)
        return result;
    } else {
        // 포밀레이션이 없는 경우
        let result = solutionCombine.split('').reduce((sum, e) => sum + (dataMap[e] ?? 0), 0);
        result -= this.getWaterWeight(solutionCombine.length);
        return result;
    }
}
```

### 2. 물 증발량 계산
```typescript
// 조건: 아미노산 길이 기반 계산
static getWaterWeight(aminoLength: number) {
    if (aminoLength === 0) return 0;
    return 18.01056 * (aminoLength - 1);
}
```

### 3. Fixed Sequence와 추가 아미노산 간 펩타이드 결합 처리

**파일**: `src/lib/helper/mass_finder_helper.ts:90-110`, `src/lib/helper/mass_finder_helper.ts:488-503`

**개요**: Fixed sequence와 추가 아미노산 사이의 펩타이드 결합에서 발생하는 물 분자 증발량을 정확하게 계산합니다.

**핵심 로직**:

#### 3.1. Fixed Sequence 물 증발량 계산
```typescript
// src/lib/helper/mass_finder_helper.ts:488-503
getInitAminoWeight(initAmino: string): { monoisotopicWeight: number, molecularWeight: number } {
    // Fixed sequence 내부 펩타이드 결합에 대한 물 증발량만 계산
    // (추가 아미노산과의 연결은 calc() 함수에서 별도 처리)
    const initAminoWaterWeight = this.getWaterWeight(initAmino.length);
    let initAminoMonoisotopicWeight = 0;
    let initAminoMolecularWeight = 0;
    if (initAmino) {
        for (const i of initAmino.split('')) {
            initAminoMonoisotopicWeight += this.dataMap[i] ?? 0;
            initAminoMolecularWeight += this.moleMap[i] ?? 0;
        }
    }
    return {
        monoisotopicWeight: initAminoMonoisotopicWeight - initAminoWaterWeight,
        molecularWeight: initAminoMolecularWeight - initAminoWaterWeight
    };
}
```

**조건**:
- Fixed sequence 내부의 펩타이드 결합만 계산 (`length` 사용, `length + 1` 아님)
- 추가 아미노산과의 연결 물 분자는 별도 처리

#### 3.2. Fixed Sequence와 추가 아미노산 연결 물 분자 계산
```typescript
// src/lib/helper/mass_finder_helper.ts:90-110
calc(...) {
    // ... (초기화 로직)

    const initAminoWeight = this.getInitAminoWeight(processedInitAminos);
    targetMass -= initAminoWeight.monoisotopicWeight;

    // targetMass가 매우 작거나 음수인 경우 (Fixed sequence만으로 충분한 경우)
    // 추가 아미노산이 필요 없으므로 빈 시퀀스 반환
    if (targetMass <= 1.0 && processedInitAminos) {
        const emptyWeight = this.getMonoisotopicWeightSum("");
        const emptyMolWeight = this.getMolecularWeightSum("");
        bestSolutions.push(new AminoModel({ code: "", weight: emptyWeight, molecularWeight: emptyMolWeight }));
    } else {
        const [minRange, maxRange] = this.getMinMaxRange(this.formyType, targetMass);

        for (let i = minRange; i < maxRange; i++) {
            // i > 0일 때는 Fixed sequence와 추가 아미노산 사이의 펩타이드 결합 물 분자 추가
            const connectionWater = (processedInitAminos && i > 0) ? CHEMICAL_CONSTANTS.WATER_WEIGHT : 0;
            const addWeight = this.getWaterWeight(i) + connectionWater;
            let solutions = this.calcByFType(this.formyType, targetMass + addWeight, i, ...);
            // ... (결과 처리)
        }
    }
}
```

**조건**:
1. **Fixed sequence만으로 충분한 경우** (`targetMass <= 1.0 && processedInitAminos`):
   - 추가 아미노산이 필요 없음
   - 빈 시퀀스(`""`) 반환

2. **추가 아미노산이 필요한 경우**:
   - `connectionWater`: Fixed sequence와 추가 아미노산 사이 펩타이드 결합 물 분자
   - 조건: `processedInitAminos && i > 0` (Fixed sequence가 있고 추가 아미노산이 1개 이상)
   - 값: `CHEMICAL_CONSTANTS.WATER_WEIGHT` (18.01056 Da)

**물 분자 계산 구조**:
```
[Fixed Sequence] + [추가 아미노산들]

물 증발량 = Fixed 내부 물 증발량 + 연결 물 분자 + 추가 아미노산 내부 물 증발량
         = (Fixed 길이 - 1) × 18.01056  (getInitAminoWeight에서 계산)
         + 18.01056                      (connectionWater, calc에서 계산)
         + (추가 길이 - 1) × 18.01056    (getWaterWeight(i), calc에서 계산)
```

**예시**:
- Fixed sequence: `ABC` (3개 아미노산)
  - 내부 물 증발량: `(3-1) × 18.01056 = 36.02112 Da`
- 추가 아미노산: `DE` (2개)
  - 내부 물 증발량: `(2-1) × 18.01056 = 18.01056 Da`
  - 연결 물 분자: `18.01056 Da`
- 총 물 증발량: `36.02112 + 18.01056 + 18.01056 = 72.04224 Da`

### 4. 이온 무게 추가
```typescript
// 조건: 최종 단계에서 이온 무게 추가
static calcByIonType(...) {
    let bestSolutions = this.calc(targetMass - getIonWeight(ionType), ...)
        .map(e => new AminoModel({
            ...e,
            weight: (e.weight ?? 0) + getIonWeight(e.ionType ?? 'unknown'),
            similarity: calculateSimilarity(targetMass, finalWeight)
        }));
}
```

---

## 결과 처리 로직

### 1. 결과 정렬 조건
```typescript
// 조건: 참조 시퀀스 유무에 따른 복합 정렬
export function sortAmino(list: AminoModel[], compareValue: number, referenceSequence?: string) {
    if (referenceSequence) {
        // 분자량 정확도 90% + 시퀀스 유사도 10%
        const scoreA = normalizedMassDiff * 0.9 + normalizedSeqDiff * 0.1;
        const scoreB = normalizedMassDiff * 0.9 + normalizedSeqDiff * 0.1;
        return scoreA - scoreB;
    } else {
        // 분자량 차이만 고려
        return Math.abs(a.weight - compareValue) - Math.abs(b.weight - compareValue);
    }
}
```

### 2. 중복 제거 조건
```typescript
// 조건: 코드 기준 중복 제거, 품질 우선 선택
export function removeDuplicates(inputList: AminoModel[]) {
    const uniqueMap = {};
    
    inputList.forEach(aminoModel => {
        const key = aminoModel.code ?? '';
        
        if (!uniqueMap[key]) {
            uniqueMap[key] = aminoModel;
        } else {
            // 분자량 유사도 우선, 동일하면 시퀀스 유사도 우선
            const existing = uniqueMap[key];
            if (current.similarity > existing.similarity || 
                (current.similarity === existing.similarity && 
                 current.sequenceSimilarity > existing.sequenceSimilarity)) {
                uniqueMap[key] = current;
            }
        }
    });
    
    return Object.values(uniqueMap);
}
```

### 3. 최종 결과 개수 제한
```typescript
// 조건: 사용자가 동적으로 선택 가능 (20, 50, 100개)
// 파일: src/lib/components/ResultTable.svelte:81-90
bestSolutions = allSolutions.slice(0, maxResultCount);
```

**UI 구현**:
```svelte
<select bind:value={maxResultCount}>
  <option value={20}>20</option>
  <option value={50}>50</option>
  <option value={100}>100</option>
</select>
```

**특징**:
- 기본값: 20개
- 실시간 변경 가능 (재계산 불필요)
- 결과 테이블과 Excel 다운로드 모두 적용

---

## Web Worker 비동기 처리

**파일**: `src/lib/workers/mass_finder.worker.ts`, `src/routes/mts/+page.svelte`

### 조건
- CPU 집약적 계산을 메인 스레드에서 분리
- UI 응답성 유지
- 에러 처리 및 진행 상태 표시
- SA Mode 파라미터 동적 전달

```typescript
// Worker 메시지 전송 (template / legacy 페이로드 분기)
const workerData = {
    detectedMass,
    proteinSequence,                                // 선택: RNA 시퀀스 (legacy 경로의 참조)
    formylation,
    adduct,
    monoisotopicMap,
    molecularMap,
    initialTemperature,                             // 동적 초기 온도
    absoluteTemperature,                            // 동적 최소 온도
    saIterations,                                   // 100 고정
};

if (sequenceTemplate && sequenceTemplate.gapTotalLength > 0) {
    workerData.sequenceTemplate = sequenceTemplate; // ★ Template 경로
} else {
    workerData.knownSequence = "";                  // 단일 시퀀스 경로 (UI에는 텍스트 입력 필드 없음)
}

worker.postMessage(workerData);

// 결과 처리
worker.onmessage = (e) => {
    if (e.data.type === 'success') {
        allSolutions = e.data.solutions;
        bestSolutions = allSolutions.slice(0, maxResultCount);
    } else if (e.data.type === 'error') {
        console.error('Worker error:', e.data.error);
    }
    loading.set(false);
};

// 에러 처리
worker.onerror = (error) => {
    console.error('Worker error:', error);
    loading.set(false);
};
```

**전달 파라미터 상세**:
- `saMode`: 사용자 선택 모드 ('standard', 'think', 'deepthink')
- `saIterations`: 반복 횟수 (모든 모드 100회 고정)
- `initialTemperature`: 모드별 초기 온도 (Standard: 10,000 / Think: 50,000 / Deep think: 100,000)
- `absoluteTemperature`: 모드별 최소 온도 (Standard: 0.001 / Think: 0.00001 / Deep think: 0.000001)
- `coolingRate`: 냉각률 (0.99 고정)

**참고**:
- LocalStorage 키: `mts_sa_mode`
- 사용자 선택은 자동 저장되어 다음 방문 시에도 유지됨

---

## 주요 데이터 구조

### AminoModel
```typescript
interface AminoModel {
    code?: string;                    // 아미노산 시퀀스 코드
    weight?: number;                  // Monoisotopic weight
    molecularWeight?: number;         // Molecular weight
    similarity?: number;              // 분자량 유사도 (%)
    sequenceSimilarity?: number;      // 시퀀스 유사도 (%)
    formyType?: FormyType;           // 포밀레이션 타입
    ionType?: IonType;               // 이온 타입
    essentialSeq?: string;           // Fixed sequence
}
```

### 입력 파라미터
```typescript
interface MTSInputs {
    detectedMass: number;                          // 필수: 감지된 분자량
    proteinSequence: string;                       // 선택: RNA 시퀀스
    sequenceTemplate?: SequenceTemplate | null;    // PeptideSequenceSelector 결과 (있으면 template 경로)
    formylation: FormyType;                        // 포밀레이션 설정
    adduct: IonType;                               // 이온 부가물 설정
    selectedAminos: AminoMap;                      // 선택된 아미노산
    ncAA: NcAAMap;                                 // 비표준 아미노산
}

// SequenceTemplate 정의는 위 "Peptide Sequence Map & Template 기반 계산" 섹션 참조
```

---

## 성능 최적화 조건

### 1. 계산 최적화
- 시뮬레이티드 어닐링 파라미터 조정 가능
- 선택된 아미노산만 사용하여 탐색 공간 축소
- 중복 제거를 통한 결과 품질 향상

### 2. 메모리 최적화
- 최대 100개 결과로 메모리 사용량 제한
- 불필요한 계산 결과 즉시 제거
- 효율적인 데이터 구조 사용

### 3. UI 최적화
- Web Worker로 비동기 처리
- 진행 상태 표시
- 결과 페이지네이션 지원

이 문서는 X-MAS MTS 기능의 기획, 기능 정의, Input/Output, 알고리즘을 명세합니다. 버전별 변경 이력은 [`MTS_UPDATE_NOTES.md`](./MTS_UPDATE_NOTES.md)를 참조하세요.