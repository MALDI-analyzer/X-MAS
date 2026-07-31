/**
 * Benchmark helper for MTS performance measurement.
 *
 * Composition match: 두 시퀀스가 알파벳 순서에 무관하게 같은 multiset인지 비교한다.
 * Formylation prefix `f` 와 ncAA 각괄호 표기 `[X]` 는 정규화 단계에서 제거한다.
 */

export interface BenchmarkSolution {
  code?: string;
  weight?: number;            // monoisotopic mass
  molecularWeight?: number;
  totalWeight?: number;
  similarity?: number;
  sequenceSimilarity?: number;
  formyType?: string;
  ionType?: string;
}

export interface BenchmarkRun {
  index: number;
  runtime: number;
  success: boolean;
  matchedCode?: string;
  solutions: BenchmarkSolution[];
}

export interface BenchmarkStats {
  totalRuns: number;
  successCount: number;
  successRate: number;
  firstNAverageRuntime: number;
  averageRuntime: number;
  minRuntime: number;
  maxRuntime: number;
  averageWindow: number;
}

const FORMYL_PREFIX = /^f/;

/**
 * 시퀀스를 composition string 으로 정규화한다.
 * - formylation prefix `f` 제거
 * - 알파벳 정렬 (대문자 기준)
 *
 * `f` 무시 + multiset 비교 정책. 같은 구성이지만 순서가 다른 시퀀스는 동일하게 취급된다.
 */
export function getComposition(sequence: string): string {
  if (!sequence) return '';
  const normalized = sequence.replace(FORMYL_PREFIX, '').toUpperCase();
  return normalized.split('').sort().join('');
}

export function isCompositionMatch(target: string, candidate: string): boolean {
  if (!target || !candidate) return false;
  return getComposition(target) === getComposition(candidate);
}

/**
 * 후보 100개 중 composition 매치가 있는지 검사하고 첫 매치 코드를 반환한다.
 */
export function findCompositionMatch(
  target: string,
  candidates: { code?: string }[],
): string | undefined {
  const targetComp = getComposition(target);
  if (!targetComp) return undefined;
  for (const candidate of candidates) {
    if (candidate?.code && getComposition(candidate.code) === targetComp) {
      return candidate.code;
    }
  }
  return undefined;
}

export function computeBenchmarkStats(
  runs: BenchmarkRun[],
  averageWindow: number,
): BenchmarkStats {
  const totalRuns = runs.length;
  if (totalRuns === 0) {
    return {
      totalRuns: 0,
      successCount: 0,
      successRate: 0,
      firstNAverageRuntime: 0,
      averageRuntime: 0,
      minRuntime: 0,
      maxRuntime: 0,
      averageWindow,
    };
  }

  const successCount = runs.reduce((sum, r) => sum + (r.success ? 1 : 0), 0);
  const successRate = successCount / totalRuns;
  const window = Math.max(1, Math.min(averageWindow, totalRuns));
  const firstSlice = runs.slice(0, window);
  const firstNAverageRuntime =
    firstSlice.reduce((sum, r) => sum + r.runtime, 0) / firstSlice.length;

  let totalRuntime = 0;
  let minRuntime = Number.POSITIVE_INFINITY;
  let maxRuntime = 0;
  for (const run of runs) {
    totalRuntime += run.runtime;
    if (run.runtime < minRuntime) minRuntime = run.runtime;
    if (run.runtime > maxRuntime) maxRuntime = run.runtime;
  }

  return {
    totalRuns,
    successCount,
    successRate,
    firstNAverageRuntime,
    averageRuntime: totalRuntime / totalRuns,
    minRuntime,
    maxRuntime,
    averageWindow: window,
  };
}

/**
 * 입력된 target 시퀀스가 알파벳 + 일부 ncAA 코드만 포함하는지 검증한다.
 * 허용: 영문 대문자 (A-Z) + 선택적 prefix `f`
 */
export function isValidTargetSequence(seq: string): boolean {
  if (!seq) return false;
  const stripped = seq.replace(FORMYL_PREFIX, '');
  return /^[A-Z]+$/.test(stripped);
}

// ────────────────────────────────────────────────────────────────────────
// CSV export
// ────────────────────────────────────────────────────────────────────────

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // 콤마, 따옴표, 줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표 이스케이프
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatNumber(n: number | undefined, digits = 5): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '';
  return n.toFixed(digits);
}

/**
 * 벤치마크 결과를 CSV 문자열로 변환한다.
 * 각 회차의 모든 SA 솔루션(시퀀스 + 분자량 등)이 한 행씩 펼쳐진다.
 *
 * Excel 호환을 위해 UTF-8 BOM 을 앞에 붙인다.
 */
export function runsToCSV(
  runs: BenchmarkRun[],
  targetSequence: string,
  detectedMass: number | null,
  rnaSequence: string = '',
): string {
  const targetComp = getComposition(targetSequence);
  const headers = [
    'Run',
    'Runtime (ms)',
    'Run success',
    'Solution rank',
    'Sequence',
    'Composition match',
    'Monoisotopic mass',
    'Molecular weight',
    'Total weight',
    'Mass similarity (%)',
    'Sequence similarity (%)',
    'Formylation',
    'Adduct',
    'Target sequence',
    'Detected mass',
    'RNA sequence',
  ];
  const lines: string[] = [headers.map(escapeCsvField).join(',')];

  for (const run of runs) {
    if (!run.solutions || run.solutions.length === 0) {
      // 결과가 없는 회차도 한 행 남겨서 흔적이 보이도록
      lines.push(
        [
          run.index,
          formatNumber(run.runtime, 2),
          run.success,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          targetSequence,
          detectedMass ?? '',
          rnaSequence,
        ]
          .map(escapeCsvField)
          .join(','),
      );
      continue;
    }
    run.solutions.forEach((sol, rankIdx) => {
      const matched =
        !!sol.code && getComposition(sol.code) === targetComp;
      lines.push(
        [
          run.index,
          formatNumber(run.runtime, 2),
          run.success,
          rankIdx + 1,
          sol.code ?? '',
          matched,
          formatNumber(sol.weight, 5),
          formatNumber(sol.molecularWeight, 5),
          formatNumber(sol.totalWeight, 5),
          formatNumber(sol.similarity, 4),
          formatNumber(sol.sequenceSimilarity, 4),
          sol.formyType ?? '',
          sol.ionType ?? '',
          targetSequence,
          detectedMass ?? '',
          rnaSequence,
        ]
          .map(escapeCsvField)
          .join(','),
      );
    });
  }

  // CRLF: Excel 친화적
  return '﻿' + lines.join('\r\n');
}

/**
 * 회차별 요약 CSV. 상세 시트 외에 빠른 검토용 요약 시트가 필요할 때 사용.
 */
export function runsSummaryToCSV(runs: BenchmarkRun[]): string {
  const headers = ['Run', 'Runtime (ms)', 'Success', 'Matched code', 'Solutions count'];
  const lines: string[] = [headers.map(escapeCsvField).join(',')];
  for (const run of runs) {
    lines.push(
      [
        run.index,
        formatNumber(run.runtime, 2),
        run.success,
        run.matchedCode ?? '',
        run.solutions?.length ?? 0,
      ]
        .map(escapeCsvField)
        .join(','),
    );
  }
  return '﻿' + lines.join('\r\n');
}
