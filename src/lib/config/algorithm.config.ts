/**
 * Simulated Annealing Algorithm Configuration
 *
 * 알고리즘 파라미터 및 화학적 상수 정의
 */

/**
 * Simulated Annealing 알고리즘 기본 설정
 */
export const SIMULATED_ANNEALING_CONFIG = {
  /**
   * 초기 온도
   * - 높을수록 초기에 더 많은 탐색 수행
   * - 권장 범위: 5000 ~ 20000
   */
  INITIAL_TEMPERATURE: 10000,

  /**
   * 절대 온도 (최소 온도)
   * - 알고리즘 종료 조건
   * - 너무 높으면 조기 종료, 너무 낮으면 계산 시간 증가
   */
  ABSOLUTE_TEMPERATURE: 0.00001,

  /**
   * 냉각률 (Cooling Rate)
   * - 매 반복마다 온도에 곱해지는 값
   * - 0.95 ~ 0.99 사이 권장
   * - 0.99: 느린 냉각 (정확도 ↑, 시간 ↑)
   * - 0.95: 빠른 냉각 (정확도 ↓, 시간 ↓)
   */
  COOLING_RATE: 0.99,

  /**
   * SA 반복 횟수 (각 온도에서)
   * - 기본값: 100
   * - 높을수록 정확도 향상, 계산 시간 증가
   */
  DEFAULT_ITERATIONS: 100,

  /**
   * 저장할 상위 솔루션 개수
   */
  TOP_SOLUTIONS_COUNT: 100,
} as const;

/**
 * 화학적 상수
 */
export const CHEMICAL_CONSTANTS = {
  /**
   * 물 분자 무게 (H2O)
   * - Monoisotopic mass
   */
  WATER_WEIGHT: 18.01056,

  /**
   * Formylation 무게 (CO group)
   * - Formyl group: -CHO
   */
  FORMYLATION_WEIGHT: 27.99,
} as const;

/**
 * 참조 서열 사용 확률 설정
 */
export const REFERENCE_SEQUENCE_CONFIG = {
  /**
   * neighborSolution에서 참조 서열 사용 확률
   * - 0.9 = 90% 확률로 참조 서열에서 아미노산 선택
   * - 0.1 = 10% 확률로 랜덤 선택
   */
  USE_PROBABILITY: 0.9,
} as const;

/**
 * 조합 생성 제한 설정
 */
export const COMBINATION_LIMITS = {
  /**
   * 최대 조합 개수
   * - 메모리 부족 방지
   */
  MAX_COMBINATIONS: 10_000,

  /**
   * 전체 탐색 가능한 최대 페어 수
   * - 이 값을 초과하면 샘플링 전략 사용
   */
  MAX_PAIRS_FOR_FULL_SEARCH: 20,

  /**
   * Crosslinking 최대 사이즈
   * - 한 조합에 포함될 수 있는 최대 crosslinking 쌍 개수
   */
  MAX_CROSSLINKING_SIZE: 5,

  /**
   * 로그 출력 제한
   * - 조합 생성 시 처음 N개만 로그 출력
   */
  LOG_LIMIT: 50,
} as const;

/**
 * 성능 최적화 설정
 */
export const PERFORMANCE_CONFIG = {
  /**
   * 메모이제이션 캐시 최대 크기
   * - Map 크기 제한으로 메모리 관리
   */
  MEMOIZATION_MAX_SIZE: 1000,
} as const;

/**
 * MTS Iteration 슬라이더 설정
 *
 * Benchmark 조사 결과 온도(temperature)는 결과에 유의미한 영향이 없고 iteration 만
 * 영향이 있음이 드러났다. 그래서 MTS UI 는 온도를 Standard 값으로 고정하고 iteration
 * 만 슬라이더로 노출한다(SAIterationSlider.svelte). 온도 3종을 바꾸던 기존 3-모드
 * 라디오(Standard/Think/Deep think)는 이 앵커 기반 슬라이더로 대체.
 *
 * 슬라이더 위치 t∈[0,1] → iteration 매핑은 구간별 기하(로그) 보간이며 Standard 가
 * 정확히 midpoint(t=0.5)에 온다:
 *   t∈[0,0.5]   iter = FAST     · (STANDARD/FAST)^(2t)          // 100 → 1000
 *   t∈[0.5,1]   iter = STANDARD · (DEEPTHINK/STANDARD)^(2t-1)   // 1000 → 50000
 */
export const SA_ITERATION_ANCHORS = {
  /** 슬라이더 최좌측(Fast) — 가장 빠른 저정밀 */
  FAST: 100,
  /** 슬라이더 중앙(Standard) — 기본값 */
  STANDARD: 1000,
  /** 슬라이더 최우측(Deep think) — 최대 정밀, 최장 소요 */
  DEEPTHINK: 50000,
} as const;

/**
 * MTS SA 고정 온도 파라미터 (Standard 기준으로 고정)
 *
 * 온도가 결과에 무의미하므로 슬라이더는 iteration 만 조절하고 아래 값은 항상 고정으로
 * 워커에 전달된다. 값은 기존 Standard 프리셋과 동일.
 */
export const SA_FIXED_TEMPERATURE = {
  initialTemperature: 10000,
  absoluteTemperature: 0.001,
  coolingRate: 0.99,
} as const;
