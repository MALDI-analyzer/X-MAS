# X-MAS 테스트케이스 (QA Test Case Catalog)

> 생성일: 2026-07-23 · 총 **324** 케이스
> 근거: `.omc/wiki/` 기능별 분기 케이스 위키(SSOT) + 실제 코드 + "엑마 버그 및 수정 사항" PDF
> 4개 도메인 병렬 분석으로 추출. 각 케이스는 위키 슬러그 / `파일:라인` / PDF 페이지로 근거를 명시합니다.

## 목적 & 사용법

- 각 케이스는 **수동 QA / 회귀 체크리스트**로 바로 사용 가능하며, 추후 자동화(Playwright / Vitest) 시 시나리오 소스로도 사용합니다.
- **Type** 범례: `happy`(정상 경로), `validation`(입력 검증), `edge`(경계 밖 특수 상황), `boundary`(경계값), `branch`(분기 커버리지), `regression`(회귀 — 최근 수정/버그 방지).
- **Ref**: `wiki-slug` / `file.ts:line` / PDF page.

## 커버리지 요약

| # | 기능 | 케이스 수 | 라우트 / 모듈 |
|---|---|---:|---|
| 1 | MTS (Mass to Sequence) | 70 | `/mts` |
| 2 | STM (Sequence to Mass) | 78 | `/stm` |
| 3 | Draw (My ncAAs) | 21 | `/draw` |
| 4 | Potential Modifications | 40 | `/potential` |
| 5 | Benchmark | 42 | `/benchmark` |
| 6 | 공통 / 공유 (Cross-cutting) | 73 | 전역·헬퍼·스토리지·라우팅 |
| | **합계** | **324** | |

## 참고 / 한계

- 케이스는 위키 SSOT + 코드 정적 분석으로 작성됨. **브라우저 실동작 검증은 별도 필요** (Chrome 확장 미연결로 이번엔 미수행).
- 공통(§6) 섹션은 Draw / RNA 입력 / 워커 등 일부가 각 기능 섹션과 **의도적으로 교차 참조**됩니다(리뷰어별 진입점 편의). 실제 실행 시 중복 케이스는 한 번만 수행하면 됩니다.
- 최근 PDF 반영 변경(SA iteration 슬라이더, stop codon/Release Factor, variable 폭 3→1, 줄바꿈 드래그, RNA T→U)은 `regression` 타입으로 별도 표기.

---

## 1. MTS (Mass to Sequence) — 70 cases

### TC-MTS-01: Calculate with empty (null) detected mass is blocked
- **Area**: /mts/+page.svelte `validate()`
- **Type**: validation
- **Precondition**: Fresh MTS page, `detectedMass` still null
- **Steps**: 1. Leave "Detected mass" blank. 2. Click "Predict sequences".
- **Expected**: Warning alert "Please Input Detected mass" (title "Validation Error"); no worker run; loading cleared.
- **Ref**: mts-decision-flow-all-branches §1; +page.svelte:229-232

### TC-MTS-02: Valid detected mass, no RNA — happy path random-solution mode
- **Area**: /mts calc legacy path
- **Type**: happy
- **Precondition**: RNA field empty
- **Steps**: 1. Enter detected mass `1000`. 2. Leave RNA blank. 3. Adduct `+H`, Formylation any. 4. Click Predict.
- **Expected**: Worker runs `calcByIonType`→`calc`, `randomSolution` used (proteinSequence empty). Results table appears with candidate sequences near 1000 Da.
- **Ref**: mts-decision-flow-all-branches §3.1; mts-sa-algorithm-internals-branch-cases §2

### TC-MTS-03: Negative detected mass
- **Area**: detected-mass input
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Enter `-500` in detected mass. 2. Click Predict.
- **Expected**: Not blocked by null check (value ≠ null). SA target becomes negative after ion/water adjustment → `saTargetMass <= 0` branches `continue`/empty results; no crash. Ideally no or empty result set.
- **Ref**: mts-template-gap-cases §3.3 Case 4 (line 816); +page.svelte:229

### TC-MTS-04: Zero detected mass
- **Area**: detected-mass input
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Enter `0`. 2. Predict.
- **Expected**: `0 === null` is false so passes null guard; SA range collapses (min/max ~0), no meaningful/empty results, no crash.
- **Ref**: +page.svelte:229; mts-decision-flow §3.3

### TC-MTS-05: Huge detected mass (performance/range)
- **Area**: detected-mass input
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Enter `100000`. 2. Predict.
- **Expected**: Runs without UI freeze (web worker). `getMinMaxRange` produces large max; computation completes or returns results; the old >10000 guard is commented out so no block.
- **Ref**: +page.svelte:234-237 (commented guard); mts-decision-flow §3.3

### TC-MTS-06: Decimal detected mass
- **Area**: detected-mass input
- **Type**: happy
- **Precondition**: none
- **Steps**: 1. Enter `1234.567`. 2. Predict.
- **Expected**: Accepted as number; SA targets the decimal mass; similarity scoring reflects fractional accuracy.
- **Ref**: mts-mass-formula-cases §6

### TC-MTS-07: RNA typed with T auto-converts to U
- **Area**: InitialRnaInput `normalizeRnaInput`
- **Type**: branch
- **Precondition**: RNA field empty
- **Steps**: 1. Type `AUGTTTAAA` into RNA field.
- **Expected**: Field shows `AUGUUUAAA` (T→U). Converted amino sequence line updates accordingly.
- **Ref**: mts-rna-ncaa-codon-substitution "RNA 입력 정규화"; InitialRnaInput.svelte:19-26

### TC-MTS-08: RNA Load path also applies T→U + whitespace strip
- **Area**: InitialRnaInput `handleLoad`
- **Type**: regression
- **Precondition**: A saved sequence containing DNA `ATG TTT\nAAA` exists
- **Steps**: 1. Click Load. 2. Select the saved DNA sequence.
- **Expected**: Loaded value normalized to `AUGUUUAAA` (uppercased, whitespace/newlines removed, T→U). Regression for v1.1.0 Load-path gap.
- **Ref**: mts-rna-ncaa-codon-substitution "Load 경로 누락"; InitialRnaInput.svelte:84-88

### TC-MTS-09: RNA whitespace/newline stripping on typing
- **Area**: InitialRnaInput `normalizeRnaInput`
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Paste `AUG AAA\nGUG` into RNA field.
- **Expected**: Value becomes `AUGAAAGUG` (all `\s` removed).
- **Ref**: InitialRnaInput.svelte:19-21

### TC-MTS-10: Lowercase RNA uppercased
- **Area**: InitialRnaInput
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Type `auggcc`.
- **Expected**: Field shows `AUGGCC`.
- **Ref**: InitialRnaInput.svelte:19-20

### TC-MTS-11: Non-AUGC character rejected on Predict
- **Area**: /mts `validatePeptideSequence`
- **Type**: validation
- **Precondition**: none
- **Steps**: 1. Type `AUGXNZ` (after normalize X/N/Z remain, not in AUGC). 2. Enter mass. 3. Predict.
- **Expected**: `validatePeptideSequence` returns false → alert "Please enter the correct Peptide sequence". Also InitialRnaInput shows inline invalid feedback "Only A, U, G, C are allowed in RNA sequence".
- **Ref**: +page.svelte:326-331; InitialRnaInput.svelte:54-59

### TC-MTS-12: RNA length not a multiple of 3
- **Area**: /mts `validatePeptideSequence`
- **Type**: validation
- **Precondition**: none
- **Steps**: 1. Type `AUGA` (length 4). 2. Enter mass. 3. Predict.
- **Expected**: Alert "RNA sequence length must be a multiple of 3 (codon units)"; blocked. Inline feedback also shows in InitialRnaInput.
- **Ref**: +page.svelte:334-336; mts-decision-flow §1

### TC-MTS-13: Empty RNA is valid (optional field)
- **Area**: /mts `validatePeptideSequence`
- **Type**: happy
- **Precondition**: none
- **Steps**: 1. Leave RNA empty. 2. Enter mass `800`. 3. Predict.
- **Expected**: Passes validation (empty → true), enters non-reference random-solution mode.
- **Ref**: +page.svelte:322-323

### TC-MTS-14: Valid RNA translated & displayed
- **Area**: InitialRnaInput conversion display
- **Type**: happy
- **Precondition**: none
- **Steps**: 1. Type `AUGAAAGUG`.
- **Expected**: "Converted amino acid sequence: MKV" shown below field.
- **Ref**: InitialRnaInput.svelte:28-47,154-160

### TC-MTS-15: SA slider default is Standard = 1000
- **Area**: SAIterationSlider
- **Type**: happy
- **Precondition**: No `mts_sa_iterations` in localStorage
- **Steps**: 1. Load MTS page. 2. Observe slider.
- **Expected**: Thumb at midpoint (t=0.5), number box shows 1000, "Standard" tick active, config dispatched with saIterations=1000. `saConfig.saIterations` default 1000.
- **Ref**: mts-sa-algorithm-internals §6; SAIterationSlider.svelte:43; +page.svelte:29

### TC-MTS-16: Snap to Fast = 100
- **Area**: SAIterationSlider `snapTo`
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Click the "Fast" tick label.
- **Expected**: pos→iterToPos(100)=0, number box 100, "Fast" tick active, hint badge "Very fast" (green), ratio "~0.1× the time of Standard".
- **Ref**: SAIterationSlider.svelte:87-91,50-57; SA_ITERATION_ANCHORS

### TC-MTS-17: Snap to Deep think = 50000
- **Area**: SAIterationSlider
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Click "Deep think" tick.
- **Expected**: pos→1.0, number box 50000, "Deep think" active, hint badge "Very slow" (red), ratio "~50× the time of Standard".
- **Ref**: SAIterationSlider.svelte:118,48-57

### TC-MTS-18: Non-linear mapping — Standard exactly at midpoint
- **Area**: SAIterationSlider `posToIter`
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Drag slider precisely to center (t=0.5).
- **Expected**: iterations = 1000 (not 2236 that a single geometric interp would give); piecewise geometric segments confirmed.
- **Ref**: mts-sa-algorithm-internals §6 mapping; SAIterationSlider.svelte:20-27

### TC-MTS-19: Direct numeric entry maps slider position
- **Area**: SAIterationSlider `handleNumberInput`
- **Type**: happy
- **Precondition**: none
- **Steps**: 1. Type `5000` into the number box and blur/commit.
- **Expected**: pos = iterToPos(5000) (between mid and right), thumb moves accordingly, hint "Slow" (orange, 5000 in [3000,15000)), config emitted with 5000.
- **Ref**: SAIterationSlider.svelte:79-84,50-57

### TC-MTS-20: Numeric entry above max clamps to 50000
- **Area**: SAIterationSlider `clampIter`
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Enter `999999` in number box.
- **Expected**: Clamped to 50000; thumb at far right.
- **Ref**: SAIterationSlider.svelte:37-40

### TC-MTS-21: Numeric entry below min clamps to 100
- **Area**: SAIterationSlider `clampIter`
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Enter `5` (or `0`, negative) in number box.
- **Expected**: Clamped to 100 (Fast).
- **Ref**: SAIterationSlider.svelte:37-40

### TC-MTS-22: Non-numeric / empty iteration entry falls back to Standard
- **Area**: SAIterationSlider `clampIter`
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Clear the number box / enter non-numeric.
- **Expected**: `parseInt` NaN → `clampIter` returns STANDARD (1000).
- **Ref**: SAIterationSlider.svelte:38,79-80

### TC-MTS-23: Iteration value persists across reload (localStorage)
- **Area**: SAIterationSlider persist / onMount
- **Type**: regression
- **Precondition**: none
- **Steps**: 1. Set iterations to 3000. 2. Reload the page.
- **Expected**: `localStorage['mts_sa_iterations']` = 3000; on reload thumb restores to that position and box shows 3000.
- **Ref**: SAIterationSlider.svelte:68-70,93-102

### TC-MTS-24: Time-hint tier thresholds
- **Area**: SAIterationSlider hint
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Set iterations to 499, then 500, then 2999, then 3000, then 14999, then 15000.
- **Expected**: <500 "Very fast" (green); 500–2999 "Normal" (blue); 3000–14999 "Slow" (orange); ≥15000 "Very slow" (red).
- **Ref**: SAIterationSlider.svelte:50-57

### TC-MTS-25: Temperature stays fixed regardless of iterations
- **Area**: SAIterationSlider `emitConfig`
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Move slider to any position. 2. Inspect dispatched config.
- **Expected**: Always initialTemperature=10000, absoluteTemperature=0.001, coolingRate=0.99; only saIterations varies.
- **Ref**: SAIterationSlider.svelte:59-66; SA_FIXED_TEMPERATURE (algorithm.config.ts:144-148)

### TC-MTS-26: Adduct selection shifts result mass (+Na example)
- **Area**: AdductSelector → calcByIonType
- **Type**: branch
- **Precondition**: mass entered
- **Steps**: 1. Set adduct `+Na`. 2. Predict.
- **Expected**: SA target = mass − 22.9892; results' displayed weight = raw + 22.9892. Compare vs `+H` (+1.0073) to confirm shift.
- **Ref**: mts-mass-formula-cases §4; amino_mapper getIonWeight

### TC-MTS-27: Negative adduct (-H) applies negative ion weight
- **Area**: AdductSelector
- **Type**: branch
- **Precondition**: mass entered
- **Steps**: 1. Set adduct `-H`. 2. Predict.
- **Expected**: SA target = mass − (−1.0073) = mass + 1.0073; result weight = raw − 1.0073.
- **Ref**: mts-mass-formula-cases §4 table

### TC-MTS-28: Formylation = yes forces f-prefix results
- **Area**: FormylationSelector / calcByFType
- **Type**: branch
- **Precondition**: mass entered
- **Steps**: 1. Set Formylation "yes". 2. Predict.
- **Expected**: Result codes start with `f`; mass accounts for FORMYLATION_WEIGHT (27.99); getMinMaxRange max uses FORMYLATION_WEIGHT divisor.
- **Ref**: mts-mass-formula-cases §5; mts-decision-flow §3.3

### TC-MTS-29: Formylation = no gives non-f results
- **Area**: FormylationSelector
- **Type**: branch
- **Precondition**: mass entered
- **Steps**: 1. Set Formylation "no". 2. Predict.
- **Expected**: No `f` prefixes; getMinMaxRange max uses min amino mass divisor.
- **Ref**: mts-mass-formula-cases §5; mts-decision-flow §3.3

### TC-MTS-30: Formylation default is "unknown"
- **Area**: /mts state / getMinMaxRange
- **Type**: edge
- **Precondition**: fresh page
- **Steps**: 1. Load page (formylation default). 2. Predict.
- **Expected**: `formylation='unknown'` → FORMYLATION_WEIGHT used as divisor; both f/non-f solutions attempted.
- **Ref**: +page.svelte:23; mts-decision-flow §3.3 note

### TC-MTS-31: ncAA auto-substitution of excluded natural AA
- **Area**: convertRnaToAminoAcids branch 4
- **Type**: branch
- **Precondition**: RNA with a codon for an AA that is unchecked in Amino set, ncAA slot assigned that codon
- **Steps**: 1. RNA `AUGUUAAAA` (contains UUA=Leu). 2. Uncheck L in Amino set. 3. Assign codon `UUA` to ncAA slot B. 4. Observe converted sequence.
- **Expected**: That position shows `B` (candidates[0]); PeptideSequenceSelector marks it purple/autoSub.
- **Ref**: mts-rna-ncaa-codon-substitution trigger table #4; +page.svelte:311-312

### TC-MTS-32: Multi-candidate popover on a codon with ≥2 ncAA slots
- **Area**: substitutionInfo.multiCandidatePositions / popover
- **Type**: branch
- **Precondition**: same codon assigned to two ncAA slots (e.g., UUA→B and UUA→J)
- **Steps**: 1. RNA containing `UUA`. 2. Assign `UUA` to slots B and J. 3. Observe the tile.
- **Expected**: Tile shows ↓ arrow; clicking opens NcAACandidatePopover listing B and J; candidates[0] (slot order B) applied by default.
- **Ref**: mts-decision-flow §6 (candidates.length ≥ 2); +page.svelte:462-464

### TC-MTS-33: Position override wins over auto-substitution
- **Area**: convertRnaToAminoAcids branch 1 / handleOverride
- **Type**: branch
- **Precondition**: multi-candidate position (B default)
- **Steps**: 1. Open popover on a UUA position. 2. Select J.
- **Expected**: `positionOverrides[i]='J'`; that position now `J` unconditionally regardless of default first-candidate.
- **Ref**: mts-rna-ncaa-codon-substitution trigger #1; +page.svelte:295-297,487-490

### TC-MTS-34: Override invalidated when its letter disappears
- **Area**: reactive override validation
- **Type**: regression
- **Precondition**: override set to letter J on a position
- **Steps**: 1. Remove codon assignment for slot J. 2. Observe.
- **Expected**: `positionOverrides` reactively drops invalid J entry; position recomputes to default rule.
- **Ref**: mts-rna-ncaa-codon-substitution edge table; +page.svelte:371-385

### TC-MTS-35: Partial-drop warning banner
- **Area**: substitutionInfo.partialDropAA
- **Type**: branch
- **Precondition**: excluded natural AA appears at two codons; only one codon has ncAA
- **Steps**: 1. RNA with two Leu codons `UUA` and `UUG`. 2. Uncheck L. 3. Assign ncAA to only `UUA`.
- **Expected**: Yellow warning "Partial substitution: L — some codons ... will be dropped from the initial pool."
- **Ref**: +page.svelte:468-479,549-555

### TC-MTS-36: Excluded natural AA with no candidates is dropped from pool
- **Area**: convertRnaToAminoAcids branch 5 + proteinBasedSolution filter
- **Type**: branch
- **Precondition**: natural AA unchecked, no ncAA assigned to its codon
- **Steps**: 1. RNA with codon for L. 2. Uncheck L, assign no ncAA. 3. Predict.
- **Expected**: convertRnaToAminoAcids keeps natural L in reference string, but `proteinBasedSolution` filters L out (dataMap absent) at line 343-347.
- **Ref**: mts-decision-flow §6 last row; mts-rna-ncaa-codon-substitution "도먼트"

### TC-MTS-37: ncAA position toggle marks red + default 1 variable each side
- **Area**: PeptideSequenceSelector handleAminoClick
- **Type**: regression
- **Precondition**: RNA translated to peptide of length ≥5, click a middle amino
- **Steps**: 1. Click a green tile at index 3.
- **Expected**: That tile turns red (ncAA); exactly ONE yellow tile appears on each side (DEFAULT_YELLOW_COUNT=1, changed from 3). Regression for PDF requirement 1.
- **Ref**: mts-template-gap-cases v1.1.0 req1; PeptideSequenceSelector.svelte:58,104-105

### TC-MTS-38: Variable width limited near sequence start (getMaxYellowLeft)
- **Area**: PeptideSequenceSelector
- **Type**: boundary
- **Precondition**: peptide length 5
- **Steps**: 1. Click tile at index 0 (first amino).
- **Expected**: left yellow count = 0 (bounded by sequence start), right = min(1, available).
- **Ref**: mts-template-gap-cases §1.3; PeptideSequenceSelector

### TC-MTS-39: Dragging yellow edge extends/shrinks variable zone
- **Area**: PeptideSequenceSelector handleDragMove
- **Type**: happy
- **Precondition**: an ncAA zone exists
- **Steps**: 1. Drag the yellow edge outward across several tiles.
- **Expected**: Yellow tiles grow/shrink following cursor; fixed/gap segments recompute; template payload updates.
- **Ref**: mts-template-gap-cases §1.2; PeptideSequenceSelector.svelte:221-247

### TC-MTS-40: Drag across a line-wrap uses nearest-tile fallback
- **Area**: PeptideSequenceSelector findNearestTileIndex
- **Type**: regression
- **Precondition**: long peptide wrapping to 2+ lines, ncAA zone near a wrap boundary
- **Steps**: 1. Drag a yellow edge past the end of a line into empty space below.
- **Expected**: `elementFromPoint` fails there → `findNearestTileIndex(x,y)` clamps to nearest tile so the zone still adjusts at the line boundary (PDF req 3 fix).
- **Ref**: mts-template-gap-cases v1.1.0 req3; PeptideSequenceSelector.svelte:232-241,274

### TC-MTS-41: Adjacent-zone divider between two touching non-green zones
- **Area**: PeptideSequenceSelector zoneDivider
- **Type**: branch
- **Precondition**: two ncAA zones whose variable areas become adjacent
- **Steps**: 1. Create two ncAA zones close together so their yellow tiles touch. 2. Observe boundary.
- **Expected**: A vertical `.tile-zone-divider::after` line appears between the two zones (different zone ids, both non-green).
- **Ref**: mts-template-gap-cases v1.1.0 req2; PeptideSequenceSelector.svelte:439,604-606

### TC-MTS-42: Legend counts Fixed / ncAA / Variable
- **Area**: PeptideSequenceSelector legend
- **Type**: happy
- **Precondition**: at least one ncAA zone
- **Steps**: 1. Observe legend under the tile map.
- **Expected**: "Fixed (n)" green, "ncAA (n)" red, "Variable (n)" yellow with counts matching positionStates.
- **Ref**: PeptideSequenceSelector.svelte:472-483

### TC-MTS-43: Removing an ncAA zone by clicking the red tile
- **Area**: PeptideSequenceSelector handleAminoClick case A
- **Type**: branch
- **Precondition**: an ncAA zone exists
- **Steps**: 1. Click the red ncAA tile again.
- **Expected**: Zone removed; tiles revert to green; template payload recomputed. If no gaps remain, routing falls back to legacy.
- **Ref**: mts-template-gap-cases §1.2 case A

### TC-MTS-44: Stop codon readthrough when ncAA assigned
- **Area**: convertRnaToAminoAcids stop branch (ncAA)
- **Type**: branch
- **Precondition**: RNA with internal stop, ncAA assigned to that stop codon
- **Steps**: 1. RNA `AUG UAG GCG` (UAG=stop). 2. Assign ncAA B to `UAG`. 3. Observe converted seq.
- **Expected**: Translation reads through: `MBA` (B inserted, continues past stop). No calc block.
- **Ref**: mts-rna-ncaa-codon-substitution stop-codon table (req 8); +page.svelte:303-305

### TC-MTS-45: Active RF stop + no ncAA truncates translation and blocks calc
- **Area**: convertRnaToAminoAcids break + validate guard
- **Type**: validation
- **Precondition**: RNA with UAG internal stop, RF1 active (UAG in activeStopCodons), no ncAA
- **Steps**: 1. RNA `AUG UAG GCG`. 2. Keep RF1+RF2 checked. 3. Enter mass. 4. Predict.
- **Expected**: `truncatedAtActiveStop` set → alert: "Stop codon UAG at position 2 is recognized by an active release factor ... Assign an ncAA ... or turn off its release factor." Calc blocked.
- **Ref**: +page.svelte:246-254,306-307; mts-rna-ncaa-codon-substitution req 6

### TC-MTS-46: RF-inactive stop + no ncAA → special "*" state, calc blocked
- **Area**: STOP_PLACEHOLDER + specialStopPositions guard
- **Type**: validation
- **Precondition**: RNA with UAG internal stop; uncheck RF1 so UAG no longer active (RF2 covers UAA/UGA only)
- **Steps**: 1. RNA `AUG UAG GCG`. 2. Uncheck RF1. 3. Enter mass. 4. Predict.
- **Expected**: Position gets `*` placeholder; PeptideSequenceSelector shows orange diagonal `tile-special-stop`; on Predict alert "Stop codon(s) at position(s) 2 have no assigned ncAA. Assign an ncAA ..."; calc blocked (prevents NaN reaching worker).
- **Ref**: +page.svelte:256-266,308-309; mts-rna-ncaa-codon-substitution req 7

### TC-MTS-47: Release Factor default = both RF1 and RF2 (all three stops active)
- **Area**: ReleaseFactorSelector
- **Type**: happy
- **Precondition**: RNA entered so selector is visible
- **Steps**: 1. Enter any RNA. 2. Observe Release factor checkboxes.
- **Expected**: Both RF1 (UAA,UAG) and RF2 (UAA,UGA) checked → activeStopCodons = [UAA,UAG,UGA].
- **Ref**: +page.svelte:56; ReleaseFactorSelector.svelte:11

### TC-MTS-48: Release Factor selector hidden when no RNA
- **Area**: /mts hasReferenceSequence
- **Type**: branch
- **Precondition**: RNA empty
- **Steps**: 1. Clear RNA field. 2. Observe.
- **Expected**: ReleaseFactorSelector not rendered (only shown when `hasReferenceSequence`).
- **Ref**: +page.svelte:529,484

### TC-MTS-49: Turning off both RFs makes every stop a special "*" state
- **Area**: ReleaseFactorSelector + special stop
- **Type**: edge
- **Precondition**: RNA with a stop codon
- **Steps**: 1. Uncheck RF1 and RF2 (activeStopCodons=[]). 2. Observe/Predict.
- **Expected**: Stop with no ncAA → `*` special state; Predict blocked by specialStopPositions guard until ncAA assigned.
- **Ref**: ReleaseFactorSelector.svelte:23-30; +page.svelte:256-266

### TC-MTS-50: Template mode routing when gaps exist
- **Area**: /mts worker routing
- **Type**: branch
- **Precondition**: RNA translated, one ncAA zone created (gapTotalLength>0)
- **Steps**: 1. Enter RNA + mass. 2. Click a tile to create an ncAA/variable zone. 3. Predict.
- **Expected**: `workerData.sequenceTemplate` set → `calcByIonTypeWithTemplate` path; "Template Mode Active" banner shows Fixed segments + Variable count.
- **Ref**: mts-decision-flow §2; mts-template-gap-cases §2; +page.svelte:162-164,598-623

### TC-MTS-51: Legacy/reference mode routing when no gaps
- **Area**: /mts worker routing
- **Type**: branch
- **Precondition**: RNA entered, no ncAA zone (gapTotalLength=0)
- **Steps**: 1. Enter RNA + mass, no ncAA position. 2. Predict.
- **Expected**: `knownSequence=""`, `proteinSequence = convertedAminoSequence`; legacy `calcByIonType`; "Reference Sequence Active" banner shows converted sequence.
- **Ref**: mts-template-gap-cases §2 routing; +page.svelte:165-170,624-653

### TC-MTS-52: Template edge — gapSegments empty returns original sequence
- **Area**: calcByIonTypeWithTemplate line 771
- **Type**: edge
- **Precondition**: template supplied but no gap segments (defensive)
- **Steps**: 1. Construct template with gapSegments.length===0.
- **Expected**: Returns single result = original fullSequence, no SA.
- **Ref**: mts-template-gap-cases §3.1

### TC-MTS-53: Heavy-ncAA single-residue gap not collapsed (maxGapLen fix)
- **Area**: calcWithTemplate maxGapLen correction
- **Type**: regression
- **Precondition**: heavy ncAA (~185/250 Da) as fixed, small internal gap that should be Gly (57 net)
- **Steps**: 1. Set up template so an internal gap of one small residue (adjustedTarget≈39.01) is needed. 2. Predict.
- **Expected**: Loop tries gapLen up to 1 (not just 0); the single-residue gap is filled (100% mass recovery), not left empty. Regression for commit 4715a93/heavy-ncAA collapse.
- **Ref**: mts-template-gap-cases §3.2.5; mass_finder_helper.ts:782-800

### TC-MTS-54: Terminal small gap filled after fix
- **Area**: calcWithTemplate maxGapLen
- **Type**: regression
- **Precondition**: terminal gap, adjustedTarget≈57.02 (single seg)
- **Steps**: 1. Configure terminal single-residue gap. 2. Predict.
- **Expected**: gapLen range becomes [0,1]; residue filled instead of empty-gap-only.
- **Ref**: mts-template-gap-cases §3.2.5 table (terminal case)

### TC-MTS-55: preserveLength keeps gap length fixed during SA
- **Area**: neighborSolution preserveLength (template mode)
- **Type**: branch
- **Precondition**: template gap of fixed length N
- **Steps**: 1. Run template calc where SA explores heavy ncAA combos.
- **Expected**: `neighborSolution(...,true)` returns without trim; gapLen stays exactly N so SS→BS→BB paths reachable (commit 8759fed).
- **Ref**: mts-sa-algorithm-internals §3.1; mts-template-gap-cases §3.4

### TC-MTS-56: Result table max count default 20
- **Area**: ResultTable maxResultCount
- **Type**: happy
- **Precondition**: a calc returning >20 solutions
- **Steps**: 1. Predict with many results.
- **Expected**: Table shows 20 rows by default (`allSolutions.slice(0,20)`).
- **Ref**: +page.svelte:40,132; ResultTable.svelte:8,87

### TC-MTS-57: Change result count 20 → 50 → 100
- **Area**: ResultTable selector
- **Type**: branch
- **Precondition**: >100 solutions available
- **Steps**: 1. Change dropdown to 50, then 100.
- **Expected**: Reactive `bestSolutions = allSolutions.slice(0,maxResultCount)` updates without recalculation; row count changes to 50 then 100.
- **Ref**: ResultTable.svelte:85-90; +page.svelte:493-495

### TC-MTS-58: Result sorting with reference sequence (weighted)
- **Area**: mass_util sortAmino
- **Type**: branch
- **Precondition**: RNA reference active
- **Steps**: 1. Run calc with RNA reference. 2. Inspect order.
- **Expected**: Sorted by massDiff×0.9 + seqDiff×0.1 (similarity influences ranking), not by pure mass distance.
- **Ref**: mts-mass-formula-cases §7; mts-decision-flow §5.1

### TC-MTS-59: Result sorting without reference (pure mass distance)
- **Area**: mass_util sortAmino
- **Type**: branch
- **Precondition**: no RNA
- **Steps**: 1. Run mass-only calc. 2. Inspect order.
- **Expected**: Sorted by |weight − targetMass| ascending only.
- **Ref**: mts-mass-formula-cases §7; mts-decision-flow §5.1

### TC-MTS-60: CSV export downloads dated file
- **Area**: ResultTable downloadExcel
- **Type**: happy
- **Precondition**: results present
- **Steps**: 1. Click "Download Excel".
- **Expected**: A CSV (`text/csv`) downloads named `mass_finder_results_YYYY-MM-DD.csv` containing header + result rows.
- **Ref**: ResultTable.svelte:24-93

### TC-MTS-61: Results table hidden until results exist
- **Area**: /mts conditional render
- **Type**: edge
- **Precondition**: no calc yet
- **Steps**: 1. Load page.
- **Expected**: ResultTable not shown (needs detectedMass≠null AND bestSolutions.length>0).
- **Ref**: +page.svelte:666-674

### TC-MTS-62: Web worker runs calculation off main thread (no UI freeze)
- **Area**: mass_finder.worker.ts integration
- **Type**: happy
- **Precondition**: heavy config (Deep think 50000)
- **Steps**: 1. Set iterations 50000, mass 3000. 2. Predict. 3. Interact with the page during calc.
- **Expected**: Loading spinner shows; UI stays responsive; on `type:'success'` results populate; console logs timing.
- **Ref**: +page.svelte:119-142; mts-algorithm-simulated-annealing (web worker)

### TC-MTS-63: Worker error handled gracefully
- **Area**: worker.onmessage/onerror
- **Type**: edge
- **Precondition**: input that triggers worker error (e.g., malformed data path)
- **Steps**: 1. Force worker to emit `type:'error'` or throw.
- **Expected**: Alert "An error occurred while calculating" (title Error); loading cleared; no unhandled exception.
- **Ref**: +page.svelte:136-148,173-177

### TC-MTS-64: Worker terminated on component destroy
- **Area**: onDestroy
- **Type**: edge
- **Precondition**: worker created via a prior calc
- **Steps**: 1. Run a calc. 2. Navigate away from /mts.
- **Expected**: `worker.terminate()` called; no leaked worker.
- **Ref**: +page.svelte:65-69

### TC-MTS-65: Amino set exclusion affects SA search pool
- **Area**: AminoMapSelector → excludedAA
- **Type**: branch
- **Precondition**: no RNA (pure mass), uncheck several standard AAs
- **Steps**: 1. Uncheck W, C, M in Amino set. 2. Predict.
- **Expected**: `selectedMonoisotopicAminos`/monoisotopicMap exclude those letters; result sequences never contain W/C/M.
- **Ref**: +page.svelte:201-207,343-345

### TC-MTS-66: ncAA codon assignment is optional in MTS (info note)
- **Area**: NcAACodonSelector info banner
- **Type**: happy
- **Precondition**: ncAA slot selected without codon
- **Steps**: 1. Assign an ncAA molecule to slot B but leave its codon blank. 2. Predict.
- **Expected**: Info note states codons only affect reference alignment, not mass; ncAA usable as generic mass candidate; calc proceeds using the ncAA mass.
- **Ref**: +page.svelte:588-594

### TC-MTS-67: Fixed-only sufficient — empty gap result (legacy adjustedTarget≤1)
- **Area**: calc Case A / template Case 2
- **Type**: boundary
- **Precondition**: fixed segment mass ≈ target
- **Steps**: 1. Construct template where fixed net mass ≈ detected mass (adjustedTarget ≤ 1.0). 2. Predict.
- **Expected**: An empty-gap (code:"") fixed-only solution is produced; SA loop still tries other gapLens.
- **Ref**: mts-decision-flow §3.2; mts-template-gap-cases §3.2

### TC-MTS-68: Multi-gap distribution rounds and last gap absorbs remainder
- **Area**: assembleTemplateResult gapDistribution
- **Type**: branch
- **Precondition**: template with 2 gaps (lengths 5 and 3), SA finds 10 gap aminos
- **Steps**: 1. Set up two variable zones. 2. Predict.
- **Expected**: gap[0] gets round(10×5/8)=6, gap[1] gets remainder 4 (sum 10); assembled full sequence correct, mass recomputed via getMonoisotopicWeightSum.
- **Ref**: mts-template-gap-cases §4

### TC-MTS-69: Special-stop tiles excluded from ncAA toggle
- **Area**: PeptideSequenceSelector handleAminoClick early-return
- **Type**: edge
- **Precondition**: a special-stop (orange) position exists
- **Steps**: 1. Click the orange diagonal special-stop tile.
- **Expected**: No ncAA zone created (toggle skipped); resolved only via codon/ncAA assignment.
- **Ref**: mts-template-gap-cases special-state tiles; PeptideSequenceSelector.svelte:84

### TC-MTS-70: Formylation prefix stripped for similarity comparison
- **Area**: sequence similarity calc
- **Type**: edge
- **Precondition**: formylation yes + RNA reference
- **Steps**: 1. Formylation "yes", RNA reference set. 2. Predict.
- **Expected**: Similarity compares sequences with leading `f` removed on both result and reference (no false mismatch from the f-prefix).
- **Ref**: mts-sa-algorithm-internals §5; mts-mass-formula-cases §1

---

## 2. STM (Sequence to Mass) — 78 cases

> RF1 codons = `['UAA','UAG']`, RF2 codons = `['UAA','UGA']`. Adduct selector offers 8 ions (+H,+Na,+K,+NH₄,-H,-Na,-K,-NH₄) and dispatches `['none']` only when all deselected. SeqConverter strips whitespace / uppercases / T→U but does NOT strip non-AUGC letters (they survive in rnaSeq; only the peptide preview shows `?`).

### TC-STM-01: Empty RNA input rejected
- **Area**: /stm/+page.svelte `_validateCheck`
- **Type**: validation
- **Precondition**: RNA input empty, defaults otherwise
- **Steps**: 1. Leave RNA field blank 2. Click "Calculate mass"
- **Expected**: Alert "Please enter RNA sequence." (Validation Error, warning); no results; loading cleared
- **Ref**: stm-input-validation-cases §1; +page.svelte:87-89

### TC-STM-02: Literal "?" in sequence rejected
- **Area**: /stm/+page.svelte `_validateCheck`
- **Type**: validation
- **Precondition**: RF default (all stops active)
- **Steps**: 1. Enter `AUG?CC` 2. Click Calculate
- **Expected**: Alert "Please enter the correct sequence."; calculation blocked
- **Ref**: stm-input-validation-cases §1; +page.svelte:92-93

### TC-STM-03: Length not multiple of 3 rejected
- **Area**: /stm/+page.svelte `_validateCheck`
- **Type**: validation
- **Precondition**: none
- **Steps**: 1. Enter `AUGCC` (5 chars) 2. Click Calculate
- **Expected**: Alert "RNA sequence length must be a multiple of 3."
- **Ref**: stm-input-validation-cases §1; +page.svelte:97-98

### TC-STM-04: Valid 3-char sequence passes validation
- **Area**: /stm/+page.svelte `_validateCheck`
- **Type**: happy
- **Precondition**: no ncAA selected, adduct +H
- **Steps**: 1. Enter `AUG` 2. Click Calculate
- **Expected**: Validation passes; note single-AA `M` (length 1) is filtered out by MIN_SEQUENCE_LENGTH so result table may be empty
- **Ref**: stm-input-validation-cases §1; stm-mass-formula-cases §6; stm-core.ts:314

### TC-STM-05: Whitespace and newlines stripped from input
- **Area**: SeqConverter `updateSequences`
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Type `AUG CCC\nGGG` with spaces/newline into RNA field
- **Expected**: rnaSeq becomes `AUGCCCGGG`; RNA preview shows codons AUG CCC GGG
- **Ref**: SeqConverter.svelte:28,45-49

### TC-STM-06: DNA T auto-converted to RNA U
- **Area**: SeqConverter `replaceTwithU`
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Type `ATGTTT`
- **Expected**: rnaSeq becomes `AUGUUU`; peptide preview `MF`
- **Ref**: SeqConverter.svelte:58-60

### TC-STM-07: Lowercase input uppercased
- **Area**: SeqConverter `handleInputToUpper`
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Type `auggcc`
- **Expected**: rnaSeq `AUGGCC`; peptide preview `MA`
- **Ref**: SeqConverter.svelte:53-55

### TC-STM-08: Non-AUGC base survives in rnaSeq, peptide shows "?"
- **Area**: SeqConverter `translateRNAtoPeptide` + validation
- **Type**: edge
- **Precondition**: RF default
- **Steps**: 1. Enter `AUGZZZ` (Z not a base, not stripped) 2. Observe peptide preview 3. Click Calculate
- **Expected**: Peptide preview renders `M?` for unmapped codon `ZZZ`; rnaSeq keeps `AUGZZZ` (no literal `?`), so `_validateCheck` does not block on the "?" rule; unmapped codon yields no natural AA
- **Ref**: SeqConverter.svelte:22,49; +page.svelte:92; stm-input-validation-cases §1

### TC-STM-09: Peptide preview updates live per codon
- **Area**: SeqConverter reactive block
- **Type**: happy
- **Precondition**: none
- **Steps**: 1. Enter `AUGGCCAUU`
- **Expected**: Peptide preview shows `MAI`; RNA preview shows 3 codons with position numbers
- **Ref**: SeqConverter.svelte:163-185

### TC-STM-10: Stop codon trimmed before calc (default RF)
- **Area**: getSequenceBeforeStop
- **Type**: branch
- **Precondition**: RF1+RF2 default (activeStopCodons = UAA/UAG/UGA)
- **Steps**: 1. Enter `AUGGCCUAACGU` 2. Click Calculate
- **Expected**: Only `AUGGCC` (→ MA) is computed; codons at/after `UAA` dropped
- **Ref**: stm-input-validation-cases §2a; +page.svelte:195-216

### TC-STM-11: Sequence with stop but length still multiple of 3 passes validation
- **Area**: _validateCheck + getSequenceBeforeStop ordering
- **Type**: branch
- **Precondition**: RF default
- **Steps**: 1. Enter `AUGUAACGU` (9 chars) 2. Click Calculate
- **Expected**: Passes length check; getSequenceBeforeStop trims to `AUG` before validation; downstream computes trimmed seq
- **Ref**: stm-input-validation-cases §1-2; +page.svelte:61-62

### TC-STM-12: No stop codon → full sequence computed
- **Area**: getSequenceBeforeStop
- **Type**: branch
- **Precondition**: RF default
- **Steps**: 1. Enter `AUGGCCAUUAAC` (no stop) 2. Calculate
- **Expected**: Returns full sequence unchanged (stopIndex -1); all codons computed
- **Ref**: stm-input-validation-cases §2a; +page.svelte:212

### TC-STM-13: Both release factors off → no stop trimming
- **Area**: ReleaseFactorSelector → activeStopCodons=[]
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Uncheck RF1 and RF2 2. Enter `AUGUAACGU` 3. Calculate
- **Expected**: activeStopCodons=[]; getSequenceBeforeStop returns full seq; `UAA` treated as normal codon (no trim); full sequence computed
- **Ref**: stm-input-validation-cases §5; ReleaseFactorSelector.svelte; stm-core.ts:227-235

### TC-STM-14: RF1 only trims UAA/UAG but not UGA
- **Area**: ReleaseFactorSelector.computeStopCodons
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Uncheck RF2, keep RF1 → activeStopCodons=['UAA','UAG'] 2. Enter `AUGGCCUGAAUU` 3. Calculate
- **Expected**: `UGA` NOT treated as stop; full sequence computed (MA then UGA-coded AA etc.)
- **Ref**: ReleaseFactorSelector.svelte:7,11; stm-input-validation-cases §5

### TC-STM-15: RF2 only trims UAA/UGA but not UAG
- **Area**: ReleaseFactorSelector.computeStopCodons
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Uncheck RF1, keep RF2 → activeStopCodons=['UAA','UGA'] 2. Enter `AUGGCCUAGAUU` 3. Calculate
- **Expected**: `UAG` NOT a stop; full sequence computed; `UAA`/`UGA` would still trim
- **Ref**: ReleaseFactorSelector.svelte:8; stm-input-validation-cases §5

### TC-STM-16: Default both RF selected gives UAA/UAG/UGA union
- **Area**: ReleaseFactorSelector default state
- **Type**: happy
- **Precondition**: page freshly loaded
- **Steps**: 1. Observe both RF checkboxes checked
- **Expected**: activeStopCodons = ['UAA','UAG','UGA']; all three trigger trim
- **Ref**: +page.svelte:25; ReleaseFactorSelector.svelte:11

### TC-STM-17: RF toggle after calc re-trims on recalc (input unmutated)
- **Area**: getSequenceBeforeStop non-mutating
- **Type**: regression
- **Precondition**: `AUGUAACGU` entered, RF default → computed as `AUG`
- **Steps**: 1. Calculate (result from AUG) 2. Uncheck both RF 3. Calculate again
- **Expected**: Second calc uses full `AUGUAACGU` because rnaSeq was never mutated by first trim
- **Ref**: stm-input-validation-cases §2a note; +page.svelte:195

### TC-STM-18: ncAA selected but no codon assigned → blocked
- **Area**: checkCustomCodonTitles1
- **Type**: validation
- **Precondition**: ncAA B set to nonzero mass, codonTitles.B = []
- **Steps**: 1. Enable ncAA B with a mass 2. Leave B codon list empty 3. Calculate
- **Expected**: Alert "Codon name was not entered in the selected non-canonical amino acids used value."
- **Ref**: stm-input-validation-cases §3.1; +page.svelte:102-108,124-137

### TC-STM-19: ncAA with assigned valid codon passes
- **Area**: checkCustomCodonTitles1/2
- **Type**: happy
- **Precondition**: ncAA B mass defined, B codons=['UAG'], RF off (so UAG not trimmed)
- **Steps**: 1. Enter `AUGUAGUUU` 2. Calculate
- **Expected**: Validation passes; B incorporated at position 2 with full-incorporation and skipping variants
- **Ref**: stm-input-validation-cases §3.1; stm-ncaa-variant-type-cases §1

### TC-STM-20: ncAA codon not in codon table → blocked with message
- **Area**: checkCustomCodonTitles2
- **Type**: validation
- **Precondition**: ncAA B mass defined, B codons=['XYZ'] (not in codonTableRtoS)
- **Steps**: 1. Assign codon `XYZ` to B 2. Calculate
- **Expected**: Alert "Codon XYZ is not mapped in RNA"
- **Ref**: stm-input-validation-cases §3.2; +page.svelte:139-168

### TC-STM-21: Multiple unmapped ncAA codons listed multi-line
- **Area**: checkCustomCodonTitles2 message builder
- **Type**: edge
- **Precondition**: B codons=['XYZ'], J codons=['QQQ']
- **Steps**: 1. Assign both invalid codons 2. Calculate
- **Expected**: Alert lists both: "Codon XYZ is not mapped in RNA\nCodon QQQ is not mapped in RNA"
- **Ref**: +page.svelte:149-162

### TC-STM-22: ncAA codon absent from RNA input → warning only, not blocking
- **Area**: NcAACodonSelectItem missingCodons warning
- **Type**: branch
- **Precondition**: ncAA B codons=['UAG'], RNA `AUGGCC` (no UAG)
- **Steps**: 1. Assign UAG to B 2. Observe selector warning
- **Expected**: Warning "The selected codon is not present in the RNA sequence. (UAG)"; Calculate NOT blocked
- **Ref**: stm-input-validation-cases §3.3

### TC-STM-23: ncAA with zero mass removed before calc
- **Area**: removeZeroValueNcAA
- **Type**: branch
- **Precondition**: ncAA B = 0.0 (mass undefined)
- **Steps**: 1. Enable B slot but leave mass 0 2. Calculate
- **Expected**: B excluded from filteredNcAA (not passed to calc, not added as 0 to base); no B variants generated
- **Ref**: stm-mass-formula-cases §7; +page.svelte:184-190

### TC-STM-24: No ncAA selected → warning banner above results
- **Area**: noNcAASelected flag
- **Type**: branch
- **Precondition**: no ncAA enabled, valid RNA producing ≥1 result
- **Steps**: 1. Enter `AUGGCC` 2. Calculate
- **Expected**: "No ncAA has been selected" banner shown; calculation still runs and results display
- **Ref**: stm-input-validation-cases §7; +page.svelte:66,298-300

### TC-STM-25: Base weight = Σ(AA) − water×(n−1) for MAI
- **Area**: stm-core.ts base weight
- **Type**: happy
- **Precondition**: standard AAs active, adduct none
- **Steps**: 1. Enter `AUGGCCAUU` (MAI) with adduct 'none' 2. Calculate
- **Expected**: monoisotopic base ≈ 333.172 (369.19335 − 36.02112); check row weight column ≈ 333.172
- **Ref**: stm-mass-formula-cases §1; stm-core.ts:317-334

### TC-STM-26: Water loss = 0 for single residue (n=1)
- **Area**: getWaterWeight(n)=18.01056×(n−1)
- **Type**: boundary
- **Precondition**: n/a
- **Steps**: 1. Reason about a 1-AA sequence
- **Expected**: getWaterWeight(1)=0; but 1-AA sequences are filtered out (≤ MIN_SEQUENCE_LENGTH), so not observable in results
- **Ref**: stm-mass-formula-cases §1,§6; stm-core.ts:11,314

### TC-STM-27: +H adduct adds +1.00728
- **Area**: getIonWeight / adduct branch
- **Type**: happy
- **Precondition**: adduct=['+H'] (default)
- **Steps**: 1. Enter `AUGGCCAUU` 2. Calculate
- **Expected**: weight = base + 1.00728; Adduct column shows +H
- **Ref**: stm-mass-formula-cases §3; stm-core.ts:521-530

### TC-STM-28: 'none' adduct adds 0
- **Area**: adduct branch, ionType==='none'
- **Type**: branch
- **Precondition**: deselect all adducts → selector dispatches ['none']
- **Steps**: 1. Uncheck +H 2. Calculate `AUGGCCAUU`
- **Expected**: adductWeight=0; weight = base; Adduct column shows [M]/'-'; info alert "No adduct selected - will show as [M]"
- **Ref**: stm-mass-formula-cases §3; StmAdductSelector.svelte:29,80-84; stm-core.ts:522

### TC-STM-29: Multiple adducts multiply result rows
- **Area**: adduct loop
- **Type**: branch
- **Precondition**: select +H and +Na
- **Steps**: 1. Check +H and +Na 2. Calculate `AUGGCCAUU`
- **Expected**: Two rows per sequence: one +H (base+1.00728), one +Na (base+22.98977)
- **Ref**: stm-mass-formula-cases §3; stm-input-validation-cases §4

### TC-STM-30: Negative adduct −H subtracts 1.00728
- **Area**: getIonWeight negative ions
- **Type**: branch
- **Precondition**: select only −H
- **Steps**: 1. Uncheck +H, check −H 2. Calculate `AUGGCCAUU`
- **Expected**: weight = base − 1.00728; Adduct column shows −H
- **Ref**: stm-mass-formula-cases §3; StmAdductSelector.svelte:13

### TC-STM-31: +NH₄ and +K adduct shifts
- **Area**: getIonWeight
- **Type**: branch
- **Precondition**: select +NH₄ and +K
- **Steps**: 1. Check +NH₄, +K 2. Calculate `AUGGCCAUU`
- **Expected**: Rows with +18.03437 (+NH₄) and +38.96371 (+K)
- **Ref**: stm-mass-formula-cases §3

### TC-STM-32: Full ncAA incorporation variant generated
- **Area**: generatePossibilities full-incorp option
- **Type**: branch
- **Precondition**: ncAA B mass defined, B codon = one codon present in RNA, RF off if using a stop codon
- **Steps**: 1. RNA `AUG<Bcodon>UUU`, assign codon to B 2. Calculate
- **Expected**: A result where position 2 is B (letter=candidate.title, non-natural, red styling)
- **Ref**: stm-ncaa-variant-type-cases §1; stm-core.ts:69-73

### TC-STM-33: ncAA skipping variant generated (empty letter)
- **Area**: generatePossibilities skipping option
- **Type**: branch
- **Precondition**: same as TC-32
- **Steps**: 1. Calculate
- **Expected**: A result where the ncAA codon is skipped (letter=""), shorter displayed sequence; reason classification applies (see TC-40..44)
- **Ref**: stm-ncaa-variant-type-cases §1,§4; stm-core.ts:76-80

### TC-STM-34: 2^M possibility count for M ncAA codons
- **Area**: recursive generation combinatorics
- **Type**: boundary
- **Precondition**: single ncAA type over M codons
- **Steps**: 1. RNA with 2 ncAA-assigned codons 2. Calculate
- **Expected**: Up to 2^2=4 base combinations (full/skip each) before truncation post-pass and filtering
- **Ref**: stm-ncaa-variant-type-cases §6

### TC-STM-35: Memoization keyed by index (correctness)
- **Area**: generatePossibilities memo Map
- **Type**: regression
- **Precondition**: repeated codons in sequence
- **Steps**: 1. RNA `AUGAUGAUG` 2. Calculate
- **Expected**: Correct enumeration without duplication artifacts; memo key `${index}` reused per position
- **Ref**: stm-algorithm-recursive-sequence-generation; stm-core.ts:48

### TC-STM-36: Reinitiation post-pass when ncAA index > 0
- **Area**: truncation post-pass (internal initiation)
- **Type**: branch
- **Precondition**: ncAA at position index 1 (not first)
- **Steps**: 1. RNA `AUG<Bcodon>UUUAAA`, B at index 1, RF off 2. Calculate
- **Expected**: A truncated reinitiation result starting at index 1 (e.g. `B F K`), first letter marked internalInitiation; reason "Reinitiation"
- **Ref**: stm-ncaa-variant-type-cases §2; stm-core.ts:261-279

### TC-STM-37: No reinitiation post-pass when ncAA at index 0
- **Area**: reinitiation boundary (truncationIndex>0)
- **Type**: boundary
- **Precondition**: ncAA codon is the first codon
- **Steps**: 1. RNA `<Bcodon>UUUAAA` with B at index 0 2. Calculate
- **Expected**: Reinitiation post-pass skipped (truncationIndex=0 fails `>0`)
- **Ref**: stm-ncaa-variant-type-cases §2 case table; stm-core.ts:261,73

### TC-STM-38: Premature termination post-pass when ncAA before last codon
- **Area**: truncation post-pass (premature)
- **Type**: branch
- **Precondition**: ncAA at index 2 in a 5-codon sequence
- **Steps**: 1. 5-codon RNA with ncAA at index 2 2. Calculate
- **Expected**: generatePossibilitiesRange(0,3,...) result, last letter marked prematureTermination; reason "Premature termination"; no skipping variants inside premature range
- **Ref**: stm-ncaa-variant-type-cases §3; stm-core.ts:282-302

### TC-STM-39: No premature post-pass when ncAA at last codon
- **Area**: premature boundary (truncationIndex < len−1)
- **Type**: boundary
- **Precondition**: ncAA at final codon index
- **Steps**: 1. 5-codon RNA, ncAA at index 4 2. Calculate
- **Expected**: Premature post-pass skipped (4 < 4 false)
- **Ref**: stm-ncaa-variant-type-cases §3 case table; stm-core.ts:283

### TC-STM-40: Reason empty for all-natural sequence
- **Area**: reason classification
- **Type**: happy
- **Precondition**: no ncAA, standard sequence
- **Steps**: 1. RNA `AUGGCCAUUAAC` 2. Calculate
- **Expected**: Result rows have empty Note; reasons=[]
- **Ref**: stm-reason-classification-cases Case 1

### TC-STM-41: Leading consecutive skips classified as Reinitiation
- **Area**: reason classification start-skip
- **Type**: branch
- **Precondition**: variant with skips at start and real AA after
- **Steps**: 1. Produce sequence `[skip][skip] A M I` 2. Inspect Note
- **Expected**: Note shows "Reinitiation" once (not duplicated)
- **Ref**: stm-reason-classification-cases Case 2,6; stm-core.ts:468-475

### TC-STM-42: Trailing consecutive skips classified as Premature termination
- **Area**: reason classification end-skip
- **Type**: branch
- **Precondition**: variant with real AA then trailing skips
- **Steps**: 1. Produce sequence `A M I [skip][skip]` 2. Inspect Note
- **Expected**: Note "Premature termination"
- **Ref**: stm-reason-classification-cases Case 3; stm-core.ts:479-486

### TC-STM-43: Middle-only skips classified as Ribosome skipping (per count)
- **Area**: reason classification middle-skip
- **Type**: branch
- **Precondition**: variant `A [skip] M [skip] I N`
- **Steps**: 1. Produce sequence with two internal skips 2. Inspect Note
- **Expected**: Note "Ribosome skipping (x2)" (two occurrences)
- **Ref**: stm-reason-classification-cases Case 4; stm-core.ts:489-508

### TC-STM-44: Mixed start+middle+end skips give all three reasons
- **Area**: reason classification combined
- **Type**: edge
- **Precondition**: `[skip][skip] A [skip] M I [skip][skip][skip]`
- **Steps**: 1. Produce mixed variant 2. Inspect Note
- **Expected**: reasons = Reinitiation, Ribosome skipping, Premature termination
- **Ref**: stm-reason-classification-cases Case 5

### TC-STM-45: Explicit truncation flag not double-counted with leading skip
- **Area**: reason dedup guard (!hasInternalInitiation)
- **Type**: regression
- **Precondition**: sequence has internalInitiation=true and leading skips
- **Steps**: 1. Produce reinitiation variant that also has leading skip 2. Inspect Note
- **Expected**: "Reinitiation" appears only once
- **Ref**: stm-reason-classification-cases Case 6; stm-core.ts:472-475

### TC-STM-46: All-skip sequence filtered out (no reason emitted)
- **Area**: reclassification guard + MIN_SEQUENCE_LENGTH
- **Type**: edge
- **Precondition**: a variant where every codon skipped
- **Steps**: 1. Force all-skip variant 2. Check results
- **Expected**: length 0 → filtered out; not shown; no Reinitiation/Premature misclassification
- **Ref**: stm-reason-classification-cases Case 7; stm-core.ts:314,468-470

### TC-STM-47: Single-site N-terminus modification prepends prefix
- **Area**: single-site N-term application
- **Type**: branch
- **Precondition**: N-terminus mod f1 target 'All', standard sequence MAI
- **Steps**: 1. Add f1 (N-terminus) 2. Calculate `AUGGCCAUU`
- **Expected**: A result `f1MAI` with +modDelta; Note shows mod name; also unmodified `MAI` present (0-or-1 combination)
- **Ref**: stm-modification-system §2; stm-core.ts:339-344

### TC-STM-48: Single-site C-terminus modification appends suffix
- **Area**: single-site C-term application
- **Type**: branch
- **Precondition**: C-terminus mod n1 target 'All'
- **Steps**: 1. Add n1 (C-terminus) 2. Calculate `AUGGCCAUU`
- **Expected**: Result `MAIn1` with +modDelta; plus unmodified variant
- **Ref**: stm-modification-system §2

### TC-STM-49: N-term + C-term combination matrix (no two same-terminus at once)
- **Area**: single-site combination generation
- **Type**: branch
- **Precondition**: N-term mods f1,f2 and C-term mods n1,n2
- **Steps**: 1. Add all four 2. Calculate `AUGGCCAUU`
- **Expected**: 9 combinations (3 N-options × 3 C-options); never f1+f2 together nor n1+n2 together
- **Ref**: stm-modification-system §2.1 case table

### TC-STM-50: Target-specific single-site applies only when terminal AA matches
- **Area**: target branch (`mod.target===AA` vs 'All')
- **Type**: branch
- **Precondition**: N-term mod f1 target='M'
- **Steps**: 1. Calculate `AUGUCU` (MS, starts M) then `GCCUCU` (AS, starts A)
- **Expected**: `MS`→`f1MS` produced; `AS`→ not modified (only `AS`)
- **Ref**: stm-modification-system §2.2; stm-core.ts:363,391

### TC-STM-51: 'All' target literal case-sensitivity
- **Area**: target==='All'
- **Type**: edge
- **Precondition**: mod target literal must be exactly 'All'
- **Steps**: 1. Configure mod with target 'All'
- **Expected**: Applies to every terminal AA; 'ALL' (all caps) would not match
- **Ref**: stm-modification-system §2.2 note; stm-core.ts:363,391

### TC-STM-52: N-term suppressed on reinitiation-truncated sequence
- **Area**: single-site constraint on truncated seq
- **Type**: branch
- **Precondition**: reinitiation variant (hasInternalInitiationAtStart) + N-term mod
- **Steps**: 1. Enable N-term mod 2. Produce reinitiation variant
- **Expected**: N-term mod NOT applied to reinitiation-start sequence; C-term still allowed
- **Ref**: stm-modification-system §2.3; stm-core.ts:359

### TC-STM-53: C-term suppressed on premature-termination sequence
- **Area**: single-site constraint on truncated seq
- **Type**: branch
- **Precondition**: premature variant (hasPrematureTerminationAtEnd) + C-term mod
- **Steps**: 1. Enable C-term mod 2. Produce premature variant
- **Expected**: C-term mod NOT applied; N-term still allowed
- **Ref**: stm-modification-system §2.3; stm-core.ts:380

### TC-STM-54: Side-chain modification count-based variants (0..N)
- **Area**: applySideChainRecursive / generateSideChainVariants
- **Type**: branch
- **Precondition**: side-chain mod d1 target=C; sequence MCCCRRC (4 C)
- **Steps**: 1. Add side-chain d1 2. Calculate the C-rich sequence
- **Expected**: 5 variants (applyCount 0–4), left-to-right substitution `Md1CCRRC`, `Md1d1CRRC`, …; not positional combinations
- **Ref**: stm-modification-system §3 case table; stm-side-chain.ts:48-70,99-114

### TC-STM-55: Side-chain mass = base − target×N + modAbs×N
- **Area**: side-chain mass formula
- **Type**: branch
- **Precondition**: d1 target=C(121.0), modAbs=165.0
- **Steps**: 1. applyCount=1 on MCCC 2. Check weight
- **Expected**: weight = base − 121 + 165 = base + 44; applyCount=2 → base+88
- **Ref**: stm-mass-formula-cases §2.1; stm-side-chain.ts:145-146

### TC-STM-56: Crosslinking non-overlapping pair combinations
- **Area**: generateNonOverlappingCombinations backtracking
- **Type**: branch
- **Precondition**: C-C ADJACENT crosslink dC; sequence MCCSTINCCM (pairs (1,2),(7,8))
- **Steps**: 1. Add C-C ADJACENT crosslink 2. Calculate
- **Expected**: 4 results: none, (1,2), (7,8), (1,2)+(7,8); overlapping pairs never combined
- **Ref**: stm-modification-system §4 case table; stm-crosslinking.ts:267-330

### TC-STM-57: Crosslinking mass reduction per pair (disulfide-like)
- **Area**: crosslinking mass formula
- **Type**: branch
- **Precondition**: target1=target2=C (121.00410), modAbs=240.292
- **Steps**: 1. Apply 1 pair on MCC 2. Check weight
- **Expected**: weight = base − 242.008 + 240.292 ≈ base − 1.716 (approx disulfide −2.02 depending on modAbs)
- **Ref**: stm-mass-formula-cases §2.2,§4; stm-crosslinking.ts:170

### TC-STM-58: Crosslinking ADJACENT requires distance 0
- **Area**: findValidCrosslinkingPairs ADJACENT
- **Type**: branch
- **Precondition**: ADJACENT condition, C at non-adjacent positions
- **Steps**: 1. Sequence `MCSTC` (C at idx1 and idx4) with ADJACENT crosslink 2. Calculate
- **Expected**: No valid pair (distance=2≠0); only 0-pair result
- **Ref**: stm-modification-system §4; stm-crosslinking.ts:229-230

### TC-STM-59: Crosslinking DISTANCE operator '=' matches exact gap
- **Area**: findValidCrosslinkingPairs DISTANCE '='
- **Type**: branch
- **Precondition**: DISTANCE, distanceValue=2, operator '='
- **Steps**: 1. Sequence `MCSTC` (C idx1,idx4 → distance=2) 2. Calculate
- **Expected**: Pair (1,4) valid (distance===2); crosslinked result produced
- **Ref**: stm-modification-system §4; stm-crosslinking.ts:235-236

### TC-STM-60: Crosslinking DISTANCE '<' and '>' operators
- **Area**: findValidCrosslinkingPairs DISTANCE '<'/'>'
- **Type**: branch
- **Precondition**: DISTANCE distanceValue=3 with operator '<' then '>'
- **Steps**: 1. Two C's with distance 2 2. Test operator '<' (2<3 true) then '>' (2>3 false)
- **Expected**: '<' produces the pair; '>' produces none
- **Ref**: stm-modification-system §4; stm-crosslinking.ts:237-240

### TC-STM-61: Crosslinking capped at maxSize 5 pairs
- **Area**: generateNonOverlappingCombinations maxSize
- **Type**: boundary
- **Precondition**: sequence with ≥6 valid non-overlapping pairs
- **Steps**: 1. Provide 12+ C's adjacent-pairable 2. Calculate with C-C crosslink
- **Expected**: No combination exceeds 5 pairs (combos with 6+ pairs not generated)
- **Ref**: stm-modification-system §4; stm-crosslinking.ts:267,269

### TC-STM-62: Crosslink reason shows (xN) pair count
- **Area**: crosslinking reason label
- **Type**: branch
- **Precondition**: two pairs applied
- **Steps**: 1. Apply both pairs in MCCSTINCCM 2. Inspect Note
- **Expected**: Note "dC (x2)"; single pair shows "dC (x1)"/"dC"
- **Ref**: stm-reason-classification-cases table; stm-crosslinking.ts:177

### TC-STM-63: Potential modification cap at 4 selections
- **Area**: PotentialModificationSelector max
- **Type**: boundary
- **Precondition**: 4 mods already selected
- **Steps**: 1. Attempt to select a 5th potential modification
- **Expected**: UI blocks selection beyond 4
- **Ref**: stm-input-validation-cases §8

### TC-STM-64: Modification target absent → only 0-applied case
- **Area**: modification application when target missing
- **Type**: edge
- **Precondition**: side-chain/crosslink target=W but no W in sequence
- **Steps**: 1. Add mod targeting W 2. Calculate `AUGGCCAUU` (no W)
- **Expected**: Only unmodified sequence produced (0 applications)
- **Ref**: stm-input-validation-cases §8

### TC-STM-65: sequenceString modification priority order
- **Area**: sequenceString builder priority
- **Type**: branch
- **Precondition**: a position that is crosslinked and also has single-site N-term
- **Steps**: 1. Produce overlapping mod display 2. Inspect rendered sequence cell
- **Expected**: Priority crosslink > side-chain > single-site > base letter; N/C-term single-site merged as prefix/suffix around crosslink glyph
- **Ref**: stm-modification-system §6; StmResultTable.svelte:215

### TC-STM-66: Byproducts toggle ON shows reason-tagged rows
- **Area**: showByproducts filter
- **Type**: branch
- **Precondition**: results include some with reasons
- **Steps**: 1. Keep "Potential byproducts" ON (default) 2. Calculate a sequence with ncAA variants
- **Expected**: Rows with non-empty Note (Reinitiation, skipping, mods) are shown
- **Ref**: stm-reason-classification-cases toggle; StmResultTable.svelte:86-88

### TC-STM-67: Byproducts toggle OFF hides all reason rows
- **Area**: showByproducts filter
- **Type**: branch
- **Precondition**: mixed results
- **Steps**: 1. Turn "Potential byproducts" OFF 2. Observe table
- **Expected**: Only rows with reasons.length===0 remain; modification-tagged rows (e.g. `d1 (x2)`) hidden too
- **Ref**: stm-input-validation-cases §9; StmResultTable.svelte:89-91

### TC-STM-68: Filter-by-reason checkboxes narrow results
- **Area**: selectedFilters dynamic filter
- **Type**: branch
- **Precondition**: results contain Reinitiation and Ribosome skipping
- **Steps**: 1. Check "Reinitiation" filter 2. Observe
- **Expected**: Only rows whose reasons (base names, xN stripped) include Reinitiation shown; count-suffix stripped for match
- **Ref**: StmResultTable.svelte:22-55

### TC-STM-69: Default result order is unsorted (generation order)
- **Area**: sortState all 0
- **Type**: happy
- **Precondition**: fresh results
- **Steps**: 1. Calculate; do not click any header
- **Expected**: Rows in generation order; no target-mass "Match" sort exists
- **Ref**: stm-mass-formula-cases §8; StmResultTable.svelte:15-19,80

### TC-STM-70: Monoisotopic weight sort cycles asc/desc/none
- **Area**: handleSort monoisotopicWeight
- **Type**: branch
- **Precondition**: ≥2 result rows
- **Steps**: 1. Click "Monoisotopic Weight" header 3 times
- **Expected**: 1st→ascending (↑), 2nd→descending (↓), 3rd→unsorted (↕); other columns reset
- **Ref**: stm-mass-formula-cases §8; StmResultTable.svelte:99-107

### TC-STM-71: Molecular weight and sequence-length sorts
- **Area**: handleSort molecularWeight / sequence
- **Type**: branch
- **Precondition**: ≥2 rows of differing length/mass
- **Steps**: 1. Click Molecular Weight header (asc) 2. Click Sequence header (asc)
- **Expected**: Molecular weight sorts by molecularWeight; Sequence sorts by non-empty letter count; selecting one resets the others
- **Ref**: StmResultTable.svelte:64-78,101-103

### TC-STM-72: Deduplication removes identical seq+adduct+weights
- **Area**: removeDuplicateSequences
- **Type**: regression
- **Precondition**: inputs yielding duplicate variants (e.g. skip producing same seq)
- **Steps**: 1. Construct case with two identical outputs 2. Calculate
- **Expected**: Single row per unique key `sequenceString|adduct|weight(5)|molecularWeight(5)`
- **Ref**: stm-modification-system §8; stm-utils.ts:71-86

### TC-STM-73: Crosslinking internal dedup pass
- **Area**: applyCrosslinkingModifications dedup
- **Type**: regression
- **Precondition**: crosslink combos producing same sequenceString+pattern+adduct
- **Steps**: 1. Apply crosslinking with symmetric pairs 2. Calculate
- **Expected**: Duplicate crosslink patterns collapsed by key `sequenceString-C{pattern}-adduct` before final dedup
- **Ref**: stm-modification-system §7; stm-crosslinking.ts:59-75

### TC-STM-74: Runtime displayed after calculation
- **Area**: runtimeMs display
- **Type**: happy
- **Precondition**: valid calc producing results
- **Steps**: 1. Calculate any valid sequence
- **Expected**: "Runtime: N.N ms" shown above table (only when runtimeMs>0)
- **Ref**: stm-mass-formula-cases §9; StmResultTable.svelte:152-153

### TC-STM-75: Validation failure early-returns without runtime/results
- **Area**: _onTapCalcButton finally + early return
- **Type**: regression
- **Precondition**: invalid input (empty)
- **Steps**: 1. Click Calculate with empty RNA
- **Expected**: loading reset to false; possibilities unchanged; no runtime shown; alert displayed
- **Ref**: +page.svelte:58-83

### TC-STM-76: Save and Load RNA sequence round-trip
- **Area**: SeqConverter Save/Load dialogs + storage
- **Type**: happy
- **Precondition**: none
- **Steps**: 1. Enter `AUGGCCAUU`, click Save with a title 2. Clear input 3. Load saved entry
- **Expected**: Saved under savedRnaSeqs; Load repopulates input and re-runs updateSequences (peptide preview restored)
- **Ref**: SeqConverter.svelte:62-80

### TC-STM-77: Empty amino map (all standard AA disabled) yields sparse/empty results
- **Area**: selectedMonoisotopicAminos via AminoMapSelector
- **Type**: edge
- **Precondition**: deselect all standard AAs, no ncAA
- **Steps**: 1. Disable all AAs 2. Calculate `AUGGCCAUU`
- **Expected**: No natural AA generated → empty/sparse result table
- **Ref**: stm-input-validation-cases §6; +page.svelte:42-48

### TC-STM-78: Results render only when possibilities > 0
- **Area**: +page.svelte result gating
- **Type**: edge
- **Precondition**: input producing zero surviving results (e.g. all length ≤1)
- **Steps**: 1. Enter `AUG` only 2. Calculate
- **Expected**: Result table (and ncAA banner) not rendered since possibilities.length===0
- **Ref**: +page.svelte:297-302

---

## 3. Draw (My ncAAs) — 21 cases

### TC-DRAW-01: Save with empty title
- **Area**: /draw (checkTitleValid)
- **Type**: validation
- **Precondition**: Draw page open, chemicalTitle field empty, structure drawn and calculated
- **Steps**: 1. Leave title blank. 2. Click "Save ncAA".
- **Expected**: Alert "Please enter a title to save." (level warning), save aborted, checkTitleValid returns false.
- **Ref**: draw-page-validation-and-storage-cases §1/§10; draw/+page.svelte:63-78

### TC-DRAW-02: Save with title containing a space
- **Area**: /draw (checkTitleValid)
- **Type**: validation
- **Precondition**: Structure drawn and calculated
- **Steps**: 1. Enter title "a b" (or " "). 2. Click "Save ncAA".
- **Expected**: Alert "Spaces cannot be entered.", save aborted.
- **Ref**: draw-page-validation-and-storage-cases §1; draw/+page.svelte:35-38

### TC-DRAW-03: Save with duplicate title
- **Area**: /draw (checkTitleValid/checkTitleDuplicated)
- **Type**: validation
- **Precondition**: An ncAA named "B" already saved in moleculeData storage
- **Steps**: 1. Draw+calculate a structure. 2. Enter title "B". 3. Click "Save ncAA".
- **Expected**: Alert "The name already exists.", save aborted.
- **Ref**: draw-page-validation-and-storage-cases §1; draw/+page.svelte:39-42

### TC-DRAW-04: Save with valid single-token title
- **Area**: /draw (checkTitleValid → saveData)
- **Type**: happy
- **Precondition**: No existing "B"; structure drawn and molecular weight calculated
- **Steps**: 1. Enter title "B". 2. Click "Save ncAA".
- **Expected**: Record pushed to moleculeData; alert "Data Saved!" (success); form resets via page reload.
- **Ref**: draw-page-validation-and-storage-cases §1/§3/§5

### TC-DRAW-05: Save before calculating molecular weight
- **Area**: /draw (saveData molecular-property guard)
- **Type**: validation
- **Precondition**: Valid title entered; molecularFormula/monoisotopicWeight/molecularWeight all empty
- **Steps**: 1. Enter title "d1". 2. Click "Save ncAA" without clicking Calculate.
- **Expected**: Alert "Please calculate molecular weight first.", save aborted.
- **Ref**: draw-page-validation-and-storage-cases §2/§10; draw/+page.svelte:24-27

### TC-DRAW-06: Save with only partial molecular properties
- **Area**: /draw (saveData guard)
- **Type**: branch
- **Precondition**: Valid title; only one of the three weight/formula values populated (partial calc)
- **Steps**: 1. Reach a state where e.g. molecularFormula is set but monoisotopicWeight is empty. 2. Click "Save ncAA".
- **Expected**: Guard fails (OR of empties), alert "Please calculate molecular weight first.", no save.
- **Ref**: draw-page-validation-and-storage-cases §2

### TC-DRAW-07: Weights persisted as strings
- **Area**: /draw storage record
- **Type**: regression
- **Precondition**: Structure calculated (e.g. C6H12N2O)
- **Steps**: 1. Save ncAA "B". 2. Inspect moleculeData in localStorage.
- **Expected**: monoisotopicWeight and molecularWeight stored as string values (e.g. "144.10111"), requiring parseFloat on read.
- **Ref**: draw-page-validation-and-storage-cases §3

### TC-DRAW-08: Storage envelope wrapper format
- **Area**: /draw storage.service
- **Type**: edge
- **Precondition**: Save at least one ncAA
- **Steps**: 1. Read raw localStorage key "moleculeData".
- **Expected**: On-disk value is StorageWrapper `{data, timestamp, expiresAt?}`; storage.load returns wrapper.data array; legacy non-enveloped data auto-migrates.
- **Ref**: draw-page-validation-and-storage-cases §3; storage.service.ts

### TC-DRAW-09: Delete an existing saved ncAA
- **Area**: /draw (deleteData)
- **Type**: happy
- **Precondition**: At least one ncAA saved in list
- **Steps**: 1. Click delete on a saved item.
- **Expected**: Item removed by index via splice; storage re-saved; list updates immediately with no confirmation dialog.
- **Ref**: draw-page-validation-and-storage-cases §4; draw/+page.svelte:50-55

### TC-DRAW-10: Delete with out-of-range index is safe
- **Area**: /draw (deleteData)
- **Type**: edge
- **Precondition**: Storage array shorter than a stale index reference
- **Steps**: 1. Trigger deleteData(index) where index exceeds array length.
- **Expected**: splice is a no-op; no crash; array unchanged.
- **Ref**: draw-page-validation-and-storage-cases §4

### TC-DRAW-11: Empty saved list shows placeholder
- **Area**: /draw (Saved ncAA section)
- **Type**: edge
- **Precondition**: moleculeData empty or all items deleted
- **Steps**: 1. View "Saved ncAA" section.
- **Expected**: "No data available" message shown.
- **Ref**: draw-page-validation-and-storage-cases §4

### TC-DRAW-12: Form reset via full page reload after save
- **Area**: /draw (resetForm)
- **Type**: regression
- **Precondition**: Successful save just occurred
- **Steps**: 1. Complete a valid save.
- **Expected**: resetForm calls window.location.reload() (not field-level clear/clearCanvas); ChemDoodle sketcher fully reinitialized.
- **Ref**: draw-page-validation-and-storage-cases §5; draw/+page.svelte:57-60

### TC-DRAW-13: Mass calculation of a simple structure
- **Area**: /draw (ChemDoodleCanvas calculate)
- **Type**: happy
- **Precondition**: Draw page open
- **Steps**: 1. Draw ethanol. 2. Click Calculate.
- **Expected**: molecularFormula "C2H6O" (Hill system), monoisotopicWeight and molecularWeight auto-computed and non-empty.
- **Ref**: draw-page-validation-and-storage-cases §9

### TC-DRAW-14: Charged/ionic structure formula reflects charge
- **Area**: /draw (ChemDoodleCanvas)
- **Type**: branch
- **Precondition**: Draw page open
- **Steps**: 1. Draw a structure carrying a charge/ion. 2. Click Calculate.
- **Expected**: Formula reflects the charge; isotope ratios considered in weights.
- **Ref**: draw-page-validation-and-storage-cases §9

### TC-DRAW-15: Incomplete structure yields empty/partial calc
- **Area**: /draw (ChemDoodleCanvas)
- **Type**: edge
- **Precondition**: Draw page open
- **Steps**: 1. Draw an incomplete/invalid structure. 2. Click Calculate.
- **Expected**: Empty or partial result; user must re-run Calculate; Save then blocked by molecular-property guard.
- **Ref**: draw-page-validation-and-storage-cases §9/§2

### TC-DRAW-16: Complex structure uses Hill-system notation
- **Area**: /draw (ChemDoodleCanvas)
- **Type**: edge
- **Precondition**: Draw page open
- **Steps**: 1. Draw a large/complex molecule. 2. Click Calculate.
- **Expected**: Normal calculation with Hill-system formula notation; weights computed.
- **Ref**: draw-page-validation-and-storage-cases §9

### TC-DRAW-17: STM integration matches by canonical ncAA letter
- **Area**: /draw ↔ STM (NcAACodonSelector)
- **Type**: branch
- **Precondition**: ncAA saved with title "B"
- **Steps**: 1. Go to STM, use ncAA slot B.
- **Expected**: ncAA.B = 144.10111 applied from the saved monoisotopicWeight.
- **Ref**: draw-page-validation-and-storage-cases §6

### TC-DRAW-18: STM integration fails for non-canonical title
- **Area**: /draw ↔ STM
- **Type**: branch
- **Precondition**: ncAA saved with title "Bcustom" (not one of B/J/O/U/X/Z)
- **Steps**: 1. In STM, attempt to use slot B.
- **Expected**: No match; slot B remains empty. Title must be exactly B/J/O/U/X/Z to be usable as ncAA.
- **Ref**: draw-page-validation-and-storage-cases §6

### TC-DRAW-19: Draw item loaded as Potential template
- **Area**: /draw ↔ /potential (Load template)
- **Type**: happy
- **Precondition**: An item saved via Draw in moleculeData
- **Steps**: 1. In /potential, use "Load template" and select the Draw-saved item.
- **Expected**: moleculeJson loads into potential's own ChemDoodleCanvas; conversion to modification saves under separate key potentialModifications.
- **Ref**: draw-page-validation-and-storage-cases §7

### TC-DRAW-20: Save over 5 MB storage cap fails silently
- **Area**: /draw storage.service
- **Type**: boundary
- **Precondition**: moleculeData near 5 MB cap
- **Steps**: 1. Save an item that pushes storage past 5 MB.
- **Expected**: storage.save returns false; data not persisted; no error alert surfaced (quota-exceeded caught → false).
- **Ref**: draw-page-validation-and-storage-cases §8

### TC-DRAW-21: SSR environment storage no-op
- **Area**: /draw storage.service
- **Type**: edge
- **Precondition**: Server-side render (window undefined)
- **Steps**: 1. Trigger load/save during SSR.
- **Expected**: storage service is a no-op (both save and load ignored); no crash.
- **Ref**: draw-page-validation-and-storage-cases §8; storage.service.ts:51-59

---

## 4. Potential Modifications — 40 cases

### TC-POT-01: Single-site N-terminus with specific target matches first residue
- **Area**: /potential (STM-side application)
- **Type**: happy
- **Precondition**: Modification defined N-terminus, Target=M, name "f"
- **Steps**: 1. Apply to sequence "MSTI" in STM.
- **Expected**: Result "fMSTI" (modification prepended because first char == M).
- **Ref**: potential-modification-types-and-conditions §1

### TC-POT-02: Single-site N-terminus specific target non-match
- **Area**: /potential (STM-side)
- **Type**: branch
- **Precondition**: N-terminus mod, Target=M
- **Steps**: 1. Apply to "ASTI".
- **Expected**: No modification; result "ASTI" (first char != M).
- **Ref**: potential-modification-types-and-conditions §1

### TC-POT-03: Single-site N-terminus Target='All' applies to any first residue
- **Area**: /potential (STM-side, ALL→G)
- **Type**: branch
- **Precondition**: N-terminus mod, Target='All', name "f"
- **Steps**: 1. Apply to "ASTI"; 2. Apply to "MSTI".
- **Expected**: Both modified → "fASTI", "fMSTI". Literal is exactly 'All' (not 'ALL').
- **Ref**: potential-modification-types-and-conditions §1

### TC-POT-04: N-terminus not applied when N-terminus absent (reinitiation/truncation)
- **Area**: /potential (STM-side)
- **Type**: edge
- **Precondition**: N-terminus mod, Target='All'
- **Steps**: 1. Apply to a reinitiation-truncated variant lacking N-terminus.
- **Expected**: No modification applied (no N-terminus present).
- **Ref**: potential-modification-types-and-conditions §1

### TC-POT-05: N-terminus delta save with specific target
- **Area**: /potential (handleSave delta path)
- **Type**: happy
- **Precondition**: N-terminus, Target=M, ChemDoodle calc monoisotopic = 28.01
- **Steps**: 1. Calculate. 2. Save.
- **Expected**: Saved monoisotopicWeight delta = (28.01 - 149.05105).toFixed(5) = "-121.04105" (string); delta path taken.
- **Ref**: potential-modification-save-format §1; +page.svelte:111-125

### TC-POT-06: N-terminus delta save with Target='All' uses Glycine
- **Area**: /potential (handleSave delta, ALL→G)
- **Type**: branch
- **Precondition**: N-terminus, Target='All', ChemDoodle CHO calc = 28.01
- **Steps**: 1. Calculate. 2. Save "Formylation".
- **Expected**: targetAA resolved to 'G'; delta = 28.01 - 75.03203 = "-47.02203" (string); formulaCalculation = "CHO - C2H5NO2 = C-1H-4N-1O-1".
- **Ref**: potential-modification-save-format §1 case 2; +page.svelte:114-125

### TC-POT-07: C-terminus specific target matches last residue
- **Area**: /potential (STM-side)
- **Type**: happy
- **Precondition**: C-terminus mod, Target=A, name "n"
- **Steps**: 1. Apply to "MSTA".
- **Expected**: Result "MSTAn" (last char == A); mod appended.
- **Ref**: potential-modification-types-and-conditions §2

### TC-POT-08: C-terminus non-match on last residue
- **Area**: /potential (STM-side)
- **Type**: branch
- **Precondition**: C-terminus mod, Target=A
- **Steps**: 1. Apply to "MSTI".
- **Expected**: No modification; result "MSTI".
- **Ref**: potential-modification-types-and-conditions §2

### TC-POT-09: C-terminus not applied on premature termination
- **Area**: /potential (STM-side)
- **Type**: edge
- **Precondition**: C-terminus mod
- **Steps**: 1. Apply to a premature-termination variant lacking C-terminus.
- **Expected**: No modification applied (no C-terminus present).
- **Ref**: potential-modification-types-and-conditions §2

### TC-POT-10: C-terminus uses delta save format
- **Area**: /potential (handleSave delta path)
- **Type**: branch
- **Precondition**: C-terminus mod, Target=A, ChemDoodle calc set
- **Steps**: 1. Calculate. 2. Save.
- **Expected**: Delta path taken (calc - target weight), stored as .toFixed(5) string.
- **Ref**: potential-modification-save-format §1 / matrix

### TC-POT-11: Side Chain cannot target 'All'
- **Area**: /potential (SingleSiteSection UI)
- **Type**: validation
- **Precondition**: Single-site, Side Chain condition selected
- **Steps**: 1. Attempt to pick Target='All'.
- **Expected**: 'All' blocked in UI (SingleSiteSection.svelte); note: +page.svelte does not re-validate this.
- **Ref**: potential-modification-types-and-conditions §3

### TC-POT-12: Side Chain targets a specific AA
- **Area**: /potential (Side Chain)
- **Type**: happy
- **Precondition**: Single-site, Side Chain, Target=C
- **Steps**: 1. Draw+calculate d1. 2. Save.
- **Expected**: Absolute save (calc value stored directly); accepted.
- **Ref**: potential-modification-types-and-conditions §3; save-format §2

### TC-POT-13: Side Chain targets an ncAA letter
- **Area**: /potential (Side Chain)
- **Type**: branch
- **Precondition**: Single-site, Side Chain, Target=B (ncAA)
- **Steps**: 1. Calculate. 2. Save.
- **Expected**: Accepted (specific ncAA letter allowed as Side Chain target).
- **Ref**: potential-modification-types-and-conditions §3

### TC-POT-14: Side Chain applyCount expansion on multi-target sequence
- **Area**: /potential (STM-side Side Chain)
- **Type**: branch
- **Precondition**: Side Chain mod "d1", Target=C
- **Steps**: 1. Apply to "CMCCMIY" (3 C at pos 0,2,3) across applyCount 0..3.
- **Expected**: 4 results: "CMCCMIY", "d1MCCMIY", "d1Md1CMIY", "d1Md1d1MIY" (left-to-right replacement).
- **Ref**: potential-modification-types-and-conditions §3

### TC-POT-15: Side Chain uses absolute save format
- **Area**: /potential (handleSave absolute path)
- **Type**: branch
- **Precondition**: Side Chain, Target=C, ChemDoodle calc = 165.0
- **Steps**: 1. Calculate. 2. Save.
- **Expected**: monoisotopicWeight "165.00000" (absolute); formulaCalculation = undefined; molecularFormula = original formula.
- **Ref**: potential-modification-save-format §2; +page.svelte:126-132

### TC-POT-16: Crosslinking requires both targets
- **Area**: /potential (handleSave validation)
- **Type**: validation
- **Precondition**: Crosslinking type; target1 set, target2 empty
- **Steps**: 1. Click Save.
- **Expected**: Alert shown, save blocked (`!target1 || !target2`).
- **Ref**: potential-modification-types-and-conditions §5 step 2b; +page.svelte:61-65

### TC-POT-17: Crosslinking Adjacent '1↔2' finds both direction pairs
- **Area**: /potential (STM-side, adjacentDirection '1↔2')
- **Type**: branch
- **Precondition**: Crosslinking Adjacent, target1=C target2=C, direction '1↔2'
- **Steps**: 1. Apply to "MCCSTINCCM".
- **Expected**: Valid adjacent pairs (1,2) and (7,8) detected (|i-j|===1, both match).
- **Ref**: potential-modification-types-and-conditions §4.1

### TC-POT-18: Crosslinking Adjacent '1↔2' with no adjacent match
- **Area**: /potential (STM-side)
- **Type**: edge
- **Precondition**: Adjacent '1↔2', target1=C target2=C
- **Steps**: 1. Apply to "MCSTIM".
- **Expected**: No valid adjacent C-C pairs.
- **Ref**: potential-modification-types-and-conditions §4.1

### TC-POT-19: Crosslinking Adjacent '1→2' respects order
- **Area**: /potential (STM-side)
- **Type**: branch
- **Precondition**: Adjacent '1→2', target1=C target2=D
- **Steps**: 1. Apply to "MCDIN"; 2. Apply to "MDCIN".
- **Expected**: "MCDIN" valid (C then D, j===i+1); "MDCIN" invalid (reverse order).
- **Ref**: potential-modification-types-and-conditions §4.1

### TC-POT-20: Crosslinking Adjacent '2→1' respects reverse order
- **Area**: /potential (STM-side)
- **Type**: branch
- **Precondition**: Adjacent '2→1', target1=C target2=D
- **Steps**: 1. Apply to "MDCIN"; 2. Apply to "MCDIN".
- **Expected**: "MDCIN" valid (D then C); "MCDIN" invalid.
- **Ref**: potential-modification-types-and-conditions §4.1

### TC-POT-21: Adjacent save requires adjacentDirection
- **Area**: /potential (handleSave validation)
- **Type**: validation
- **Precondition**: Crosslinking Adjacent, adjacentDirection empty/falsy
- **Steps**: 1. Click Save.
- **Expected**: Save blocked with alert (`!adjacentDirection`).
- **Ref**: potential-modification-types-and-conditions §5 step 4; +page.svelte:74-77

### TC-POT-22: Adjacent save object includes adjacentDirection, omits distance keys
- **Area**: /potential (handleSave save object)
- **Type**: branch
- **Precondition**: Crosslinking Adjacent '1↔2', valid inputs
- **Steps**: 1. Save. 2. Inspect stored object.
- **Expected**: Object has adjacentDirection key; distanceOperator and distanceValue keys are absent entirely (conditional spread not run), not undefined values.
- **Ref**: potential-modification-save-format §3; +page.svelte:146-152

### TC-POT-23: Distance operator '= N' exact-between match
- **Area**: /potential (STM-side, DISTANCE)
- **Type**: branch
- **Precondition**: Distance condition, operator '=', target1=C target2=C
- **Steps**: 1. Apply to "MCSTINCM" (4 AA between C's) with value 4 then value 3.
- **Expected**: betweenCount===4 → '=4' valid, '=3' invalid.
- **Ref**: potential-modification-types-and-conditions §4.2

### TC-POT-24: Distance operator '< N' and '> N' branches
- **Area**: /potential (STM-side, DISTANCE)
- **Type**: branch
- **Precondition**: Distance condition, "MCSTINCM" (betweenCount=4)
- **Steps**: 1. Test '<5', '<3', '>3', '>5'.
- **Expected**: '<5' valid, '<3' invalid, '>3' valid, '>5' invalid.
- **Ref**: potential-modification-types-and-conditions §4.2

### TC-POT-25: Distance matrix on MCSCNM (1 AA between)
- **Area**: /potential (STM-side, DISTANCE)
- **Type**: boundary
- **Precondition**: Distance, target1=C target2=C, sequence "MCSCNM" (betweenCount=1)
- **Steps**: 1. Test '=1','=2','<3','>2','>0'.
- **Expected**: '=1'✓, '=2'✗, '<3'✓, '>2'✗, '>0'✓.
- **Ref**: potential-modification-types-and-conditions §4.2

### TC-POT-26: Distance save requires distanceValue >= 1
- **Area**: /potential (handleSave validation)
- **Type**: boundary
- **Precondition**: Crosslinking Distance, distanceValue = 0
- **Steps**: 1. Click Save.
- **Expected**: Alert shown, save blocked (`distanceValue < 1`).
- **Ref**: potential-modification-types-and-conditions §5 step 3; +page.svelte:68-70

### TC-POT-27: Distance save object includes distance keys, omits adjacentDirection
- **Area**: /potential (handleSave save object)
- **Type**: branch
- **Precondition**: Crosslinking Distance, operator '>', value 1
- **Steps**: 1. Save. 2. Inspect object.
- **Expected**: Object has distanceOperator and distanceValue; adjacentDirection key absent.
- **Ref**: potential-modification-save-format §3; +page.svelte:149-152

### TC-POT-28: Crosslinking saved as absolute
- **Area**: /potential (handleSave absolute path)
- **Type**: branch
- **Precondition**: Crosslinking C-C disulfide, ChemDoodle calc = 240.292
- **Steps**: 1. Calculate. 2. Save.
- **Expected**: monoisotopicWeight "240.29200" absolute; formulaCalculation undefined; molecularFormula = original.
- **Ref**: potential-modification-save-format §2; matrix

### TC-POT-29: Empty modification name blocked
- **Area**: /potential (handleSave validation step 1)
- **Type**: validation
- **Precondition**: modificationName blank
- **Steps**: 1. Click Save.
- **Expected**: Alert, save blocked (`modificationName.trim()` empty).
- **Ref**: potential-modification-types-and-conditions §5 step 1; +page.svelte:49-52

### TC-POT-30: Single-site missing target blocked
- **Area**: /potential (handleSave validation step 2a)
- **Type**: validation
- **Precondition**: Single-site, targetAminoAcid empty
- **Steps**: 1. Click Save.
- **Expected**: Alert, save blocked (`!targetAminoAcid`).
- **Ref**: potential-modification-types-and-conditions §5 step 2a; +page.svelte:56-59

### TC-POT-31: Empty structureName blocked
- **Area**: /potential (handleSave validation step 5)
- **Type**: validation
- **Precondition**: All prior valid, structureName blank
- **Steps**: 1. Click Save.
- **Expected**: Alert, save blocked (`structureName.trim()` empty).
- **Ref**: potential-modification-types-and-conditions §5 step 5; +page.svelte:80-83

### TC-POT-32: structureName with space blocked
- **Area**: /potential (handleSave validation step 6)
- **Type**: validation
- **Precondition**: structureName = "d 1"
- **Steps**: 1. Click Save.
- **Expected**: Alert, save blocked (`structureName.includes(' ')`).
- **Ref**: potential-modification-types-and-conditions §5 step 6; +page.svelte:86-89

### TC-POT-33: Save before molecular weight calculated blocked
- **Area**: /potential (handleSave validation step 7)
- **Type**: validation
- **Precondition**: molecularFormula empty
- **Steps**: 1. Click Save before Calculate.
- **Expected**: Alert, save blocked (`!$molecularFormula || ...`).
- **Ref**: potential-modification-types-and-conditions §5 step 7; +page.svelte:92-95

### TC-POT-34: Duplicate modification name blocked
- **Area**: /potential (handleSave validation step 8)
- **Type**: validation
- **Precondition**: A modification named "Formylation" already in potentialModifications storage
- **Steps**: 1. Save another mod named "Formylation".
- **Expected**: Alert, save blocked (`storedData.some(d => d.name === modificationName)`).
- **Ref**: potential-modification-types-and-conditions §5 step 8; +page.svelte:97-103

### TC-POT-35: Single-site Calculate button disabled without target
- **Area**: /potential (reactive calculateDisabled)
- **Type**: branch
- **Precondition**: modificationType = Single-site, targetAminoAcid empty
- **Steps**: 1. Observe the Calculate button.
- **Expected**: Calculate disabled; becomes enabled once a target is selected.
- **Ref**: potential-modification-types-and-conditions §6; +page.svelte:41

### TC-POT-36: Changing Single-site target resets calculation
- **Area**: /potential (handleTargetChange)
- **Type**: branch
- **Precondition**: Single-site, calculated structure present, chemDoodleCanvas bound
- **Steps**: 1. Change target AA.
- **Expected**: chemDoodleCanvas.resetCalculation() called — molecularFormula, weights, JSON all reset.
- **Ref**: potential-modification-types-and-conditions §6; +page.svelte:193-198

### TC-POT-37: Changing Crosslinking target does not reset calculation
- **Area**: /potential (handleTargetChange)
- **Type**: branch
- **Precondition**: Crosslinking type, calculated structure present
- **Steps**: 1. Change a target.
- **Expected**: No reset (structure is target-independent for crosslinking).
- **Ref**: potential-modification-types-and-conditions §6

### TC-POT-38: originalFormula always saved regardless of format
- **Area**: /potential (save object)
- **Type**: regression
- **Precondition**: Any mod (delta or absolute)
- **Steps**: 1. Save a delta mod and an absolute mod. 2. Inspect objects.
- **Expected**: originalFormula === $molecularFormula in both cases; formulaCalculation is the "A - B = C" string for delta, undefined for absolute.
- **Ref**: potential-modification-save-format §3; +page.svelte:158-159

### TC-POT-39: Delta formula subtraction allows negative coefficients
- **Area**: /potential (formatFormulaSubtraction)
- **Type**: edge
- **Precondition**: N-terminus 'All', CHO structure
- **Steps**: 1. Save Formylation.
- **Expected**: molecularFormula stored as RHS of split, e.g. "C-1H-4N-1O-1" (negative coefficients permitted).
- **Ref**: potential-modification-save-format §1; +page.svelte:123-125

### TC-POT-40: Storage key isolation from Draw
- **Area**: /potential storage
- **Type**: regression
- **Precondition**: Both Draw and Potential items saved
- **Steps**: 1. Inspect localStorage.
- **Expected**: Modifications under key "potentialModifications" (wrapper envelope); Draw items under "moleculeData"; keys do not collide.
- **Ref**: potential-modification-save-format §4

---

## 5. Benchmark — 42 cases

### TC-BMK-01: detectedMass null/NaN blocked
- **Area**: /benchmark (validate 3.1)
- **Type**: validation
- **Precondition**: detectedMass empty (null)
- **Steps**: 1. Click Run Benchmark.
- **Expected**: Alert, validate returns false; benchmark not started.
- **Ref**: benchmark-page-deep-cases §3.1; +page.svelte:383-386

### TC-BMK-02: Mass upper-bound (10000) no longer enforced
- **Area**: /benchmark (validate)
- **Type**: regression
- **Precondition**: detectedMass = 15000, otherwise valid inputs
- **Steps**: 1. Run Benchmark.
- **Expected**: No upper-bound alert; large mass accepted (bound check commented out, commit 0a4589d); SA search space larger → longer runtime.
- **Ref**: benchmark-page-deep-cases §3.1/§13; +page.svelte:387-395

### TC-BMK-03: Empty targetSequence blocked
- **Area**: /benchmark (validate 3.2, isValidTargetSequence)
- **Type**: validation
- **Precondition**: targetSequence = ""
- **Steps**: 1. Run Benchmark.
- **Expected**: Alert, blocked (target required).
- **Ref**: benchmark-page-deep-cases §3.2; benchmark_helper.ts:125-129

### TC-BMK-04: targetSequence f-prefix and case acceptance
- **Area**: /benchmark (isValidTargetSequence)
- **Type**: branch
- **Precondition**: Valid mass/other inputs
- **Steps**: 1. Enter "fMSTI"; 2. "MSTI"; 3. "FMSTI".
- **Expected**: All pass (f prefix stripped, then /^[A-Z]+$/); note "FMSTI" F is treated as Phe.
- **Ref**: benchmark-page-deep-cases §3.2

### TC-BMK-05: targetSequence with digit rejected
- **Area**: /benchmark (isValidTargetSequence)
- **Type**: validation
- **Precondition**: Otherwise valid
- **Steps**: 1. Enter "MSTI1". 2. Run.
- **Expected**: Fails regex, alert, blocked.
- **Ref**: benchmark-page-deep-cases §3.2

### TC-BMK-06: ncAA in target must be defined
- **Area**: /benchmark (validate 3.3)
- **Type**: branch
- **Precondition**: target "MBSI"; B slot = 0.0 (empty sentinel)
- **Steps**: 1. Run Benchmark.
- **Expected**: Alert (missingNcAA), blocked — B undefined (not object).
- **Ref**: benchmark-page-deep-cases §3.3; +page.svelte:412-414

### TC-BMK-07: ncAA in target defined passes
- **Area**: /benchmark (validate 3.3)
- **Type**: branch
- **Precondition**: target "MBSI"; B slot = object with weight
- **Steps**: 1. Run Benchmark.
- **Expected**: Passes ncAA check.
- **Ref**: benchmark-page-deep-cases §3.3

### TC-BMK-08: Deselected natural AA present in target blocked
- **Area**: /benchmark (validate 3.4, AminoMapSelector)
- **Type**: branch
- **Precondition**: target "MSTI"; M unchecked in AminoMapSelector
- **Steps**: 1. Run Benchmark.
- **Expected**: Alert, blocked (SA cannot produce M → success rate would be 0). With M checked it passes.
- **Ref**: benchmark-page-deep-cases §3.4; +page.svelte:424-439

### TC-BMK-09: RNA sequence validation A/U/G/C and length multiple of 3
- **Area**: /benchmark (validate 3.5, validateRnaSequence)
- **Type**: validation
- **Precondition**: Otherwise valid
- **Steps**: 1. Enter rnaSequence "AUGGC" (5, not multiple of 3) then "AUGXCC" (invalid char).
- **Expected**: Both rejected; empty rnaSequence passes (optional).
- **Ref**: benchmark-page-deep-cases §3.5; +page.svelte:207-220

### TC-BMK-10: benchmarkRuns must be integer >= 1
- **Area**: /benchmark (validate 3.6)
- **Type**: boundary
- **Precondition**: Otherwise valid
- **Steps**: 1. Set benchmarkRuns = 0 (or 2.5). 2. Run.
- **Expected**: Alert, blocked; value 1 accepted.
- **Ref**: benchmark-page-deep-cases §3.6

### TC-BMK-11: averageWindow must be >=1 and <= benchmarkRuns
- **Area**: /benchmark (validate 3.6)
- **Type**: boundary
- **Precondition**: benchmarkRuns = 5
- **Steps**: 1. Set averageWindow = 6. 2. Run.
- **Expected**: Alert, blocked (window exceeds runs); averageWindow=5 accepted.
- **Ref**: benchmark-page-deep-cases §3.6

### TC-BMK-12: SA initialTemperature must be > 0 and finite
- **Area**: /benchmark (validate 3.6, SAModeSelector)
- **Type**: boundary
- **Precondition**: saConfig editable
- **Steps**: 1. Set initialTemperature = 0 or Infinity. 2. Run.
- **Expected**: Alert, blocked.
- **Ref**: benchmark-page-deep-cases §3.6; +page.svelte:461-494

### TC-BMK-13: SA absoluteTemperature must be > 0, finite, and < initialTemperature
- **Area**: /benchmark (validate 3.6)
- **Type**: boundary
- **Precondition**: initialTemperature = 10000
- **Steps**: 1. Set absoluteTemperature = 20000 (>= initial). 2. Run.
- **Expected**: Alert, blocked (must be strictly less than initialTemperature).
- **Ref**: benchmark-page-deep-cases §3.6

### TC-BMK-14: SA saIterations must be integer >= 1
- **Area**: /benchmark (validate 3.6)
- **Type**: boundary
- **Precondition**: saConfig editable
- **Steps**: 1. Set saIterations = 0. 2. Run.
- **Expected**: Alert, blocked; value 1 accepted.
- **Ref**: benchmark-page-deep-cases §3.6

### TC-BMK-15: SA coolingRate must be strictly between 0 and 1
- **Area**: /benchmark (validate 3.6)
- **Type**: boundary
- **Precondition**: saConfig editable
- **Steps**: 1. Set coolingRate = 1 (or 0, or 1.2). 2. Run.
- **Expected**: Alert, blocked (0 < x < 1 exclusive); 0.99 accepted.
- **Ref**: benchmark-page-deep-cases §3.6

### TC-BMK-16: SAModeSelector presets and custom editing feed saConfig
- **Area**: /benchmark (SAModeSelector customizable)
- **Type**: happy
- **Precondition**: Benchmark page open
- **Steps**: 1. Choose Standard/Precise/Fast preset; 2. Then hand-edit a param.
- **Expected**: handleSAModeChange updates saConfig with the chosen/edited values; those values passed to worker.
- **Ref**: benchmark-page-deep-cases §12; benchmark-ux "SA Mode"; +page.svelte:757-759,884-886

### TC-BMK-17: Evaluate weights must sum to 1 within tolerance
- **Area**: /benchmark (validate 3.7, Fixed Sequence Weights)
- **Type**: boundary
- **Precondition**: Fixed Sequence Weights editor
- **Steps**: 1. Set evaluateMassDiff=0.8, evaluateSeqDiff=0.1 (sum 0.9). 2. Run.
- **Expected**: Alert, blocked (|sum-1| > 0.001); live sum badge shows text-danger.
- **Ref**: benchmark-page-deep-cases §3.7/§12; +page.svelte:509

### TC-BMK-18: Sort weights must sum to 1 within tolerance
- **Area**: /benchmark (validate 3.7)
- **Type**: boundary
- **Precondition**: Fixed Sequence Weights editor
- **Steps**: 1. Set sortMassDiff=0.5, sortSeqDiff=0.6 (sum 1.1). 2. Run.
- **Expected**: Alert, blocked (|sum-1| > 0.001).
- **Ref**: benchmark-page-deep-cases §3.7; +page.svelte:530

### TC-BMK-19: Weight sum within tolerance accepted
- **Area**: /benchmark (validate 3.7, WEIGHT_SUM_TOLERANCE)
- **Type**: boundary
- **Precondition**: Fixed Sequence Weights editor
- **Steps**: 1. Set evaluate weights summing to 1.0005 (within 0.001). 2. Run.
- **Expected**: Passes (|sum-1| = 0.0005 <= 0.001 tolerance).
- **Ref**: benchmark-page-deep-cases §3.7; +page.svelte:63

### TC-BMK-20: Live sum badge turns danger when off by >0.001
- **Area**: /benchmark (Fixed Sequence Weights editor UI)
- **Type**: branch
- **Precondition**: Editor visible
- **Steps**: 1. Type weights whose sum deviates > 0.001 from 1.
- **Expected**: sum badge renders with text-danger class.
- **Ref**: benchmark-page-deep-cases §12; +page.svelte:900-901,940-941

### TC-BMK-21: Happy-path benchmark run produces stats
- **Area**: /benchmark (handleRunBenchmark)
- **Type**: happy
- **Precondition**: Valid detectedMass, target "MSTI", benchmarkRuns=100
- **Steps**: 1. Run Benchmark to completion.
- **Expected**: Loop runs 100×; per-run success/failure recorded; computeBenchmarkStats produces successRate, averageRuntime, firstNAverageRuntime, min/max.
- **Ref**: benchmark-page-deep-cases §4/§7

### TC-BMK-22: Cancel mid-run stops loop before next iteration
- **Area**: /benchmark (handleCancel)
- **Type**: branch
- **Precondition**: Benchmark running
- **Steps**: 1. Click Cancel during run.
- **Expected**: cancelRequested=true; loop breaks before next iteration; stats computed from runs collected so far.
- **Ref**: benchmark-page-deep-cases §4.1; +page.svelte:620-622,559-560

### TC-BMK-23: Per-run failure recorded, loop continues
- **Area**: /benchmark (per-run failure handling)
- **Type**: edge
- **Precondition**: Config where some SA runs throw/fail
- **Steps**: 1. Run benchmark.
- **Expected**: Failing run pushed as {success:false, matchedCode:undefined, solutions:[]}; lastError set; loop continues to next run.
- **Ref**: benchmark-page-deep-cases §4.2; +page.svelte:563-579

### TC-BMK-24: Composition match is permutation-invariant multiset
- **Area**: /benchmark (findCompositionMatch/getComposition)
- **Type**: branch
- **Precondition**: target "MAI"
- **Steps**: 1. SA yields candidate "AIM".
- **Expected**: Match true (sorted-string multiset equal); "MAII" vs "AIIM" also matches; "MAS" does not.
- **Ref**: benchmark-page-deep-cases §6; benchmark_helper.ts:47-73

### TC-BMK-25: Composition match strips f prefix
- **Area**: /benchmark (getComposition)
- **Type**: edge
- **Precondition**: target "fMAI"
- **Steps**: 1. Candidate "fAIM".
- **Expected**: Match true (leading f removed before comparison via replace(/^f/,'')).
- **Ref**: benchmark-page-deep-cases §6

### TC-BMK-26: averageRuntime uses ALL runs not just matched
- **Area**: /benchmark (computeBenchmarkStats)
- **Type**: regression
- **Precondition**: Mixed success/failure runs
- **Steps**: 1. Complete benchmark. 2. Compare averageRuntime.
- **Expected**: averageRuntime = mean of every run's runtime (including failures); firstNAverageRuntime = mean of first N runs regardless of match; min/max over all runs.
- **Ref**: benchmark-page-deep-cases §7; benchmark_helper.ts:100-107

### TC-BMK-27: Zero runs early-return zeros
- **Area**: /benchmark (computeBenchmarkStats)
- **Type**: edge
- **Precondition**: runs array empty (e.g. cancel before any run)
- **Steps**: 1. Trigger stats with totalRuns=0.
- **Expected**: Returns zeroed stats (minRuntime:0, maxRuntime:0) — no Infinity, no divide-by-zero.
- **Ref**: benchmark-page-deep-cases §7; benchmark_helper.ts:80-91

### TC-BMK-28: Detailed CSV export filename pattern
- **Area**: /benchmark (runsToCSV export)
- **Type**: happy
- **Precondition**: Completed benchmark, target "MSTI"
- **Steps**: 1. Export detailed CSV.
- **Expected**: Filename mts-benchmark-detail-MSTI-{ts}.csv; content prefixed with BOM for Excel; not the legacy benchmark-{timestamp}.csv.
- **Ref**: benchmark-page-deep-cases §8; +page.svelte:692-710

### TC-BMK-29: Summary CSV export filename pattern
- **Area**: /benchmark (runsSummaryToCSV export)
- **Type**: happy
- **Precondition**: Completed benchmark
- **Steps**: 1. Export summary CSV.
- **Expected**: Filename mts-benchmark-summary-{target}-{ts}.csv with BOM prefix.
- **Ref**: benchmark-page-deep-cases §8

### TC-BMK-30: Failed runs still emit a CSV row
- **Area**: /benchmark (runsToCSV)
- **Type**: edge
- **Precondition**: Some runs failed (no solutions)
- **Steps**: 1. Export detailed CSV.
- **Expected**: Each failed run emits one blank/placeholder row so its trace remains in CSV.
- **Ref**: benchmark-page-deep-cases §8; benchmark_helper.ts:184-208

### TC-BMK-31: formatMs unit switching and non-finite guard
- **Area**: /benchmark (formatMs)
- **Type**: branch
- **Precondition**: Results present
- **Steps**: 1. Observe runtime rendering for 152.3, 1523.4, and NaN/Infinity.
- **Expected**: "152.30 ms", "1.52 s", and "—" respectively.
- **Ref**: benchmark-page-deep-cases §9; +page.svelte:765-769

### TC-BMK-32: ncAA inclusion diagnostics scan all solutions
- **Area**: /benchmark (ncAAStats reactive)
- **Type**: branch
- **Precondition**: Defined ncAA letter(s) (object slots); completed runs
- **Steps**: 1. View ncAA diagnostics card.
- **Expected**: Per-letter counts computed over every SA solution code (not target-based); percentage of solutions containing each letter shown.
- **Ref**: benchmark-page-deep-cases §10; benchmark-ux; +page.svelte:718-755

### TC-BMK-33: Results table columns render correctly
- **Area**: /benchmark (results table)
- **Type**: happy
- **Precondition**: Completed benchmark
- **Steps**: 1. Inspect table.
- **Expected**: Columns #, Runtime (formatMs), Match (colored true/false badge), Matched code (empty when no match).
- **Ref**: benchmark-page-deep-cases §11; +page.svelte:1201-1230

### TC-BMK-34: Template path chosen when sequenceTemplate has gap length
- **Area**: /benchmark (buildWorkerData)
- **Type**: branch
- **Precondition**: sequenceTemplate.gapTotalLength > 0
- **Steps**: 1. Run benchmark.
- **Expected**: base.sequenceTemplate set (template path), not proteinSequence path.
- **Ref**: benchmark-page-deep-cases §5; +page.svelte:174

### TC-BMK-35: Non-template path uses converted (ncAA-substituted) sequence
- **Area**: /benchmark (buildWorkerData)
- **Type**: branch
- **Precondition**: No gap template; rnaSequence provided with ncAA codon substitution
- **Steps**: 1. Run benchmark.
- **Expected**: base.proteinSequence = convertedAminoSequence || rnaSequence (uses substituted sequence, not raw rnaSequence).
- **Ref**: benchmark-page-deep-cases §5; +page.svelte:181

### TC-BMK-36: ncAA codon auto-substitution reflects in reference sequence
- **Area**: /benchmark (convertRnaToAminoAcids, commit 1561a79)
- **Type**: branch
- **Precondition**: AminoMapSelector deselects an AA whose codon maps to a defined ncAA letter; rnaSequence provided
- **Steps**: 1. View converted sequence / substitution info.
- **Expected**: Codons for the excluded AA substituted to ncAA letter (override > stop suppression > auto); purple border/↓ arrow/popover markers shown.
- **Ref**: benchmark-page-deep-cases §12; +page.svelte:223-316,319-369

### TC-BMK-37: Codon assignment is optional in MTS benchmark
- **Area**: /benchmark (NcAACodonSelector info alert)
- **Type**: happy
- **Precondition**: NcAACodonSelector visible
- **Steps**: 1. Leave codon assignments blank. 2. Run benchmark.
- **Expected**: Runs successfully; info alert explains codons only align the reference sequence for similarity scoring, not the mass calculation.
- **Ref**: benchmark-page-deep-cases §12; benchmark-ux; +page.svelte:992-998

### TC-BMK-38: positionOverrides invalidation removes stale letters
- **Area**: /benchmark (positionOverrides reactive)
- **Type**: edge
- **Precondition**: A position override set for an ncAA letter later removed/undefined
- **Steps**: 1. Remove that ncAA definition.
- **Expected**: The now-invalid override auto-removed from positionOverrides.
- **Ref**: benchmark-page-deep-cases §12; +page.svelte:293-307

### TC-BMK-39: Progress bar and live success count update
- **Area**: /benchmark (progress UI)
- **Type**: happy
- **Precondition**: Benchmark running
- **Steps**: 1. Observe progress during run.
- **Expected**: progressRatio = progress/benchmarkRuns advances; liveSuccessCount increments in real time.
- **Ref**: benchmark-page-deep-cases §12; benchmark-ux; +page.svelte:762-763

### TC-BMK-40: Single persistent worker, no handler leak across runs
- **Area**: /benchmark (runSAOnce)
- **Type**: regression
- **Precondition**: benchmarkRuns large (e.g. 500)
- **Steps**: 1. Run many iterations. 2. Confirm listeners cleaned up.
- **Expected**: One persistent worker reused; addEventListener/removeEventListener paired each run (no leak); onDestroy terminates worker.
- **Ref**: benchmark-page-deep-cases §5; +page.svelte:99-126,89-94

### TC-BMK-41: Formylation and Adduct custom inputs feed worker
- **Area**: /benchmark (input variables)
- **Type**: branch
- **Precondition**: Benchmark page
- **Steps**: 1. Set formylation to yes/no/unknown; 2. Set adduct (e.g. +Na).
- **Expected**: Values incorporated into workerData; default formylation "unknown", default adduct "+H".
- **Ref**: benchmark-page-deep-cases §2; benchmark-ux

### TC-BMK-42: Empty ncAA slot sentinel is numeric 0.0 not object
- **Area**: /benchmark (fullNcAA slots)
- **Type**: edge
- **Precondition**: Fresh page, no ncAA defined
- **Steps**: 1. Inspect fullNcAA for B/J/O/U/X/Z.
- **Expected**: Each empty slot = 0.0 (number); defined slot = object; validation/diagnostics distinguish via typeof === "object".
- **Ref**: benchmark-page-deep-cases §2/§3.3/§10

---

## 6. 공통 / 공유 (Cross-cutting) — 73 cases

> 이 섹션 일부(Draw ncAA 저장, RNA 정규화, 워커, adduct)는 §1~§5와 의도적으로 교차 참조됩니다.

### TC-XC-01: Define ncAA with valid unique name and calculated mass persists to localStorage
- **Area**: /draw (My ncAAs page) + storage.service
- **Type**: happy
- **Precondition**: /draw open, localStorage `moleculeData` empty or without name "AzF"
- **Steps**: 1. Enter Name "AzF" 2. Draw a structure in ChemDoodle canvas 3. Trigger molecular weight calculation so formula/monoisotopic/molecularWeight populate 4. Click "Save ncAA"
- **Expected**: Alert "Data Saved!" (success); entry `{title:'AzF', moleculeJson, molecularFormula, monoisotopicWeight, molecularWeight}` appended to `moleculeData` array; page reloads and "Saved ncAA" list shows AzF
- **Ref**: ncaa-handling, src/routes/draw/+page.svelte:21-43

### TC-XC-02: ncAA save blocked when name is empty
- **Area**: /draw
- **Type**: validation
- **Precondition**: /draw open, Name field blank, structure drawn
- **Steps**: 1. Leave Name empty 2. Click "Save ncAA"
- **Expected**: Alert "Please enter a title to save." (warning); nothing saved to `moleculeData`
- **Ref**: src/routes/draw/+page.svelte:64-67

### TC-XC-03: ncAA name containing spaces is rejected
- **Area**: /draw
- **Type**: validation
- **Precondition**: /draw open, structure drawn/calculated
- **Steps**: 1. Enter Name "Aze F" (contains a space) 2. Click "Save ncAA"
- **Expected**: Alert "Spaces cannot be entered." (warning); not saved
- **Ref**: src/routes/draw/+page.svelte:68-72

### TC-XC-04: Duplicate ncAA name is rejected (unique constraint)
- **Area**: /draw
- **Type**: validation
- **Precondition**: `moleculeData` already contains an entry titled "AzF"
- **Steps**: 1. Enter Name "AzF" 2. Draw/calculate 3. Click "Save ncAA"
- **Expected**: Alert "The name already exists." (warning); no second AzF entry added
- **Ref**: src/routes/draw/+page.svelte:73-84

### TC-XC-05: Save blocked when molecular weight not yet calculated
- **Area**: /draw
- **Type**: validation
- **Precondition**: Valid unique name entered but formula/monoisotopic/molecularWeight are empty (no calculation performed)
- **Steps**: 1. Enter Name "NewAA" 2. Do NOT calculate 3. Click "Save ncAA"
- **Expected**: Alert "Please calculate molecular weight first." (warning); not saved
- **Ref**: src/routes/draw/+page.svelte:24-28

### TC-XC-06: Delete a saved ncAA removes it from list and storage
- **Area**: /draw + MolecularItem
- **Type**: happy
- **Precondition**: `moleculeData` has ≥2 entries
- **Steps**: 1. Click delete on the 2nd saved ncAA
- **Expected**: `moleculeData` spliced at that index and re-saved; `savedData` store updates; item disappears from "Saved ncAA" list
- **Ref**: src/routes/draw/+page.svelte:50-55

### TC-XC-07: Saved ncAAs persist across browser sessions
- **Area**: /draw + storage.service
- **Type**: regression
- **Precondition**: One ncAA saved
- **Steps**: 1. Close tab / reload app 2. Navigate back to /draw
- **Expected**: onMount loadSavedData reads `moleculeData` from localStorage; previously saved ncAA still listed
- **Ref**: src/routes/draw/+page.svelte:17-19,45-48

### TC-XC-08: Empty saved-ncAA state shows placeholder
- **Area**: /draw
- **Type**: edge
- **Precondition**: `moleculeData` absent or empty array
- **Steps**: 1. Open /draw
- **Expected**: "Saved ncAA" section shows alert "No data available."
- **Ref**: src/routes/draw/+page.svelte:136-138

### TC-XC-09: ncAA defined in My ncAAs appears in STM ncAA selector
- **Area**: NcAASelector (STM)
- **Type**: happy
- **Precondition**: ncAA "AzF" saved in `moleculeData`
- **Steps**: 1. Open /stm 2. Click "Select" on slot B in the ncAA selector
- **Expected**: Modal lists AzF (loaded from `moleculeData`); selecting it assigns AzF to slot B and dispatches changeNcAA
- **Ref**: ncaa-handling, src/lib/components/NcAASelector.svelte:36-73

### TC-XC-10: ncAA defined in My ncAAs also appears in MTS ncAA selector (cross-feature consistency)
- **Area**: NcAASelector / NcAACodonSelector (MTS)
- **Type**: regression
- **Precondition**: Same `moleculeData` containing AzF
- **Steps**: 1. Open /mts 2. Open the ncAA slot selector
- **Expected**: AzF available identically in MTS as in STM (same `moleculeData` source)
- **Ref**: ncaa-handling:22-24, src/lib/components/NcAACodonSelector.svelte:41

### TC-XC-11: Selecting ncAA into empty selector shows "no ncAA created" when none defined
- **Area**: NcAASelector
- **Type**: edge
- **Precondition**: `moleculeData` empty
- **Steps**: 1. Open /stm 2. Click "Select" on any slot
- **Expected**: Alert "There is no ncAA created." (info); modal does not open
- **Ref**: src/lib/components/NcAASelector.svelte:41-48

### TC-XC-12: Assigning the same ncAA to a second slot is blocked
- **Area**: NcAASelector
- **Type**: validation
- **Precondition**: AzF already assigned to slot B
- **Steps**: 1. Open selector for slot J 2. Click AzF again
- **Expected**: Alert "This value has already been added." (info); slot J stays empty
- **Ref**: src/lib/components/NcAASelector.svelte:63-82

### TC-XC-13: Removing an ncAA slot clears it and dispatches to parent (no stale value)
- **Area**: NcAASelector
- **Type**: regression
- **Precondition**: AzF assigned to slot B
- **Steps**: 1. Click cancel/remove on slot B
- **Expected**: `selectedData.B` set to null AND `confirmSelection()` dispatches changeNcAA so parent fullNcAA is refreshed (dispatch not omitted)
- **Ref**: ncaa-handling:29, src/lib/components/NcAASelector.svelte:84-93

### TC-XC-14: Six ncAA slots B/J/O/U/X/Z are all available
- **Area**: NcAASelector
- **Type**: happy
- **Precondition**: /stm open with ≥6 ncAAs saved
- **Steps**: 1. Inspect the selector grid
- **Expected**: Exactly six slots keyed B, J, O, U, X, Z rendered
- **Ref**: src/lib/components/NcAASelector.svelte:20-27,102-124

### TC-XC-15: Standard 20 amino acid monoisotopic masses are correct
- **Area**: amino_mapper.aminoMap
- **Type**: regression
- **Precondition**: none
- **Steps**: 1. Read aminoMap values for all 20 letters
- **Expected**: G=75.03203, A=89.04768, S=105.04259, T=119.05824, C=121.01975, V=117.07898, L=131.09463, I=131.09463, M=149.05105, P=115.06333, F=165.07898, Y=181.07389, W=204.08988, D=133.03751, E=147.05316, N=132.05349, Q=146.06914, H=155.06948, K=146.10553, R=174.11168
- **Ref**: amino-mapper-reference:38-59, amino_mapper.ts:38-59

### TC-XC-16: Leucine and Isoleucine share identical monoisotopic mass (indistinguishable by mass)
- **Area**: amino_mapper.aminoMap
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Compare aminoMap['L'] and aminoMap['I']
- **Expected**: Both equal 131.09463; algorithm cannot distinguish L vs I by mass alone
- **Ref**: amino-mapper-reference:61

### TC-XC-17: getIonWeight returns correct shift for all 9 selectable adducts
- **Area**: amino_mapper.getIonWeight
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Call getIonWeight for +H,+Na,+K,+NH₄,-H,-Na,-K,-NH₄,none
- **Expected**: +H=+1.0073, +Na=+22.9892, +K=+38.9632, +NH₄=+18.03382, -H=-1.0073, -Na=-22.9892, -K=-38.9632, -NH₄=-18.03382, none=0
- **Ref**: amino_mapper.ts:216-230

### TC-XC-18: getIonWeight returns 0 for unknown and default (non-registered) ion types
- **Area**: amino_mapper.getIonWeight
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Call getIonWeight('unknown') 2. Call getIonWeight with an unlisted string
- **Expected**: Both return 0 (10th branch + default), preventing NaN in mass math
- **Ref**: amino-mapper-reference:166-184, amino_mapper.ts:227-228

### TC-XC-19: Adduct display strings match AdductMapper registry
- **Area**: amino_mapper.adductPrintName / AdductMapper
- **Type**: regression
- **Precondition**: none
- **Steps**: 1. Resolve display strings for the 9 keys
- **Expected**: +H→[M+H]⁺, +Na→[M+Na]⁺, +K→[M+K]⁺, +NH₄→[M+NH₄]⁺, -H→[M-H]⁺, -Na→[M-2H+Na]⁺, -K→[M-2H+K]⁺, -NH₄→[M-2H+NH₄]⁺, none→[M]
- **Ref**: amino-mapper-reference:146-160

### TC-XC-20: RNA codon table has 64 entries with 3 stop codons
- **Area**: amino_mapper.codonTableRtoS
- **Type**: regression
- **Precondition**: none
- **Steps**: 1. Count entries 2. Check UAA, UAG, UGA 3. Check AUG
- **Expected**: 64 total (61 sense + 3 stop); UAA/UAG/UGA = '[Stop]'; AUG=M
- **Ref**: amino-mapper-reference:188-210

### TC-XC-21: DNA codon table mirrors RNA with T substituted for U
- **Area**: amino_mapper.codonTableDtoS
- **Type**: regression
- **Precondition**: none
- **Steps**: 1. Compare codonTableDtoS to codonTableRtoS 2. Check TAA/TAG/TGA and ATG
- **Expected**: 64 entries; identical AA assignments with U→T; TAA/TAG/TGA='[Stop]', ATG=M
- **Ref**: amino-mapper-reference:213-236

### TC-XC-22: molecularWeightMap and aminoFormulaMap are internally consistent per residue
- **Area**: amino_mapper
- **Type**: regression
- **Precondition**: none
- **Steps**: 1. Cross-check average MW and formula for e.g. W (204.229 / C11H12N2O2) and G (75.067 / C2H5NO2)
- **Expected**: 20-entry maps align with monoisotopic entries by letter; no missing residue
- **Ref**: amino-mapper-reference:65-115

### TC-XC-23: calculateSimilarity returns 100 for identical masses
- **Area**: mass_util.calculateSimilarity
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. calculateSimilarity(1000, 1000)
- **Expected**: 100 (difference 0)
- **Ref**: mass_util.ts:5-10

### TC-XC-24: calculateSimilarity clamps large deviations to 0 (never negative)
- **Area**: mass_util.calculateSimilarity
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. calculateSimilarity(100, 500) (400% deviation)
- **Expected**: Computed value <0 clamped to 0
- **Ref**: mass_util.ts:7-9

### TC-XC-25: calculateSimilarity rounds to 2 decimals
- **Area**: mass_util.calculateSimilarity
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. calculateSimilarity(1000, 999)
- **Expected**: Result 99.9 (parseFloat toFixed(2))
- **Ref**: mass_util.ts:8

### TC-XC-26: calculateSequenceSimilarity returns 0 for empty/missing sequences (zero-division protection)
- **Area**: mass_util.calculateSequenceSimilarity
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Call with ('','ABC') 2. Call with ('ABC','') 3. Call with (undefined,'ABC')
- **Expected**: Returns 0 in all cases; no division-by-zero/NaN
- **Ref**: mass_util.ts:13-20

### TC-XC-27: calculateSequenceSimilarity strips leading formylation before comparison
- **Area**: mass_util.calculateSequenceSimilarity
- **Type**: edge
- **Precondition**: none
- **Steps**: 1. Call with ('fACDE','ACDE')
- **Expected**: Leading `^f` removed on both; similarity computed on ACDE vs ACDE = 100
- **Ref**: mass-util-helpers:36-39, mass_util.ts:17-18

### TC-XC-28: calculateSequenceSimilarity denominator is reference count; over-supply does not exceed 100
- **Area**: mass_util.calculateSequenceSimilarity
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Call with result 'AAAA', reference 'AA'
- **Expected**: matched = min(refA,resA) per amino / totalReference = 2/2 → 100 (capped by min())
- **Ref**: mass_util.ts:38-48

### TC-XC-29: calculateSequenceSimilarityWithCounts uses longer sequence as denominator
- **Area**: mass_util.calculateSequenceSimilarityWithCounts
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Call with result 'AA', reference 'AAAA'
- **Expected**: totalCount = max(2,4)=4; matched=2; similarity=50.0; returns {similarity, matchedCount:2, totalCount:4}
- **Ref**: mass-util-helpers:41-45, mass_util.ts:83-100

### TC-XC-30: sortAmino orders by mass difference only when no reference sequence given
- **Area**: mass_util.sortAmino
- **Type**: branch
- **Precondition**: List with weights [1005, 1000, 1010]
- **Steps**: 1. sortAmino(list, 1000) with no referenceSequence
- **Expected**: Ordered by |weight-1000| ascending → 1000,1005,1010
- **Ref**: mass_util.ts:112-138

### TC-XC-31: sortAmino applies default 0.9/0.1 weighted score when reference provided
- **Area**: mass_util.sortAmino
- **Type**: branch
- **Precondition**: List with weights + code sequences, reference sequence supplied
- **Steps**: 1. sortAmino(list, compareValue, referenceSeq)
- **Expected**: Uses normalized massDiff*0.9 + normalizedSeq*0.1; lower combined score first; distinct from SA 80/20 evaluateWeights
- **Ref**: mass-util-helpers:47-63, mass_util.ts:106-133

### TC-XC-32: sortAmino guards normalization when all mass diffs equal (maxMassDiff 0)
- **Area**: mass_util.sortAmino
- **Type**: edge
- **Precondition**: All candidate weights equal compareValue
- **Steps**: 1. sortAmino with reference, identical weights
- **Expected**: normalizedDiff falls back to 0 (maxMassDiff>0 guard); sort proceeds on seq term only, no NaN
- **Ref**: mass_util.ts:122-124

### TC-XC-33: removeDuplicates keeps higher mass-similarity entry on code collision
- **Area**: mass_util.removeDuplicates
- **Type**: branch
- **Precondition**: Two AminoModels with same code, similarity 90 vs 80
- **Steps**: 1. removeDuplicates(list)
- **Expected**: The similarity-90 entry retained
- **Ref**: mass_util.ts:142-172

### TC-XC-34: removeDuplicates tiebreaks on sequenceSimilarity when mass similarity equal
- **Area**: mass_util.removeDuplicates
- **Type**: branch
- **Precondition**: Same code, equal similarity, sequenceSimilarity 70 vs 60
- **Steps**: 1. removeDuplicates(list)
- **Expected**: sequenceSimilarity-70 entry retained
- **Ref**: mass_util.ts:164-167

### TC-XC-35: removeSingleFSequences filters lone-formylation entries (code==='f')
- **Area**: mass_util.removeSingleFSequences
- **Type**: edge
- **Precondition**: List with one entry code 'f' and others
- **Steps**: 1. removeSingleFSequences(list)
- **Expected**: The 'f'-only entry removed; others preserved
- **Ref**: mass_util.ts:175-180

### TC-XC-36: processKnownSequenceOverlap — fixed fully contained in RNA removes fixed portion
- **Area**: mass_util.processKnownSequenceOverlap
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Call known='CDE', rna='ABCDEFG'
- **Expected**: hasOverlap true; remainingRnaSequence='ABFG' (fixed spliced out); overlapPosition=2
- **Ref**: mass-util-helpers:73-81, mass_util.ts:204-222

### TC-XC-37: processKnownSequenceOverlap — RNA fully contained in fixed empties RNA
- **Area**: mass_util.processKnownSequenceOverlap
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Call known='ABCDEFG', rna='CDE'
- **Expected**: remainingRnaSequence=''; finalKnownSequence unchanged; hasOverlap true
- **Ref**: mass_util.ts:224-238

### TC-XC-38: processKnownSequenceOverlap — fixed suffix / RNA prefix partial overlap trimmed
- **Area**: mass_util.processKnownSequenceOverlap
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Call known='ABCXY', rna='XYZW'
- **Expected**: Overlap 'XY' detected; remainingRnaSequence='ZW'
- **Ref**: mass_util.ts:240-259

### TC-XC-39: processKnownSequenceOverlap — no overlap returns both unchanged
- **Area**: mass_util.processKnownSequenceOverlap
- **Type**: branch
- **Precondition**: none
- **Steps**: 1. Call known='ABC', rna='XYZ'
- **Expected**: hasOverlap false; both sequences returned as-is; overlapPosition -1
- **Ref**: mass_util.ts:282-291

### TC-XC-40: processKnownSequenceOverlap — empty input short-circuits
- **Area**: mass_util.processKnownSequenceOverlap
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. Call known='', rna='ABC'
- **Expected**: hasOverlap false; returns inputs unchanged, no error
- **Ref**: mass_util.ts:192-202

### TC-XC-41: Worker runs SA off main thread (non-blocking) and returns success payload
- **Area**: mass_finder.worker
- **Type**: happy
- **Precondition**: MTS page posts a valid legacy payload (no sequenceTemplate)
- **Steps**: 1. postMessage with detectedMass, adduct, maps, etc. 2. Await response
- **Expected**: UI stays responsive; worker replies `{type:'success', solutions: AminoModel[]}`
- **Ref**: web-worker-pattern, mass_finder.worker.ts:42-59

### TC-XC-42: Worker routes to template path when sequenceTemplate.gapTotalLength > 0
- **Area**: mass_finder.worker
- **Type**: branch
- **Precondition**: Payload includes sequenceTemplate with gapTotalLength=3
- **Steps**: 1. postMessage 2. Observe which helper is called
- **Expected**: calcByIonTypeWithTemplate invoked (template path); knownSequence/proteinSequence not passed
- **Ref**: web-worker-pattern:52-61, mass_finder.worker.ts:24-39

### TC-XC-43: Worker routes to legacy path when no/empty template (gap ≤ 0)
- **Area**: mass_finder.worker
- **Type**: branch
- **Precondition**: Payload without sequenceTemplate (or gapTotalLength=0)
- **Steps**: 1. postMessage 2. Observe helper
- **Expected**: calcByIonType invoked with knownSequence + proteinSequence
- **Ref**: mass_finder.worker.ts:40-57

### TC-XC-44: Worker applies default SA params when omitted
- **Area**: mass_finder.worker
- **Type**: edge
- **Precondition**: Payload omits initialTemperature/absoluteTemperature/saIterations
- **Steps**: 1. postMessage without those fields
- **Expected**: Defaults used: initialTemperature=10000, absoluteTemperature=0.00001, saIterations=100
- **Ref**: web-worker-pattern:42-50, mass_finder.worker.ts:12-14

### TC-XC-45: Worker propagates errors as discriminated error payload
- **Area**: mass_finder.worker
- **Type**: edge
- **Precondition**: Payload triggers an exception inside the helper
- **Steps**: 1. postMessage a payload that throws
- **Expected**: Reply `{type:'error', error: <message>}`; non-Error falls back to 'Unknown error occurred'; worker not crashed
- **Ref**: web-worker-pattern:63-73, mass_finder.worker.ts:60-65

### TC-XC-46: SeqSaveDialog requires content; empty content shows validation error
- **Area**: SeqSaveDialog
- **Type**: validation
- **Precondition**: Save dialog open with content field blank
- **Steps**: 1. Clear content 2. Click Save
- **Expected**: contentError true, "Content is required" shown; no save dispatch
- **Ref**: src/lib/components/stm/SeqSaveDialog.svelte:17-25,62-66

### TC-XC-47: SeqSaveDialog saves with optional title and trims values
- **Area**: SeqSaveDialog + InitialRnaInput/SeqConverter
- **Type**: happy
- **Precondition**: Save dialog open, content prefilled from current RNA input
- **Steps**: 1. Enter title "  test  " 2. Keep content 3. Click Save
- **Expected**: dispatch save with {title:'test', content:trimmed}; entry pushed to `savedRnaSeqs`; dialog closes and fields reset
- **Ref**: src/lib/components/stm/SeqSaveDialog.svelte:22-33, InitialRnaInput.svelte:73-78

### TC-XC-48: SeqSaveDialog content syncs to current input value when reopened
- **Area**: SeqSaveDialog
- **Type**: edge
- **Precondition**: initialContent bound to current RNA value
- **Steps**: 1. Change RNA input 2. Open Save dialog
- **Expected**: Reactive `$: if(showDialog) content = initialContent` pre-fills content with latest value
- **Ref**: src/lib/components/stm/SeqSaveDialog.svelte:13-15

### TC-XC-49: SeqLoadDialog shows empty-state when no saved sequences
- **Area**: SeqLoadDialog
- **Type**: edge
- **Precondition**: `savedRnaSeqs` absent/empty
- **Steps**: 1. Open Load dialog
- **Expected**: "No saved sequences found." shown; list empty
- **Ref**: src/lib/components/stm/SeqLoadDialog.svelte:41-44

### TC-XC-50: SeqLoadDialog select loads sequence into input (with normalization)
- **Area**: SeqLoadDialog + InitialRnaInput
- **Type**: happy
- **Precondition**: `savedRnaSeqs` has a saved DNA/RNA sequence
- **Steps**: 1. Open Load dialog 2. Click a saved item
- **Expected**: dispatch select→handleLoad; value re-normalized (uppercase, whitespace stripped, T→U); dialog closes; input updated
- **Ref**: src/lib/components/stm/SeqLoadDialog.svelte:18-21, InitialRnaInput.svelte:84-88

### TC-XC-51: SeqLoadDialog delete removes saved sequence and persists
- **Area**: SeqLoadDialog
- **Type**: happy
- **Precondition**: `savedRnaSeqs` has ≥2 entries
- **Steps**: 1. Open Load dialog 2. Click × on one item (stopPropagation, not triggering select)
- **Expected**: Item filtered from list and `savedRnaSeqs` re-saved; parent select NOT dispatched
- **Ref**: src/lib/components/stm/SeqLoadDialog.svelte:28-32

### TC-XC-52: SeqLoadDialog shows "Untitled" for entries saved without a title
- **Area**: SeqLoadDialog
- **Type**: edge
- **Precondition**: `savedRnaSeqs` contains an item with empty title
- **Steps**: 1. Open Load dialog
- **Expected**: That item's header renders "Untitled"; content shown below
- **Ref**: src/lib/components/stm/SeqLoadDialog.svelte:53-55

### TC-XC-53: RNA input normalization converts DNA to RNA and strips whitespace
- **Area**: InitialRnaInput.normalizeRnaInput
- **Type**: edge
- **Precondition**: /stm or /mts RNA input
- **Steps**: 1. Type/paste "atg aaa\ntgg"
- **Expected**: Normalized to "AUGAAAUGG" (uppercase, whitespace removed, T→U)
- **Ref**: InitialRnaInput.svelte:19-26

### TC-XC-54: RNA validation rejects non-AUGC characters
- **Area**: InitialRnaInput.validateRnaSequence
- **Type**: validation
- **Precondition**: RNA input present
- **Steps**: 1. Enter "AUGX" (X invalid after normalization)
- **Expected**: is-invalid state; message "Only A, U, G, C are allowed in RNA sequence"
- **Ref**: InitialRnaInput.svelte:49-59

### TC-XC-55: RNA validation requires length multiple of 3
- **Area**: InitialRnaInput.validateRnaSequence
- **Type**: boundary
- **Precondition**: RNA input present
- **Steps**: 1. Enter "AUGA" (length 4)
- **Expected**: Invalid; message "RNA sequence length must be a multiple of 3 (codon units)"
- **Ref**: InitialRnaInput.svelte:61-66

### TC-XC-56: RNA-to-amino preview stops at first stop codon
- **Area**: InitialRnaInput.convertRnaToAminoAcids
- **Type**: branch
- **Precondition**: RNA input present
- **Steps**: 1. Enter "AUGUAAGGG" (M, Stop, G)
- **Expected**: Converted preview shows "M" only (break at UAA stop)
- **Ref**: InitialRnaInput.svelte:28-47

### TC-XC-57: storage.save enforces 5MB default size limit
- **Area**: storage.service
- **Type**: boundary
- **Precondition**: none
- **Steps**: 1. storage.save(key, data) where serialized wrapper > 5MB
- **Expected**: Returns false; error logged "Data too large"; nothing written
- **Ref**: storage.service.ts:95-104

### TC-XC-58: storage.save handles QuotaExceededError gracefully
- **Area**: storage.service
- **Type**: edge
- **Precondition**: localStorage near quota
- **Steps**: 1. storage.save that throws QuotaExceededError
- **Expected**: Caught; returns false; error "Storage quota exceeded"; app not crashed
- **Ref**: storage.service.ts:115-124

### TC-XC-59: storage.load returns null for corrupted (unparseable) JSON
- **Area**: storage.service
- **Type**: edge
- **Precondition**: localStorage key holds invalid JSON
- **Steps**: 1. storage.load(key)
- **Expected**: JSON.parse throws → caught → returns null; error logged; no crash
- **Ref**: storage.service.ts:146-195

### TC-XC-60: storage is a no-op returning null/false under SSR (localStorage unavailable)
- **Area**: storage.service
- **Type**: edge
- **Precondition**: window/localStorage undefined (SSR)
- **Steps**: 1. new StorageService() 2. save/load/has/keys
- **Expected**: isAvailable false; save returns false, load returns null, has false, keys []; warning logged once
- **Ref**: storage.service.ts:51-60,78-82,141-144

### TC-XC-61: storage.load migrates legacy (unwrapped) data to new wrapper format
- **Area**: storage.service
- **Type**: regression
- **Precondition**: key holds legacy object without data/timestamp fields
- **Steps**: 1. storage.load(key)
- **Expected**: Legacy object returned as-is and re-saved wrapped (auto-migration)
- **Ref**: storage.service.ts:155-172

### TC-XC-62: storage.load honors expiresAt and removes expired entries
- **Area**: storage.service
- **Type**: edge
- **Precondition**: key saved with expiresIn in the past
- **Steps**: 1. storage.load(key) after expiry
- **Expected**: Detected expired; entry removed; returns null
- **Ref**: storage.service.ts:177-182

### TC-XC-63: storage.save validator rejects invalid data
- **Area**: storage.service
- **Type**: validation
- **Precondition**: none
- **Steps**: 1. storage.save(key, data, {validator: ()=>false})
- **Expected**: Returns false; "Validation failed" logged; not written
- **Ref**: storage.service.ts:106-110

### TC-XC-64: createPrefixedStorage namespaces keys correctly
- **Area**: storage.service.createPrefixedStorage
- **Type**: happy
- **Precondition**: none
- **Steps**: 1. createPrefixedStorage('user_').save('settings', v)
- **Expected**: Underlying key stored as 'user_settings'
- **Ref**: storage.service.ts:360-370

### TC-XC-65: Root landing page hides Navbar/Footer and offers module cards
- **Area**: /+layout.svelte + /+page.svelte
- **Type**: happy
- **Precondition**: Navigate to '/'
- **Steps**: 1. Load root
- **Expected**: isRootPath true → Navbar and Footer NOT rendered; module cards for My ncAAs, Custom Reactions (potential), STM, MTS plus Manual button shown
- **Ref**: src/routes/+layout.svelte:16,44-52, +page.svelte:298-370

### TC-XC-66: Module cards navigate to correct routes
- **Area**: /+page.svelte navigation
- **Type**: happy
- **Precondition**: Root page open
- **Steps**: 1. Click My ncAAs / STM / MTS / Modifications / Manual cards
- **Expected**: goto('/draw'), goto('/stm'), goto('/mts'), goto('/potential'), goto('/manual') respectively; keyboard Enter also triggers
- **Ref**: src/routes/+page.svelte:279-366

### TC-XC-67: Non-root routes render Navbar and Footer
- **Area**: /+layout.svelte
- **Type**: branch
- **Precondition**: Navigate to /mts (or any non-root)
- **Steps**: 1. Load /mts
- **Expected**: isRootPath false → Navbar and Footer rendered around slot content
- **Ref**: src/routes/+layout.svelte:44-52

### TC-XC-68: Global loading spinner shows when loading context store is true
- **Area**: /+layout.svelte loading context
- **Type**: happy
- **Precondition**: A page sets the injected `loading` context store true during worker calc
- **Steps**: 1. Trigger a long MTS calculation
- **Expected**: `$loading` true → full-screen loading-overlay + spinner with aria-live status shown; hidden when false
- **Ref**: src/routes/+layout.svelte:12-13,33-39

### TC-XC-69: Skip-to-main-content accessibility link present
- **Area**: /+layout.svelte
- **Type**: edge
- **Precondition**: Any non-root page
- **Steps**: 1. Tab to first focusable element
- **Expected**: "Skip to main content" link focuses and targets #main-content
- **Ref**: src/routes/+layout.svelte:42,47

### TC-XC-70: Manual page in-page navigation scrolls to sections
- **Area**: /manual
- **Type**: happy
- **Precondition**: /manual open
- **Steps**: 1. Click Welcome / My ncAAs / Potential Modification / S2M / M2S nav links
- **Expected**: Smooth scroll to corresponding section ids (welcome, ncaa, potential, s2m, m2s)
- **Ref**: src/routes/manual/+page.svelte:2-8, nav links

### TC-XC-71: Adduct/ion type selection is consistent between STM and MTS (same 9 adducts)
- **Area**: AdductSelector / StmAdductSelector + getIonWeight
- **Type**: regression
- **Precondition**: STM and MTS pages
- **Steps**: 1. Compare adduct options on both pages
- **Expected**: Both expose the same 9 selectable adducts backed by identical getIonWeight shifts; no divergence
- **Ref**: amino-mapper-reference:146-184, x-mas-project-overview:51

### TC-XC-72: Reset after ncAA save fully clears ChemDoodle sketcher (page reload)
- **Area**: /draw resetForm
- **Type**: edge
- **Precondition**: ncAA just saved
- **Steps**: 1. Complete a save
- **Expected**: window.location.reload() runs so the sketcher state is fully reset (no residual structure)
- **Ref**: src/routes/draw/+page.svelte:57-60

### TC-XC-73: ncAA slot codon assignment cleared when slot removed (no stale codon)
- **Area**: NcAASelector / NcAACodonSelector (v2.1 invariant)
- **Type**: regression
- **Precondition**: Slot B assigned an ncAA with codon(s) in MTS/STM
- **Steps**: 1. Remove slot B
- **Expected**: onCancelSelectData clears both the slot value and codonAssignments[B] so no stale codon remains. (NOTE: NcAASelector nulls the slot; verify the page-level `codonTitles`/`codonAssignments` handler actually clears the codon map.)
- **Ref**: ncaa-handling:30, NcAASelector.svelte:84-93

---

## 부록 — 교차 참조 & 한계

- **의도적 중복**: §6 공통 섹션의 일부는 다른 섹션과 겹칩니다 — Draw ncAA 저장(TC-XC-01~08 ↔ TC-DRAW-01~12), RNA 정규화(TC-XC-53~56 ↔ TC-MTS-07~14 / TC-STM-05~08), 웹워커(TC-XC-41~45 ↔ TC-MTS-62~64), adduct(TC-XC-17~19 ↔ TC-MTS-26/27, TC-STM-27~31). 실행 시 한 번만 수행.
- **검증 방식**: 위키 SSOT + 코드 정적 분석 기반. 브라우저 실동작(클릭/드래그/모달) 검증은 별도 필요.
- **자동화 후보**: 순수 함수(§6의 mass_util, amino_mapper, storage.service, MTS SA 슬라이더 매핑, stop codon 번역)는 Vitest 단위 테스트로, UI 상호작용(드래그/divider/특수타일/모달)은 Playwright E2E로 옮기기 좋음.
- **최근 회귀 케이스(PDF 반영)**: TC-MTS-07/08/23/37/40/41/44/45/46/53/54, TC-STM-06 등 `regression` 타입이 이번 릴리스 변경 커버리지.
