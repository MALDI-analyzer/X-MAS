<script lang="ts">
  import NcAACodonSelector from "$lib/components/NcAACodonSelector.svelte";
  import AminoMapSelector from "$lib/components/AminoMapSelector.svelte";
  import SAModeSelector from "$lib/components/SAModeSelector.svelte";
  import InitialRnaInput from "$lib/components/InitialRnaInput.svelte";
  import PeptideSequenceSelector from "$lib/components/PeptideSequenceSelector.svelte";
  import FormylationSelector from "$lib/components/FormylationSelector.svelte";
  import AdductSelector from "$lib/components/AdductSelector.svelte";
  import { onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import { showAlert } from "$lib/stores/alertStore.js";
  import { aminoMap, molecularWeightMap, codonTableRtoS } from "$lib/helper/amino_mapper";
  import {
    findCompositionMatch,
    computeBenchmarkStats,
    isValidTargetSequence,
    runsToCSV,
    runsSummaryToCSV,
    type BenchmarkRun,
    type BenchmarkSolution,
    type BenchmarkStats,
  } from "$lib/helper/benchmark_helper";

  // ────────────────────────────────────────────────────────────────────────
  // 사용자 입력
  // ────────────────────────────────────────────────────────────────────────
  let detectedMass: number | null = null;
  let targetSequence: string = "";
  let rnaSequence: string = ""; // RNA 시퀀스 (선택, A/U/G/C, 길이 3 의 배수)
  let sequenceTemplate: any = null; // PeptideSequenceSelector 가 만든 fixed/gap 구조

  // ncAA: NcAACodonSelector 패턴 (빈 슬롯 = 0.0 number sentinel — MTS 와 동일)
  let fullNcAA: Record<string, any> = {
    B: 0.0, J: 0.0, O: 0.0, U: 0.0, X: 0.0, Z: 0.0,
  };
  // 슬롯별 codon 매핑 (배열). NcAACodonSelector 가 bind 로 갱신.
  let codonTitles = writable<Record<string, string[]>>({
    B: [], J: [], O: [], U: [], X: [], Z: [],
  });

  // 사용자가 선택한 자연 AA 의 monoisotopic weight map. AminoMapSelector 가 dispatch 로 갱신.
  let selectedMonoisotopicAminos: Record<string, number> = { ...aminoMap };

  // 사용자가 팝오버에서 직접 선택한 letter (메모리 only) — MTS 와 동일.
  let positionOverrides: Record<number, string> = {};

  const SLOT_ORDER = ['B', 'J', 'O', 'U', 'X', 'Z'];
  const STANDARD_AA_LETTERS = ['G','A','S','T','C','V','L','I','M','P','F','Y','W','D','E','N','Q','H','K','R'];

  // SA 모드: SAModeSelector 가 채우는 객체
  let saConfig = {
    initialTemperature: 10000,
    absoluteTemperature: 0.001,
    saIterations: 100,
    coolingRate: 0.99,
  };

  // Fixed Seq 가중치 (RNA reference / template 모드일 때만 적용)
  let evaluateMassDiff = 0.95;
  let evaluateSeqDiff = 0.05;
  let sortMassDiff = 0.9;
  let sortSeqDiff = 0.1;
  const WEIGHT_SUM_TOLERANCE = 0.001;

  // 벤치마크 변수 (UI 노출, 변경 가능)
  let benchmarkRuns: number = 100; // 전체 반복 횟수
  let averageWindow: number = 3;   // 앞 N개 runtime 평균 윈도우

  // ────────────────────────────────────────────────────────────────────────
  // Formylation / Adduct (사용자 선택 가능, selector 컴포넌트의 default 와 일치)
  // ────────────────────────────────────────────────────────────────────────
  let formylation: string = "unknown";
  let adduct: string = "+H";

  // (FIXED_AMINO_MAP 제거됨 — AminoMapSelector 가 reactive 로 selectedMonoisotopicAminos 갱신)

  // ────────────────────────────────────────────────────────────────────────
  // 실행 상태
  // ────────────────────────────────────────────────────────────────────────
  let worker: Worker | null = null;
  let isRunning = false;
  let progress = 0; // 0..benchmarkRuns
  let runs: BenchmarkRun[] = [];
  let stats: BenchmarkStats | null = null;
  let lastError: string = "";
  let showRunDetails = false;
  let cancelRequested = false;

  onDestroy(() => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // Worker 호출 1회 → Promise 래핑
  // ────────────────────────────────────────────────────────────────────────
  function runSAOnce(workerData: Record<string, unknown>): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!worker) {
        worker = new Worker(
          new URL("$lib/workers/mass_finder.worker.ts", import.meta.url),
          { type: "module" },
        );
      }
      const w = worker;
      const onMessage = (e: MessageEvent) => {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        if (e.data?.type === "success") {
          resolve(e.data.solutions ?? []);
        } else {
          reject(new Error(e.data?.error ?? "Unknown worker error"));
        }
      };
      const onError = (err: ErrorEvent) => {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        reject(err.error ?? new Error("Worker error"));
      };
      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError);
      w.postMessage(workerData);
    });
  }

  function buildWorkerData() {
    // 선택된 ncAA 만 골라서 무게 맵 생성. NcAACodonSelector 의 빈 슬롯은 0.0 (number) 이므로
    // object 인 것만 추림 (MTS 와 동일 패턴).
    const filteredNcAA = Object.fromEntries(
      Object.entries(fullNcAA).filter(
        ([, v]) => v && typeof v === "object",
      ),
    );

    const filteredMonoWeights = Object.fromEntries(
      Object.entries(filteredNcAA).map(([k, v]: [string, any]) => [
        k,
        Number(v?.monoisotopicWeight),
      ]),
    );
    const filteredMolWeights = Object.fromEntries(
      Object.entries(filteredNcAA).map(([k, v]: [string, any]) => [
        k,
        Number(v?.molecularWeight),
      ]),
    );

    const monoisotopicMap = { ...selectedMonoisotopicAminos, ...filteredMonoWeights };
    // 선택된 자연 AA 만 molecular weight 베이스로 사용 (MTS 와 동일).
    const ncMolBase = Object.fromEntries(
      Object.entries(selectedMonoisotopicAminos).map(([k]) => [
        k,
        (molecularWeightMap as Record<string, number>)[k],
      ]),
    );
    const molecularMap = { ...ncMolBase, ...filteredMolWeights };

    const base: Record<string, unknown> = {
      detectedMass,
      formylation,
      adduct,
      monoisotopicMap,
      molecularMap,
      initialTemperature: saConfig.initialTemperature,
      absoluteTemperature: saConfig.absoluteTemperature,
      saIterations: saConfig.saIterations,
      coolingRate: saConfig.coolingRate,
      evaluateWeights: { massDiff: evaluateMassDiff, seqDiff: evaluateSeqDiff },
      sortWeights: { massDiff: sortMassDiff, seqDiff: sortSeqDiff },
    };

    if (sequenceTemplate && sequenceTemplate.gapTotalLength > 0) {
      // Template 모드: fixed/gap 세그먼트 기반 calc
      base.sequenceTemplate = sequenceTemplate;
    } else {
      // 일반 모드: 치환 적용된 convertedAminoSequence 를 reference 로 사용 (MTS 와 동일).
      // 비어있으면 raw RNA 를 fallback 으로.
      base.knownSequence = "";
      base.proteinSequence = convertedAminoSequence || rnaSequence;
    }
    return base;
  }

  function handleTemplateChange(e: CustomEvent) {
    const { fullSequence, positionStates, fixedSegments, gapSegments } = e.detail;
    if (!fullSequence) {
      sequenceTemplate = null;
      return;
    }
    const gapTotalLength = gapSegments.reduce(
      (sum: number, g: { length: number }) => sum + g.length,
      0,
    );
    sequenceTemplate = {
      fullSequence,
      positionStates,
      fixedSegments,
      gapSegments,
      totalLength: fullSequence.length,
      gapTotalLength,
    };
  }

  // RNA 시퀀스 검증: A/U/G/C only, 길이 3 의 배수 (빈 문자열은 OK)
  function validateRnaSequence(seq: string): { ok: boolean; message: string } {
    if (!seq) return { ok: true, message: "" };
    const validBases = /^[AUGC]+$/;
    if (!validBases.test(seq)) {
      return { ok: false, message: "RNA must contain only A, U, G, C" };
    }
    if (seq.length % 3 !== 0) {
      return {
        ok: false,
        message: "RNA length must be a multiple of 3 (codon units)",
      };
    }
    return { ok: true, message: "" };
  }

  // RNA → amino acid 변환 (MTS 와 동일: ncAA codon 치환 + position override + stop suppression).
  function convertRnaToAminoAcids(
    seq: string,
    options?: {
      excludedAA?: Set<string>;
      ncaaCodonMap?: Record<string, Array<{ letter: string; name?: string }>>;
      positionOverrides?: Record<number, string>;
    },
  ): string {
    if (!seq) return "";
    const codons = seq.match(/.{1,3}/g) ?? [];
    const opts = options ?? {};
    const excluded = opts.excludedAA ?? new Set<string>();
    const codonMap = opts.ncaaCodonMap ?? {};
    const overrides = opts.positionOverrides ?? {};

    let out = "";
    for (let i = 0; i < codons.length; i++) {
      const codon = codons[i];
      if (codon.length !== 3) continue;

      // 사용자 override 우선
      if (overrides[i] !== undefined) {
        out += overrides[i];
        continue;
      }

      const aa = (codonTableRtoS as Record<string, string>)[codon];
      const candidates = codonMap[codon] ?? [];

      if (aa === "[Stop]") {
        if (candidates.length > 0) {
          out += candidates[0].letter; // amber/ochre/opal suppression
        } else {
          break;
        }
      } else if (aa && excluded.has(aa) && candidates.length > 0) {
        out += candidates[0].letter; // 자동 치환 (첫 후보)
      } else if (aa) {
        out += aa;
      }
    }
    return out;
  }

  // Amino acids set 에서 해제된 자연 AA letter (체크박스 OFF 분).
  $: excludedAA = new Set(
    STANDARD_AA_LETTERS.filter((a) => !selectedMonoisotopicAminos[a]),
  );

  // ncaaCodonMap: codon → 후보 ncAA 배열 (슬롯 letter 순). codonTitles 기반.
  $: ncaaCodonMap = (() => {
    const map: Record<string, Array<{ letter: string; name?: string; monoisotopicWeight: number }>> = {};
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

  // codon 매핑 변경 시 positionOverrides 유효성 점검: 더 이상 존재하지 않는 letter 제거.
  $: {
    const validLetters = new Set<string>([
      ...STANDARD_AA_LETTERS,
      ...Object.values(ncaaCodonMap)
        .flat()
        .map((c) => c.letter),
    ]);
    let changed = false;
    const next: Record<number, string> = {};
    for (const [k, v] of Object.entries(positionOverrides)) {
      if (validLetters.has(v)) next[Number(k)] = v;
      else changed = true;
    }
    if (changed) positionOverrides = next;
  }

  // 치환 적용된 시퀀스 — PeptideSequenceSelector + worker reference 모두 이를 사용.
  $: convertedAminoSequence = rnaSequence
    ? convertRnaToAminoAcids(rnaSequence, {
        excludedAA,
        ncaaCodonMap,
        positionOverrides,
      })
    : "";

  // PeptideSequenceSelector 보조 정보 (보라 테두리 + ↓ + 팝오버).
  $: substitutionInfo = (() => {
    const result: {
      autoSubPositions: Set<number>;
      multiCandidatePositions: Set<number>;
      candidatesByPosition: Record<number, Array<{ letter: string; name?: string }>>;
      naturalByPosition: Record<number, string>;
      partialDropAA: Set<string>;
    } = {
      autoSubPositions: new Set(),
      multiCandidatePositions: new Set(),
      candidatesByPosition: {},
      naturalByPosition: {},
      partialDropAA: new Set(),
    };
    if (!rnaSequence) return result;
    const codons = rnaSequence.match(/.{1,3}/g) ?? [];
    const aaCoverage: Record<string, { hasNcAA: boolean; missingCodons: string[] }> = {};
    for (let i = 0; i < codons.length; i++) {
      const codon = codons[i];
      if (codon.length !== 3) continue;
      const natural = (codonTableRtoS as Record<string, string>)[codon];
      if (!natural || natural === "[Stop]") {
        const candidates = ncaaCodonMap[codon] || [];
        if (natural === "[Stop]" && candidates.length > 0) {
          result.autoSubPositions.add(i);
          if (candidates.length >= 2) result.multiCandidatePositions.add(i);
          result.candidatesByPosition[i] = candidates;
          result.naturalByPosition[i] = "*";
        }
        continue;
      }
      const candidates = ncaaCodonMap[codon] || [];
      const triggered = excludedAA.has(natural) && candidates.length > 0;
      const overridden = positionOverrides[i] !== undefined;
      if (triggered || overridden) {
        result.autoSubPositions.add(i);
        if (candidates.length >= 2) result.multiCandidatePositions.add(i);
        result.candidatesByPosition[i] = candidates;
        result.naturalByPosition[i] = natural;
      }
      if (excludedAA.has(natural)) {
        if (!aaCoverage[natural]) aaCoverage[natural] = { hasNcAA: false, missingCodons: [] };
        if (candidates.length === 0) aaCoverage[natural].missingCodons.push(codon);
        else aaCoverage[natural].hasNcAA = true;
      }
    }
    for (const [aa, info] of Object.entries(aaCoverage)) {
      if (info.hasNcAA && info.missingCodons.length > 0) result.partialDropAA.add(aa);
    }
    return result;
  })();

  $: rnaConverted = convertedAminoSequence;
  $: rnaValidation = validateRnaSequence(rnaSequence);
  $: fixedSegmentsLabel = sequenceTemplate?.fixedSegments?.length
    ? sequenceTemplate.fixedSegments
        .map((s: { sequence: string }) => `"${s.sequence}"`)
        .join(", ")
    : "None";

  // ────────────────────────────────────────────────────────────────────────
  // 입력 검증
  // ────────────────────────────────────────────────────────────────────────
  async function validate(): Promise<boolean> {
    if (detectedMass === null || Number.isNaN(detectedMass)) {
      await showAlert("Please input Detected mass", "Validation Error", "warning");
      return false;
    }
    // 상한 10,000 제한 임시 해제 (사용자 요청)
    // if (detectedMass <= 0 || detectedMass > 10000) {
    //   await showAlert(
    //     "Detected mass must be between 1 and 10,000",
    //     "Validation Error",
    //     "warning",
    //   );
    //   return false;
    // }
    if (!targetSequence || !isValidTargetSequence(targetSequence)) {
      await showAlert(
        "Please input a valid Target peptide sequence (letters only, optional 'f' prefix)",
        "Validation Error",
        "warning",
      );
      return false;
    }
    // Target 에 등장한 ncAA letter 가 NcAACodonSelector 에서 슬롯이 비어있으면 SA 가 절대
    // 그 letter 를 만들 수 없어 success rate 가 0 으로 떨어진다. 미리 막는다.
    const NCAA_LETTERS = ["B", "J", "O", "U", "X", "Z"];
    const targetBody = targetSequence.replace(/^f/, "");
    const targetNcAALetters = Array.from(
      new Set(targetBody.split("").filter((c) => NCAA_LETTERS.includes(c))),
    );
    // NcAACodonSelector 빈 슬롯 sentinel 은 0.0 (number). object 여야 정의된 것.
    const missingNcAA = targetNcAALetters.filter(
      (l) => !(fullNcAA[l] && typeof fullNcAA[l] === "object"),
    );
    if (missingNcAA.length > 0) {
      await showAlert(
        `Target sequence contains ncAA letter(s) [${missingNcAA.join(", ")}] but the corresponding ncAA slot${missingNcAA.length > 1 ? "s are" : " is"} empty. Please assign an ncAA molecule to slot ${missingNcAA.join(", ")} below or remove ${missingNcAA.length > 1 ? "those letters" : "that letter"} from the target.`,
        "Validation Error",
        "warning",
      );
      return false;
    }

    // Target 의 자연 AA letter 가 Amino acids set 에서 해제된 상태면 SA 가 그 letter 를
    // 만들 수 없음. 차단 (자연 AA 모순).
    const targetNaturalLetters = Array.from(
      new Set(targetBody.split("").filter((c) => STANDARD_AA_LETTERS.includes(c))),
    );
    const missingNatural = targetNaturalLetters.filter(
      (l) => !selectedMonoisotopicAminos[l],
    );
    if (missingNatural.length > 0) {
      await showAlert(
        `Target sequence contains natural amino acid${missingNatural.length > 1 ? "s" : ""} [${missingNatural.join(", ")}] but ${missingNatural.length > 1 ? "they are" : "it is"} unchecked in the Amino acids set. SA cannot produce ${missingNatural.length > 1 ? "those letters" : "that letter"}. Re-check ${missingNatural.join(", ")} or remove from target.`,
        "Validation Error",
        "warning",
      );
      return false;
    }
    const rnaCheck = validateRnaSequence(rnaSequence);
    if (!rnaCheck.ok) {
      await showAlert(rnaCheck.message, "Validation Error", "warning");
      return false;
    }
    if (!Number.isInteger(benchmarkRuns) || benchmarkRuns < 1) {
      await showAlert("Benchmark iterations must be a positive integer", "Validation Error", "warning");
      return false;
    }
    if (!Number.isInteger(averageWindow) || averageWindow < 1) {
      await showAlert("Average window N must be a positive integer", "Validation Error", "warning");
      return false;
    }
    if (averageWindow > benchmarkRuns) {
      await showAlert(
        "Average window N must be less than or equal to total iterations",
        "Validation Error",
        "warning",
      );
      return false;
    }
    // SA 파라미터 검증
    if (
      !Number.isFinite(saConfig.initialTemperature) ||
      !Number.isFinite(saConfig.absoluteTemperature) ||
      !Number.isFinite(saConfig.coolingRate) ||
      !Number.isInteger(saConfig.saIterations)
    ) {
      await showAlert("SA parameters must be valid numbers", "Validation Error", "warning");
      return false;
    }
    if (saConfig.initialTemperature <= 0 || saConfig.absoluteTemperature <= 0) {
      await showAlert("Temperatures must be greater than 0", "Validation Error", "warning");
      return false;
    }
    if (saConfig.absoluteTemperature >= saConfig.initialTemperature) {
      await showAlert(
        "Absolute temperature must be less than initial temperature",
        "Validation Error",
        "warning",
      );
      return false;
    }
    if (saConfig.coolingRate <= 0 || saConfig.coolingRate >= 1) {
      await showAlert(
        "Cooling rate must be between 0 and 1 (exclusive). Recommended: 0.5 ~ 0.999",
        "Validation Error",
        "warning",
      );
      return false;
    }
    if (saConfig.saIterations < 1) {
      await showAlert("SA iterations must be at least 1", "Validation Error", "warning");
      return false;
    }
    // Fixed Seq 가중치 검증 (각 그룹 합 = 1.0)
    if (
      !Number.isFinite(evaluateMassDiff) ||
      !Number.isFinite(evaluateSeqDiff) ||
      evaluateMassDiff < 0 ||
      evaluateSeqDiff < 0
    ) {
      await showAlert(
        "SA Evaluate weights must be non-negative numbers",
        "Validation Error",
        "warning",
      );
      return false;
    }
    if (Math.abs(evaluateMassDiff + evaluateSeqDiff - 1.0) > WEIGHT_SUM_TOLERANCE) {
      await showAlert(
        `SA Evaluate weights must sum to 1.0 (current sum: ${(evaluateMassDiff + evaluateSeqDiff).toFixed(3)})`,
        "Validation Error",
        "warning",
      );
      return false;
    }
    if (
      !Number.isFinite(sortMassDiff) ||
      !Number.isFinite(sortSeqDiff) ||
      sortMassDiff < 0 ||
      sortSeqDiff < 0
    ) {
      await showAlert(
        "Sort weights must be non-negative numbers",
        "Validation Error",
        "warning",
      );
      return false;
    }
    if (Math.abs(sortMassDiff + sortSeqDiff - 1.0) > WEIGHT_SUM_TOLERANCE) {
      await showAlert(
        `Sort weights must sum to 1.0 (current sum: ${(sortMassDiff + sortSeqDiff).toFixed(3)})`,
        "Validation Error",
        "warning",
      );
      return false;
    }
    return true;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 메인 벤치마크 루프
  // ────────────────────────────────────────────────────────────────────────
  async function handleRunBenchmark() {
    if (isRunning) return;
    if (!(await validate())) return;

    runs = [];
    stats = null;
    progress = 0;
    lastError = "";
    cancelRequested = false;
    isRunning = true;

    const workerData = buildWorkerData();
    const totalRuns = benchmarkRuns;

    try {
      for (let i = 0; i < totalRuns; i++) {
        if (cancelRequested) break;
        const start = performance.now();
        let solutions: any[] = [];
        try {
          solutions = await runSAOnce({ ...workerData });
        } catch (err) {
          // 한 회차 실패는 기록하고 계속 진행
          const runtime = performance.now() - start;
          const newRun: BenchmarkRun = {
            index: i + 1,
            runtime,
            success: false,
            matchedCode: undefined,
            solutions: [],
          };
          runs = [...runs, newRun];
          progress = i + 1;
          lastError = (err as Error).message ?? String(err);
          continue;
        }
        const runtime = performance.now() - start;
        const matched = findCompositionMatch(targetSequence, solutions);
        const trimmedSolutions: BenchmarkSolution[] = solutions.map((s: any) => ({
          code: s?.code,
          weight: s?.weight,
          molecularWeight: s?.molecularWeight,
          totalWeight: s?.totalWeight,
          similarity: s?.similarity,
          sequenceSimilarity: s?.sequenceSimilarity,
          formyType: s?.formyType,
          ionType: s?.ionType,
        }));
        const newRun: BenchmarkRun = {
          index: i + 1,
          runtime,
          success: !!matched,
          matchedCode: matched,
          solutions: trimmedSolutions,
        };
        runs = [...runs, newRun];
        progress = i + 1;

        // UI 업데이트 + 메인 스레드 양보
        await yieldToUI();
      }

      stats = computeBenchmarkStats(runs, averageWindow);
    } catch (e) {
      console.error(e);
      lastError = (e as Error).message ?? String(e);
      await showAlert("Benchmark failed", "Error", "error");
    } finally {
      isRunning = false;
    }
  }

  function yieldToUI(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function handleCancel() {
    cancelRequested = true;
  }

  function handleNcAAChange(e: CustomEvent) {
    fullNcAA = e.detail;
  }

  function onChangeCodonTitles(codonArray: string[], key: string) {
    $codonTitles[key] = codonArray;
  }

  function handleAminoMapChange(newAminos: Record<string, boolean>) {
    selectedMonoisotopicAminos = Object.fromEntries(
      Object.entries(newAminos)
        .filter(([, value]) => value)
        .map(([key]) => [key, (aminoMap as Record<string, number>)[key]]),
    );
  }

  function handleOverride(e: CustomEvent) {
    const { position, letter } = e.detail as { position: number; letter: string };
    positionOverrides = { ...positionOverrides, [position]: letter };
  }

  function handleFormylationChange(value: string) {
    formylation = value;
  }

  function handleAdductChange(value: string) {
    adduct = value;
  }

  function handleTargetInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (value.length === 0) {
      targetSequence = "";
      return;
    }
    // 첫 글자 'f' 만 Formylation prefix 로 보존하고, 나머지는 모두 대문자.
    // 대문자 'F' 는 Phe(페닐알라닌) 를 의미하므로 그대로 둔다.
    if (value[0] === "f") {
      targetSequence = "f" + value.slice(1).toUpperCase();
    } else {
      targetSequence = value.toUpperCase();
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // CSV 다운로드
  // ────────────────────────────────────────────────────────────────────────
  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function timestampForFilename(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
      d.getHours(),
    )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  function handleDownloadDetailed() {
    if (runs.length === 0) return;
    const csv = runsToCSV(runs, targetSequence, detectedMass, rnaSequence);
    const safeTarget = targetSequence.replace(/[^A-Za-z0-9]/g, "_") || "target";
    downloadFile(
      csv,
      `mts-benchmark-detail-${safeTarget}-${timestampForFilename()}.csv`,
    );
  }

  function handleDownloadSummary() {
    if (runs.length === 0) return;
    const csv = runsSummaryToCSV(runs);
    const safeTarget = targetSequence.replace(/[^A-Za-z0-9]/g, "_") || "target";
    downloadFile(
      csv,
      `mts-benchmark-summary-${safeTarget}-${timestampForFilename()}.csv`,
    );
  }

  $: totalSolutionRows = runs.reduce(
    (sum, r) => sum + (r.solutions?.length ?? 0),
    0,
  );

  // 진단: 100x100 SA 솔루션 중 ncAA letter 가 실제로 등장한 비율
  $: ncAAStats = (() => {
    // NcAACodonSelector 빈 슬롯 sentinel 은 0.0 (number). object 인 슬롯만 정의됨.
    const ncAALetters = Object.keys(fullNcAA).filter(
      (k) => fullNcAA[k] && typeof fullNcAA[k] === "object",
    );
    if (ncAALetters.length === 0 || runs.length === 0) return null;

    let totalSolutions = 0;
    let solutionsWithNcAA = 0;
    const perLetterCounts: Record<string, number> = {};
    for (const l of ncAALetters) perLetterCounts[l] = 0;

    for (const run of runs) {
      if (!run.solutions) continue;
      for (const sol of run.solutions) {
        totalSolutions++;
        const code = sol.code ?? "";
        let hasAny = false;
        for (const letter of ncAALetters) {
          if (code.includes(letter)) {
            perLetterCounts[letter]++;
            hasAny = true;
          }
        }
        if (hasAny) solutionsWithNcAA++;
      }
    }
    return {
      ncAALetters,
      totalSolutions,
      solutionsWithNcAA,
      percentage:
        totalSolutions > 0
          ? (solutionsWithNcAA / totalSolutions) * 100
          : 0,
      perLetterCounts,
    };
  })();

  function handleSAModeChange(e: CustomEvent) {
    saConfig = e.detail;
  }

  // 진행률 (0..1)
  $: progressRatio = benchmarkRuns > 0 ? progress / benchmarkRuns : 0;
  $: liveSuccessCount = runs.reduce((s, r) => s + (r.success ? 1 : 0), 0);

  function formatMs(value: number): string {
    if (!Number.isFinite(value)) return "—";
    if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
    return `${value.toFixed(2)} ms`;
  }
</script>

<svelte:head>
  <title>MTS Benchmark - X-MAS</title>
</svelte:head>

<div class="container mt-5">
  <div class="text-center mb-4">
    <h1>MTS Benchmark</h1>
    <p class="text-muted mb-0">
      Measure simulated-annealing performance against a known target peptide.
    </p>
  </div>

  <!-- Detected mass -->
  <div class="mb-3">
    <label for="bm-detected-mass" class="form-label fw-bold">
      Detected mass <span class="text-danger">*</span>
    </label>
    <input
      type="number"
      id="bm-detected-mass"
      class="form-control"
      placeholder="e.g. 1000"
      bind:value={detectedMass}
      disabled={isRunning}
    />
  </div>

  <!-- Target peptide -->
  <div class="mb-3">
    <label for="bm-target-seq" class="form-label fw-bold">
      Target peptide sequence <span class="text-danger">*</span>
    </label>
    <input
      type="text"
      id="bm-target-seq"
      class="form-control"
      placeholder="e.g. ACDEFG · 'fACDE' (formyl) · 'FACDE' (Phe-Ala-...)"
      bind:value={targetSequence}
      on:input={handleTargetInput}
      disabled={isRunning}
    />
    <small class="text-muted d-block mt-1">
      대문자 <code>F</code> = <strong>Phe</strong>(페닐알라닌), 소문자
      <code>f</code> 는 <strong>맨 앞에 올 때만 Formylation prefix</strong> 로
      처리됩니다. 비교는 시퀀스 순서와 무관한 구성(composition) 일치로 판정하며,
      맨 앞 소문자 <code>f</code> 는 비교 시 제외되어 Formylation 유무는 일치
      여부에 영향을 주지 않습니다.
    </small>
  </div>

  <!-- RNA sequence (optional, used as similarity reference / template anchor) -->
  <fieldset disabled={isRunning} class="rna-fieldset">
    <InitialRnaInput
      bind:value={rnaSequence}
      on:input={(e) => (rnaSequence = e.detail.value)}
    />

    <!-- Narrow search space: ncAA 위치 클릭 → fixed/variable 영역 분할 + 자동 치환 시각화 -->
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
  </fieldset>

  <!-- 부분 드롭 경고: 자연 AA 제외했는데 일부 codon 만 ncAA 할당 -->
  {#if substitutionInfo.partialDropAA.size > 0}
    <div class="alert alert-warning mb-3 py-2 small">
      <strong>Partial substitution:</strong>
      {#each Array.from(substitutionInfo.partialDropAA) as aa, idx}{idx > 0 ? ', ' : ''}{aa}{/each}
      — some codons of these excluded amino acids have no ncAA assignment and those positions will be dropped from the initial pool.
    </div>
  {/if}

  {#if sequenceTemplate && sequenceTemplate.gapTotalLength > 0}
    <div class="alert alert-warning py-2 small mb-3">
      <strong>Template mode active</strong> — Fixed:
      {fixedSegmentsLabel} |
      Variable: {sequenceTemplate.gapTotalLength} positions to predict.
      SA 가 위 fixed 부분을 그대로 두고 변동 영역만 탐색합니다.
    </div>
  {:else if rnaSequence && rnaValidation.ok && rnaConverted}
    <div class="alert alert-info py-2 small mb-3">
      RNA reference active — converted: <span class="fw-bold">{rnaConverted}</span>.
      SA fitness 가 mass 80% + sequence similarity 20% 로 계산되어 이 reference 와
      유사한 시퀀스가 우선됩니다. (펩타이드 타일을 클릭하면 일부 위치만 자유롭게
      두는 Template 모드로 전환됩니다.)
    </div>
  {/if}

  <!-- Formylation / Adduct (사용자 선택 가능) -->
  <fieldset disabled={isRunning} class="mb-3">
    <div class="row g-3">
      <div class="col-12 col-md-6">
        <FormylationSelector
          on:change={(e) => handleFormylationChange(e.detail)}
        />
      </div>
      <div class="col-12 col-md-6">
        <AdductSelector
          on:change={(e) => handleAdductChange(e.detail)}
        />
      </div>
    </div>
  </fieldset>

  <!-- SA Mode -->
  <div class="mb-3">
    <SAModeSelector customizable={true} on:change={handleSAModeChange} />
  </div>

  <!-- Fixed Seq Weights (RNA reference / template 모드일 때만 적용) -->
  <div class="card mb-3">
    <div class="card-body">
      <h2 class="h6 card-title mb-2">Fixed Sequence Weights</h2>
      <p class="text-muted small mb-3">
        RNA reference 또는 fixed sequence template 활성 시에만 사용됩니다. 각 그룹의 가중치 합은 반드시 <strong>1.0</strong>이 되어야 합니다.
      </p>

      <div class="weight-group mb-3">
        <div class="weight-group-header">
          <span class="weight-group-label">SA Evaluate (탐색 중 점수)</span>
          <span
            class="weight-sum"
            class:text-danger={Math.abs(evaluateMassDiff + evaluateSeqDiff - 1.0) > WEIGHT_SUM_TOLERANCE}
          >
            sum: {(evaluateMassDiff + evaluateSeqDiff).toFixed(3)}
          </span>
        </div>
        <div class="row g-2">
          <div class="col-6">
            <label class="param-label" for="bm-eval-mass">Mass diff</label>
            <input
              id="bm-eval-mass"
              type="number"
              class="form-control form-control-sm"
              min="0"
              max="1"
              step="0.01"
              bind:value={evaluateMassDiff}
              disabled={isRunning}
            />
          </div>
          <div class="col-6">
            <label class="param-label" for="bm-eval-seq">Sequence diff</label>
            <input
              id="bm-eval-seq"
              type="number"
              class="form-control form-control-sm"
              min="0"
              max="1"
              step="0.01"
              bind:value={evaluateSeqDiff}
              disabled={isRunning}
            />
          </div>
        </div>
      </div>

      <div class="weight-group">
        <div class="weight-group-header">
          <span class="weight-group-label">Sort (결과 정렬)</span>
          <span
            class="weight-sum"
            class:text-danger={Math.abs(sortMassDiff + sortSeqDiff - 1.0) > WEIGHT_SUM_TOLERANCE}
          >
            sum: {(sortMassDiff + sortSeqDiff).toFixed(3)}
          </span>
        </div>
        <div class="row g-2">
          <div class="col-6">
            <label class="param-label" for="bm-sort-mass">Mass diff</label>
            <input
              id="bm-sort-mass"
              type="number"
              class="form-control form-control-sm"
              min="0"
              max="1"
              step="0.01"
              bind:value={sortMassDiff}
              disabled={isRunning}
            />
          </div>
          <div class="col-6">
            <label class="param-label" for="bm-sort-seq">Sequence diff</label>
            <input
              id="bm-sort-seq"
              type="number"
              class="form-control form-control-sm"
              min="0"
              max="1"
              step="0.01"
              bind:value={sortSeqDiff}
              disabled={isRunning}
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Amino acids set (자연 20개 — MTS 와 동일) -->
  <div class="mb-3">
    <AminoMapSelector on:changeAminos={(e) => handleAminoMapChange(e.detail)} />
  </div>

  <!-- ncAA (codon 다중 할당 — MTS / STM 과 동일 UI) -->
  <div class="mb-3">
    <NcAACodonSelector
      showLetterLabels={true}
      on:changeNcAA={handleNcAAChange}
      bind:codonTitles
      {onChangeCodonTitles}
      rnaSeq={rnaSequence}
    />
    <div class="alert alert-info mt-2 py-2 small mb-0" role="note">
      <strong>Codon assignment is optional in MTS benchmark.</strong>
      Codons are used <em>only</em> to align the reference peptide sequence for similarity
      scoring — they do not affect the mass calculation itself. Leave codons blank to use
      the ncAA as a generic mass candidate without changing the reference sequence.
      <span class="text-muted">(In STM, codons are required because translation depends on them.)</span>
    </div>
  </div>

  <!-- Benchmark variables -->
  <div class="row g-3 mb-3">
    <div class="col-12 col-md-6">
      <label for="bm-iterations" class="form-label fw-bold">
        Benchmark iterations
      </label>
      <input
        type="number"
        id="bm-iterations"
        class="form-control"
        min="1"
        bind:value={benchmarkRuns}
        disabled={isRunning}
      />
      <small class="text-muted">전체 반복 횟수 (기본 100)</small>
    </div>
    <div class="col-12 col-md-6">
      <label for="bm-window" class="form-label fw-bold">
        Average window (first N)
      </label>
      <input
        type="number"
        id="bm-window"
        class="form-control"
        min="1"
        bind:value={averageWindow}
        disabled={isRunning}
      />
      <small class="text-muted">앞에서 몇 번의 runtime 을 평균낼지 (기본 3)</small>
    </div>
  </div>


  <!-- Run / Cancel buttons -->
  <div class="d-flex gap-2 mb-4">
    <button
      type="button"
      class="btn btn-primary flex-grow-1"
      on:click={handleRunBenchmark}
      disabled={isRunning}
    >
      {isRunning ? `Running... (${progress}/${benchmarkRuns})` : "Run Benchmark"}
    </button>
    {#if isRunning}
      <button type="button" class="btn btn-outline-danger" on:click={handleCancel}>
        Cancel
      </button>
    {/if}
  </div>

  <!-- Progress bar -->
  {#if isRunning || progress > 0}
    <div class="mb-4">
      <div class="d-flex justify-content-between mb-1">
        <small class="text-muted">Progress</small>
        <small class="text-muted">
          {progress} / {benchmarkRuns} ・ ✅ {liveSuccessCount}
        </small>
      </div>
      <div class="progress" style="height: 10px;">
        <div
          class="progress-bar"
          class:bg-success={!isRunning}
          role="progressbar"
          style="width: {(progressRatio * 100).toFixed(1)}%;"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax={benchmarkRuns}
        ></div>
      </div>
    </div>
  {/if}

  <!-- Results summary -->
  {#if stats}
    <div class="card mb-3">
      <div class="card-body">
        <h2 class="h5 card-title mb-3">Benchmark results</h2>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="metric-block">
              <div class="metric-label">Success rate</div>
              <div class="metric-value">
                {stats.successCount} / {stats.totalRuns}
                <small class="text-muted">
                  ({(stats.successRate * 100).toFixed(1)}%)
                </small>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="metric-block">
              <div class="metric-label">
                First {stats.averageWindow} runs avg runtime
              </div>
              <div class="metric-value">{formatMs(stats.firstNAverageRuntime)}</div>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="metric-sub">
              <span class="text-muted">Total avg:</span>
              <span>{formatMs(stats.averageRuntime)}</span>
            </div>
          </div>
          <div class="col-6 col-md-4">
            <div class="metric-sub">
              <span class="text-muted">Min:</span>
              <span>{formatMs(stats.minRuntime)}</span>
            </div>
          </div>
          <div class="col-6 col-md-4">
            <div class="metric-sub">
              <span class="text-muted">Max:</span>
              <span>{formatMs(stats.maxRuntime)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ncAA usage diagnostic -->
  {#if ncAAStats}
    <div class="card mb-3">
      <div class="card-body">
        <h2 class="h6 card-title mb-2">
          ncAA inclusion in SA solutions
        </h2>
        <p class="small text-muted mb-2">
          전체 {ncAAStats.totalSolutions.toLocaleString()} 개 SA 솔루션 중
          <strong class="text-dark">{ncAAStats.solutionsWithNcAA.toLocaleString()}</strong>
          개가 선택한 ncAA letter 를 1개 이상 포함했습니다 (<strong>{ncAAStats.percentage.toFixed(1)}%</strong>).
        </p>
        <div class="d-flex flex-wrap gap-2">
          {#each ncAAStats.ncAALetters as letter}
            <span class="badge bg-info text-dark">
              <code>{letter}</code> ・ {ncAAStats.perLetterCounts[letter].toLocaleString()} 회
            </span>
          {/each}
        </div>
        {#if ncAAStats.percentage === 0}
          <small class="text-warning d-block mt-2">
            ⚠ ncAA letter 가 한 번도 등장하지 않았습니다. ncAA 슬롯에
            <strong>codon 을 할당</strong>하고 해당 자연 AA 를 <strong>Amino acids set 에서 해제</strong>
            하면 RNA reference 가 ncAA 포함 시퀀스가 되어 SA 가 ncAA 우호적으로
            탐색합니다. (혹은 target 시퀀스에 ncAA letter 가 없는지 확인.)
          </small>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Error -->
  {#if lastError}
    <div class="alert alert-warning small">
      Last error: <code>{lastError}</code>
    </div>
  {/if}

  <!-- Download buttons -->
  {#if runs.length > 0}
    <div class="card mb-3">
      <div class="card-body">
        <h2 class="h6 card-title mb-2">Download as Excel-compatible CSV</h2>
        <p class="text-muted small mb-3">
          {totalSolutionRows.toLocaleString()} 개 SA 솔루션 행 (시퀀스 + 분자량 포함).
          Excel 에서 더블클릭으로 열거나 [데이터 → 텍스트로부터] 가져오기 하세요.
        </p>
        <div class="d-flex gap-2 flex-wrap">
          <button
            type="button"
            class="btn btn-success"
            on:click={handleDownloadDetailed}
            disabled={isRunning}
          >
            ⬇ Detailed CSV (per solution)
          </button>
          <button
            type="button"
            class="btn btn-outline-success"
            on:click={handleDownloadSummary}
            disabled={isRunning}
          >
            ⬇ Summary CSV (per run)
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Detail table (collapsible) -->
  {#if runs.length > 0}
    <button
      type="button"
      class="btn btn-link p-0 mb-2"
      on:click={() => (showRunDetails = !showRunDetails)}
    >
      {showRunDetails ? "Hide" : "Show"} per-run details ({runs.length})
    </button>

    {#if showRunDetails}
      <div class="table-responsive">
        <table class="table table-sm table-striped">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Runtime</th>
              <th scope="col">Match</th>
              <th scope="col">Matched code</th>
            </tr>
          </thead>
          <tbody>
            {#each runs as run (run.index)}
              <tr>
                <td>{run.index}</td>
                <td>{formatMs(run.runtime)}</td>
                <td>
                  {#if run.success}
                    <span class="badge bg-success">true</span>
                  {:else}
                    <span class="badge bg-secondary">false</span>
                  {/if}
                </td>
                <td><code>{run.matchedCode ?? "—"}</code></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .container {
    padding-left: 0;
    padding-right: 0;
    max-width: 960px;
  }

  .metric-block {
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  .metric-label {
    font-size: 0.8rem;
    color: #6c757d;
    margin-bottom: 4px;
  }

  .metric-value {
    font-size: 1.4rem;
    font-weight: 600;
    color: #212529;
  }

  .metric-sub {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6px 12px;
    background: #ffffff;
    border-radius: 6px;
    border: 1px solid #e9ecef;
    font-size: 0.9rem;
  }

  .weight-group {
    padding: 10px 12px;
    background: #fafafa;
    border: 1px solid #eaeaea;
    border-radius: 6px;
  }

  .weight-group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .weight-group-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #424242;
  }

  .weight-sum {
    font-size: 0.75rem;
    color: #6c757d;
    font-variant-numeric: tabular-nums;
  }

  .param-label {
    font-size: 0.75rem;
    color: #555;
    margin-bottom: 4px;
    display: block;
  }

  @media (max-width: 767px) {
    .container {
      margin-top: 1rem !important;
    }
    h1 {
      font-size: 1.6rem;
    }
  }
</style>
