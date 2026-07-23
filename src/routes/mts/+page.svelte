<script>
  import AdductSelector from "$lib/components/AdductSelector.svelte";
  import FormylationSelector from "$lib/components/FormylationSelector.svelte";
  import AminoMapSelector from "$lib/components/AminoMapSelector.svelte";
  import NcAACodonSelector from "$lib/components/NcAACodonSelector.svelte";
  import ResultTable from "$lib/components/ResultTable.svelte";
  import InitialRnaInput from "$lib/components/InitialRnaInput.svelte";
  import SAIterationSlider from "$lib/components/SAIterationSlider.svelte";
  import PeptideSequenceSelector from "$lib/components/PeptideSequenceSelector.svelte";
  import { getContext, onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import { showAlert } from "$lib/stores/alertStore.js";
  import {
    aminoMap,
    molecularWeightMap,
    codonTableRtoS,
  } from "$lib/helper/amino_mapper";

  // 상태 관리 변수들
  let detectedMass = null;
  let proteinSequence = "";
  let formylation = "unknown";
  let adduct = "+H";
  // SA 설정 (기본값: Standard). 온도는 고정, iteration 만 SAIterationSlider 가 조절.
  let saConfig = {
    initialTemperature: 10000,
    absoluteTemperature: 0.001,
    saIterations: 1000
  };
  /** @type {{ [key: string]: number }} */
  let selectedMonoisotopicAminos = { ...aminoMap };
  // NcAACodonSelector 가 dispatch 하는 selectedData. 빈 슬롯은 0.0 (number) 으로 표시됨 — STM 패턴.
  let fullNcAA = { B: 0.0, J: 0.0, O: 0.0, U: 0.0, X: 0.0, Z: 0.0 };
  // 슬롯별 codon 매핑 (배열). STM 의 NcAACodonSelector 가 bind 로 갱신.
  let codonTitles = writable({ B: [], J: [], O: [], U: [], X: [], Z: [] });
  const loading = getContext("loading");
  let bestSolutions = [];
  let allSolutions = []; // 전체 결과를 저장할 배열
  let maxResultCount = 20; // 표시할 최대 결과 개수
  let worker;

  // Template 상태 (PeptideSequenceSelector에서 전달)
  let sequenceTemplate = null;

  // v2.1: position override (사용자가 팝오버에서 직접 선택한 letter). 메모리 only.
  /** @type {{ [position: number]: string }} */
  let positionOverrides = {};

  // 슬롯 letter 순서 (B→J→O→U→X→Z) — "더 먼저 선택된 ncAA" 정의
  const SLOT_ORDER = ['B', 'J', 'O', 'U', 'X', 'Z'];
  const STANDARD_AA_LETTERS = ['G','A','S','T','C','V','L','I','M','P','F','Y','W','D','E','N','Q','H','K','R'];

  onDestroy(() => {
    if (worker) {
      worker.terminate();
    }
  });

  // Calculate 버튼 클릭 시 호출되는 메서드
  async function handleCalculate() {
    const startTime = performance.now();
    console.log("계산 시작:", new Date().toISOString());

    loading.set(true);
    if (!(await validate())) return loading.set(false);

    try {
      // 선택된 NCAA 값들. NcAACodonSelector 가 빈 슬롯을 0.0 으로 표시하므로 object 인 것만 추림.
      let filteredNcAA = Object.fromEntries(
        Object.entries(fullNcAA).filter(([, value]) => value && typeof value === "object"),
      );

      let filteredMonoisotopicWeights = Object.fromEntries(
        Object.entries(filteredNcAA).map(([key, value]) => [
          key,
          Number(value?.monoisotopicWeight),
        ]),
      );

      // monoisotopicMass 를 구하기 위한 전용 Map
      const monoisotopicMap = {
        ...selectedMonoisotopicAminos,
        ...filteredMonoisotopicWeights,
      };

      // selectedMonoisotopicAminos 와 같은 key를 가지고 value만 Molcular 로 가지는 맵
      let ncAAMolecularWeights = Object.fromEntries(
        Object.entries(selectedMonoisotopicAminos).map(([key, _]) => [
          key,
          molecularWeightMap[key],
        ]),
      );

      let filteredMolecularWeights = Object.fromEntries(
        Object.entries(filteredNcAA).map(([key, value]) => [
          key,
          Number(value?.molecularWeight),
        ]),
      );

      let molecularMap = {
        ...ncAAMolecularWeights,
        ...filteredMolecularWeights,
      };

      // Worker 생성 및 메시지 처리
      if (!worker) {
        worker = new Worker(
          new URL("$lib/workers/mass_finder.worker.ts", import.meta.url),
          { type: "module" },
        );
      }

      worker.onmessage = (e) => {
        const endTime = performance.now();
        const calculationTime = endTime - startTime;

        if (e.data.type === "success") {
          allSolutions = e.data.solutions;
          bestSolutions = allSolutions.slice(0, maxResultCount);
          console.log("All solutions count:", allSolutions.length);
          console.log("Displayed solutions:", bestSolutions.length);
          console.log(`계산 완료 시간: ${calculationTime.toFixed(2)}ms (${(calculationTime/1000).toFixed(2)}초)`);
        } else if (e.data.type === "error") {
          console.error("Worker error:", e.data.error);
          console.log(`계산 실패 시간: ${calculationTime.toFixed(2)}ms`);
          showAlert("An error occurred while calculating", "Error", "error");
        }
        loading.set(false);
      };

      worker.onerror = (error) => {
        console.error("Worker error:", error);
        showAlert("An error occurred while calculating", "Error", "error");
        loading.set(false);
      };

      // Worker에 데이터 전송
      const workerData = {
        detectedMass,
        formylation,
        adduct,
        monoisotopicMap,
        molecularMap,
        initialTemperature: saConfig.initialTemperature,
        absoluteTemperature: saConfig.absoluteTemperature,
        saIterations: saConfig.saIterations,
      };

      if (sequenceTemplate && sequenceTemplate.gapTotalLength > 0) {
        // Template 모드: ncAA 선택이 있어서 갭이 존재하는 경우
        workerData.sequenceTemplate = sequenceTemplate;
      } else {
        // ncAA 미선택 또는 RNA 미입력: 기존 방식 (RNA를 참조 시퀀스로 사용).
        // v2.1: 치환이 적용된 convertedAminoSequence 를 reference 로 사용. 비어있으면 raw 시퀀스 fallback.
        workerData.knownSequence = "";
        workerData.proteinSequence = convertedAminoSequence || proteinSequence;
      }

      worker.postMessage(workerData);
    } catch (error) {
      console.error("Error:", error);
      showAlert("An error occurred while calculating", "Error", "error");
      loading.set(false);
    }
  }

  function handleFormylationChange(newFormylation) {
    formylation = newFormylation;
  }

  function handleAdductChange(newAdduct) {
    adduct = newAdduct;
  }

  function handleSAModeChange(newConfig) {
    saConfig = newConfig;
  }

  function handleNcAAChange(e) {
    fullNcAA = e.detail;
  }

  // NcAACodonSelector 의 codonTitles 변경 콜백 (STM 패턴)
  function onChangeCodonTitles(codonArray, key) {
    $codonTitles[key] = codonArray;
  }

  function handleAminoMapChange(newAminos) {
    selectedMonoisotopicAminos = Object.fromEntries(
      Object.entries(newAminos)
        .filter(([key, value]) => value)
        .map(([key]) => [key, aminoMap[key]]),
    );
  }

  // PeptideSequenceSelector에서 전달받은 템플릿 정보 처리
  function handleTemplateChange(e) {
    const { fullSequence, positionStates, fixedSegments, gapSegments } = e.detail;

    if (!fullSequence) {
      sequenceTemplate = null;
      return;
    }

    sequenceTemplate = {
      fullSequence,
      positionStates,
      fixedSegments,
      gapSegments,
      totalLength: fullSequence.length,
      gapTotalLength: gapSegments.reduce((sum, g) => sum + g.length, 0),
    };
  }

  async function validate() {
    if (detectedMass === null) {
      await showAlert("Please Input Detected mass", "Validation Error", "warning");
      return false;
    }

    // if (detectedMass > 10000) {
    //   await showAlert("The detected mass value is too large. Please enter a value below 10,000.", "Validation Error", "warning");
    //   return false;
    // }

    if (!validatePeptideSequence()) {
      await showAlert("Please enter the correct Peptide sequence", "Validation Error", "warning");
      return false;
    }

    return true;
  }

  // v2.1: ncAA codon 치환 + position override + stop suppression 지원.
  // helper 의 동일 함수와 시그니처 일치 (mass_finder_helper.ts:262 참조).
  function convertRnaToAminoAcids(rnaSequence, options) {
    if (!rnaSequence) return "";

    const codons = rnaSequence.match(/.{1,3}/g) || [];
    const opts = options || {};
    const excluded = opts.excludedAA || new Set();
    const codonMap = opts.ncaaCodonMap || {};
    const overrides = opts.positionOverrides || {};

    let aminoSequence = "";

    for (let i = 0; i < codons.length; i++) {
      const codon = codons[i];
      if (codon.length !== 3) continue;

      // 사용자 override 우선
      if (overrides[i] !== undefined) {
        aminoSequence += overrides[i];
        continue;
      }

      const natural = codonTableRtoS[codon];
      const candidates = codonMap[codon] || [];

      if (natural === "[Stop]") {
        if (candidates.length > 0) {
          aminoSequence += candidates[0].letter; // amber/ochre/opal suppression
        } else {
          break;
        }
      } else if (natural && excluded.has(natural) && candidates.length > 0) {
        aminoSequence += candidates[0].letter; // 자동 치환 (첫 후보)
      } else if (natural) {
        aminoSequence += natural;
      }
    }

    return aminoSequence;
  }

  async function validatePeptideSequence() {
    // 빈 문자열인 경우 유효함 (선택사항)
    if (proteinSequence === "") return true;

    // RNA 시퀀스 검증: A, U, G, C만 허용
    const validRnaBases = ["A", "U", "G", "C"];
    for (let char of proteinSequence) {
      if (!validRnaBases.includes(char)) {
        return false;
      }
    }

    // 3의 배수 길이 검증 (코돈 단위)
    if (proteinSequence.length % 3 !== 0) {
      await showAlert("RNA sequence length must be a multiple of 3 (codon units)", "Validation Error", "warning");
      return false;
    }

    return true;
  }

  // 사용 가능한 아미노산 set 에서 제외된 표준 AA (Amino acids set 체크박스 해제분).
  $: excludedAA = new Set(
    STANDARD_AA_LETTERS.filter((a) => !selectedMonoisotopicAminos[a])
  );

  // ncaaCodonMap: codon → 후보 ncAA 배열 (슬롯 letter 순 정렬됨).
  // v2.2: 슬롯당 다중 codon 지원 (codonTitles[letter] = string[]).
  // 같은 codon 이 여러 슬롯에 들어가면 다중 후보 (팝오버 트리거 대상).
  $: ncaaCodonMap = (() => {
    const map = {};
    const titles = $codonTitles;
    for (const letter of SLOT_ORDER) {
      const data = fullNcAA[letter];
      const codons = titles[letter] || [];
      if (!data || typeof data !== "object" || codons.length === 0) continue;
      for (const codon of codons) {
        if (!map[codon]) map[codon] = [];
        map[codon].push({
          letter,
          name: data.title || data.name,
          monoisotopicWeight: Number(data.monoisotopicWeight),
        });
      }
    }
    return map;
  })();

  // proteinSequence (RNA) / 옵션 변경 시 override 정합성 점검: codon 할당이 사라진 슬롯의
  // letter 가 override 에 남아있으면 invalidate.
  $: {
    const validLetters = new Set([
      ...STANDARD_AA_LETTERS,
      ...Object.values(ncaaCodonMap)
        .flat()
        .map((c) => c.letter),
    ]);
    let changed = false;
    const next = {};
    for (const [k, v] of Object.entries(positionOverrides)) {
      if (validLetters.has(v)) next[k] = v;
      else changed = true;
    }
    if (changed) positionOverrides = next;
  }

  // 치환 적용된 시퀀스. PeptideSequenceSelector + initial peptide + similarity reference 모두 이를 사용.
  $: convertedAminoSequence = proteinSequence
    ? convertRnaToAminoAcids(proteinSequence, {
        excludedAA,
        ncaaCodonMap,
        positionOverrides,
      })
    : "";

  // PeptideSequenceSelector 에 전달할 보조 정보:
  //  - autoSubPositions: 자동 치환된 위치 (보라 테두리 대상)
  //  - multiCandidatePositions: 후보 ≥ 2 인 위치 (↓ 화살표 + 팝오버 트리거)
  //  - candidatesByPosition: 해당 위치의 후보 ncAA 배열
  //  - naturalByPosition: 해당 위치의 자연 AA letter
  //  - partialDropAA: 부분 드롭 경고 대상 자연 AA (예: L 제외 + UUA 만 할당)
  $: substitutionInfo = (() => {
    const result = {
      autoSubPositions: new Set(),
      multiCandidatePositions: new Set(),
      candidatesByPosition: {},
      naturalByPosition: {},
      partialDropAA: new Set(),
    };
    if (!proteinSequence) return result;
    const codons = proteinSequence.match(/.{1,3}/g) || [];
    /** @type {{ [aa: string]: { hasNcAA: boolean, missingCodons: string[] } }} */
    const aaCoverage = {};
    for (let i = 0; i < codons.length; i++) {
      const codon = codons[i];
      if (codon.length !== 3) continue;
      const natural = codonTableRtoS[codon];
      if (!natural || natural === "[Stop]") {
        // stop 도 ncAA suppression 가능
        const candidates = ncaaCodonMap[codon] || [];
        if (natural === "[Stop]" && candidates.length > 0) {
          result.autoSubPositions.add(i);
          if (candidates.length >= 2) result.multiCandidatePositions.add(i);
          result.candidatesByPosition[i] = candidates;
          result.naturalByPosition[i] = "*"; // stop 표시
        }
        continue;
      }
      const candidates = ncaaCodonMap[codon] || [];
      const triggered =
        excludedAA.has(natural) && candidates.length > 0;
      const overridden = positionOverrides[i] !== undefined;
      if (triggered || overridden) {
        result.autoSubPositions.add(i);
        if (candidates.length >= 2)
          result.multiCandidatePositions.add(i);
        result.candidatesByPosition[i] = candidates;
        result.naturalByPosition[i] = natural;
      }
      // 부분 드롭 감지: 자연 제외됨 + 이 codon 엔 ncAA 없음 → 다른 같은 자연의 codon 도 비교
      if (excludedAA.has(natural)) {
        if (!aaCoverage[natural])
          aaCoverage[natural] = { hasNcAA: false, missingCodons: [] };
        if (candidates.length === 0)
          aaCoverage[natural].missingCodons.push(codon);
        else aaCoverage[natural].hasNcAA = true;
      }
    }
    // 부분 드롭 = 일부 codon 은 치환, 일부는 드롭
    for (const [aa, info] of Object.entries(aaCoverage)) {
      if (info.hasNcAA && info.missingCodons.length > 0) result.partialDropAA.add(aa);
    }
    return result;
  })();

  $: hasReferenceSequence = proteinSequence && proteinSequence.trim() !== "";

  // 팝오버에서 override 선택 시 호출
  function handleOverride(e) {
    const { position, letter } = e.detail;
    positionOverrides = { ...positionOverrides, [position]: letter };
  }

  // maxResultCount가 변경될 때마다 결과를 다시 필터링
  $: if (allSolutions.length > 0) {
    bestSolutions = allSolutions.slice(0, maxResultCount);
  }
</script>

<svelte:head>
  <title>Mass to Sequence - X-MAS</title>
</svelte:head>

<div class="container mt-5">
  <div class="text-center mb-4">
    <h1>Mass to Sequence</h1>
  </div>

  <div class="mb-3">
    <label for="detected-mass" class="form-label fw-bold"
      >Detected mass <span class="text-danger">*</span></label
    >
    <input
      type="number"
      id="detected-mass"
      bind:value={detectedMass}
      class="form-control"
      placeholder="Detected mass"
      aria-required="true"
      required
    />
  </div>

  <InitialRnaInput
    bind:value={proteinSequence}
    on:input={(e) => (proteinSequence = e.detail.value)}
  />

  <!-- RNA 번역 펩타이드 시퀀스 맵: ncAA 위치 선택 및 Fixed/Variable 영역 시각화 -->
  <PeptideSequenceSelector
    aminoSequence={convertedAminoSequence}
    autoSubPositions={substitutionInfo.autoSubPositions}
    multiCandidatePositions={substitutionInfo.multiCandidatePositions}
    candidatesByPosition={substitutionInfo.candidatesByPosition}
    naturalByPosition={substitutionInfo.naturalByPosition}
    selectedAminoSet={selectedMonoisotopicAminos}
    on:change={handleTemplateChange}
    on:override={handleOverride}
  />

  <!-- 부분 드롭 경고 (P4): 자연 AA 제외했는데 일부 codon 만 ncAA 할당 -->
  {#if substitutionInfo.partialDropAA.size > 0}
    <div class="alert alert-warning mb-3 py-2 small">
      <strong>Partial substitution:</strong>
      {#each Array.from(substitutionInfo.partialDropAA) as aa, idx}{idx > 0 ? ', ' : ''}{aa}{/each}
      — some codons of these excluded amino acids have no ncAA assignment and those positions will be dropped from the initial pool.
    </div>
  {/if}

  <div class="mb-3">
    <div class="selector-row">
      <div class="selector-item">
        <FormylationSelector
          on:change={(e) => handleFormylationChange(e.detail)}
        />
      </div>
      <div class="selector-item">
        <AdductSelector on:change={(e) => handleAdductChange(e.detail)} />
      </div>
    </div>
  </div>

  <div class="mb-3">
    <SAIterationSlider on:change={(e) => handleSAModeChange(e.detail)} />
  </div>

  <!-- 필수 아미노산 선택 -->
  <div class="mb-3">
    <AminoMapSelector on:changeAminos={(e) => handleAminoMapChange(e.detail)} />
  </div>

  <!-- 커스텀 아미노산 선택 (STM 과 동일한 UI: 분자 선택 + codon 다중 할당) -->
  <div class="mb-3">
    <NcAACodonSelector
      showLetterLabels={true}
      on:changeNcAA={handleNcAAChange}
      bind:codonTitles
      {onChangeCodonTitles}
      rnaSeq={proteinSequence}
    />
    <div class="alert alert-info mt-2 py-2 small mb-0" role="note">
      <strong>Codon assignment is optional in MTS.</strong>
      Codons are used <em>only</em> to align the reference peptide sequence for similarity
      scoring — they do not affect the mass calculation itself. Leave codons blank to use
      the ncAA as a generic mass candidate without changing the reference sequence.
      <span class="text-muted">(In STM, codons are required because translation depends on them.)</span>
    </div>
  </div>

  <!-- 참조 시퀀스 정보 표시 -->
  {#if hasReferenceSequence && sequenceTemplate && sequenceTemplate.gapTotalLength > 0}
    <div class="alert alert-info mb-3">
      <div class="d-flex align-items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-info-circle me-2"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
          />
          <path
            d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"
          />
        </svg>
        <strong>Template Mode Active</strong>
      </div>
      <small class="text-muted mt-1 d-block">
        Fixed: {sequenceTemplate.fixedSegments.map(s => `"${s.sequence}"`).join(', ') || 'None'} |
        Variable: {sequenceTemplate.gapTotalLength} positions to predict
      </small>
    </div>
  {:else if hasReferenceSequence}
    <div class="alert alert-info mb-3">
      <div class="d-flex align-items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-info-circle me-2"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
          />
          <path
            d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"
          />
        </svg>
        <strong>Reference Sequence Active</strong>
      </div>
      <small class="text-muted mt-1 d-block">
        The algorithm will prioritize finding sequences similar to: <span
          class="fw-bold">{convertedAminoSequence}</span
        >
        <br />
        Click amino acids above to mark ncAA positions and define fixed regions.
      </small>
    </div>
  {/if}

  <!-- 계산 버튼 -->
  <button
    type="button"
    class="btn btn-primary w-100"
    on:click={handleCalculate}
  >
  Predict sequences

  </button>


  {#if detectedMass !== null && bestSolutions.length > 0}
    <ResultTable
      {bestSolutions}
      {detectedMass}
      {fullNcAA}
      {hasReferenceSequence}
      bind:maxResultCount
    />
  {/if}
</div>

<style>
  .container {
    padding-left: 0;
    padding-right: 0;
  }

  .selector-row {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .selector-item {
    flex: 1;
    min-width: 280px;
    max-width: 100%;
  }

  /* 모바일: 전체 너비, 여백 최소화 */
  @media (max-width: 767px) {
    .container {
      margin-top: 1rem !important;
    }

    h1 {
      font-size: 1.75rem;
    }

    .selector-row {
      flex-direction: column;
      gap: 12px;
    }

    .selector-item {
      min-width: 100%;
      max-width: 100%;
    }

    .mb-3 {
      margin-bottom: 1rem !important;
    }

    .alert {
      font-size: 0.9rem;
      padding: 0.75rem;
    }

    .btn {
      padding: 0.75rem;
      font-size: 1rem;
    }
  }

  /* 태블릿 */
  @media (min-width: 768px) and (max-width: 1023px) {
    .selector-item {
      min-width: calc(50% - 8px);
    }

    .selector-item:last-child {
      flex-basis: 100%;
    }
  }

  /* 데스크톱 */
  @media (min-width: 1024px) {
    .selector-item {
      min-width: 280px;
    }
  }
</style>
