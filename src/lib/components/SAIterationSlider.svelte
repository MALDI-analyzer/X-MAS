<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { storage } from '$lib/services/storage.service';
  import { SA_ITERATION_ANCHORS, SA_FIXED_TEMPERATURE } from '$lib/config/algorithm.config';

  const dispatch = createEventDispatcher();

  const { FAST, STANDARD, DEEPTHINK } = SA_ITERATION_ANCHORS;

  // localStorage key (separate from the legacy 'mts_sa_mode' string — stores an iteration int)
  const STORAGE_KEY = 'mts_sa_iterations';

  /**
   * Slider position t∈[0,1] → iteration.
   * Piecewise geometric (log) interpolation so Standard lands exactly at midpoint (t=0.5).
   *   t∈[0,0.5]   iter = FAST     · (STANDARD/FAST)^(2t)          // 100 → 1000
   *   t∈[0.5,1]   iter = STANDARD · (DEEPTHINK/STANDARD)^(2t-1)   // 1000 → 50000
   */
  function posToIter(t) {
    const tc = Math.min(1, Math.max(0, t));
    const raw =
      tc <= 0.5
        ? FAST * Math.pow(STANDARD / FAST, 2 * tc)
        : STANDARD * Math.pow(DEEPTHINK / STANDARD, 2 * tc - 1);
    return Math.round(raw);
  }

  /** Inverse of posToIter: iteration → slider position t∈[0,1] */
  function iterToPos(iter) {
    const v = Math.min(DEEPTHINK, Math.max(FAST, iter));
    return v <= STANDARD
      ? Math.log(v / FAST) / Math.log(STANDARD / FAST) / 2
      : (Math.log(v / STANDARD) / Math.log(DEEPTHINK / STANDARD) + 1) / 2;
  }

  function clampIter(v) {
    if (!Number.isFinite(v)) return STANDARD;
    return Math.min(DEEPTHINK, Math.max(FAST, Math.round(v)));
  }

  // pos is the source of truth to avoid thumb jitter while dragging. iterations is derived.
  let pos = iterToPos(STANDARD); // 0.5 (default Standard)
  $: iterations = posToIter(pos);

  // Time hint (relative multiplier vs Standard + qualitative label). Absolute seconds depend on
  // the sequence/ion so they're unpredictable → show an honest relative multiplier instead.
  $: ratio = iterations / STANDARD;
  $: ratioText = ratio < 10 ? ratio.toFixed(1) : String(Math.round(ratio));
  $: hint =
    iterations < 500
      ? { label: 'Very fast', cls: 'fast' }
      : iterations < 3000
      ? { label: 'Normal', cls: 'std' }
      : iterations < 15000
      ? { label: 'Slow', cls: 'slow' }
      : { label: 'Very slow', cls: 'vslow' };

  function emitConfig() {
    dispatch('change', {
      initialTemperature: SA_FIXED_TEMPERATURE.initialTemperature,
      absoluteTemperature: SA_FIXED_TEMPERATURE.absoluteTemperature,
      saIterations: posToIter(pos),
      coolingRate: SA_FIXED_TEMPERATURE.coolingRate
    });
  }

  function persist() {
    if (browser) storage.save(STORAGE_KEY, posToIter(pos));
  }

  // Slider drag (fires after bind:value updates pos)
  function handleSlider() {
    persist();
    emitConfig();
  }

  // Direct entry in the number box (on commit)
  function handleNumberInput(event) {
    const v = clampIter(parseInt(event.target.value, 10));
    pos = iterToPos(v);
    persist();
    emitConfig();
  }

  // Tick label click → snap to that anchor
  function snapTo(value) {
    pos = iterToPos(value);
    persist();
    emitConfig();
  }

  onMount(() => {
    if (browser) {
      const saved = storage.load(STORAGE_KEY);
      if (saved != null && Number.isFinite(Number(saved))) {
        pos = iterToPos(clampIter(Number(saved)));
      }
    }
    // 마운트 시 부모에 초기 config 전달
    emitConfig();
  });
</script>

<div class="form-group">
  <label class="form-label fw-bold" for="sa-iter-range">Simulated Annealing Iterations</label>

  <div class="slider-block">
    <div class="slider-main">
      <div class="slider-col">
        <div class="tick-labels">
          <button type="button" class="tick tick-start" class:active={iterations <= FAST} on:click={() => snapTo(FAST)}>
            Fast
          </button>
          <button type="button" class="tick tick-mid" class:active={iterations === STANDARD} on:click={() => snapTo(STANDARD)}>
            Standard
          </button>
          <button type="button" class="tick tick-end" class:active={iterations >= DEEPTHINK} on:click={() => snapTo(DEEPTHINK)}>
            Deep think
          </button>
        </div>

        <input
          id="sa-iter-range"
          class="iter-range"
          type="range"
          min="0"
          max="1"
          step="0.001"
          bind:value={pos}
          on:input={handleSlider}
          aria-label="Simulated Annealing iterations"
        />

        <div class="hint-row">
          <span class="hint-badge {hint.cls}">{hint.label}</span>
          <span class="hint-text">~{ratioText}× the time of Standard</span>
        </div>
      </div>

      <div class="iter-value">
        <input
          class="iter-number"
          type="number"
          min={FAST}
          max={DEEPTHINK}
          step="1"
          value={iterations}
          on:change={handleNumberInput}
          aria-label="Current iteration value"
        />
        <span class="iter-unit">current iterations</span>
      </div>
    </div>
  </div>

  <small class="form-text text-muted mt-2 d-block">
    Drag the cursor to finely tune the iteration count (default: Standard = {STANDARD}). The
    temperature is fixed at the Standard value; a higher iteration count improves accuracy but takes
    longer to calculate. <strong>Deep think ({DEEPTHINK.toLocaleString()})</strong> may take tens of
    seconds or more.
  </small>
</div>

<style>
  .form-group {
    margin-bottom: 24px;
  }

  .form-label {
    font-size: 0.875rem;
    color: #424242;
    letter-spacing: 0.0071428571em;
    margin-bottom: 16px;
    display: block;
  }

  .slider-block {
    padding: 14px 16px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .tick-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .tick {
    background: none;
    border: none;
    padding: 2px 4px;
    font-size: 0.78rem;
    color: #757575;
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .tick:hover {
    color: #2196f3;
  }

  .tick.active {
    color: #1976d2;
    font-weight: 600;
  }

  .slider-main {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .slider-col {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .iter-range {
    width: 100%;
    margin: 0;
    accent-color: #2196f3;
    height: 4px;
    cursor: pointer;
  }

  .tick {
    white-space: nowrap;
  }

  .iter-value {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 92px;
  }

  .iter-number {
    width: 92px;
    text-align: center;
    font-size: 0.95rem;
    font-weight: 600;
    color: #212121;
    padding: 4px 6px;
    border: 1px solid #cfcfcf;
    border-radius: 6px;
  }

  .iter-unit {
    font-size: 0.68rem;
    color: #9e9e9e;
    margin-top: 3px;
  }

  .hint-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }

  .hint-badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    color: #fff;
  }

  .hint-badge.fast {
    background: #2e7d32;
  }

  .hint-badge.std {
    background: #1976d2;
  }

  .hint-badge.slow {
    background: #ef6c00;
  }

  .hint-badge.vslow {
    background: #c62828;
  }

  .hint-text {
    font-size: 0.78rem;
    color: #616161;
  }

  .form-text {
    font-size: 0.75rem;
    color: #757575;
    line-height: 1.4;
  }
</style>
