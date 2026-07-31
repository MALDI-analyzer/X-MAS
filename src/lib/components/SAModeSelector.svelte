<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { storage } from '$lib/services/storage.service';

  const dispatch = createEventDispatcher();

  // SA 모드 설정
  const saConfigs = {
    standard: {
      label: 'Standard',
      description: 'Balanced calculation with moderate exploration',
      initialTemperature: 10000,
      absoluteTemperature: 0.001,
      saIterations: 100,
      coolingRate: 0.99
    },
    think: {
      label: 'Think',
      description: 'Thorough calculation with extensive exploration',
      initialTemperature: 50000,
      absoluteTemperature: 0.00001,
      saIterations: 100,
      coolingRate: 0.99
    },
    deepthink: {
      label: 'Deep think',
      description: 'Advanced reasoning with profound exploration',
      initialTemperature: 100000,
      absoluteTemperature: 0.000001,
      saIterations: 100,
      coolingRate: 0.99
    },
    custom: {
      label: 'Custom',
      description: 'Manually tune all SA parameters',
      initialTemperature: 10000,
      absoluteTemperature: 0.001,
      saIterations: 100,
      coolingRate: 0.99
    }
  };

  // 기본값: Standard
  export let selectedMode = 'standard';

  // customizable=true 일 때만 SA 파라미터 input 노출
  export let customizable = false;

  // 현재 적용 중인 값 (custom 일 때만 input 으로 직접 편집 가능)
  let initialTemperature = saConfigs.standard.initialTemperature;
  let absoluteTemperature = saConfigs.standard.absoluteTemperature;
  let saIterations = saConfigs.standard.saIterations;
  let coolingRate = saConfigs.standard.coolingRate;

  // localStorage key
  const STORAGE_KEY = 'mts_sa_mode';

  function emitConfig() {
    dispatch('change', {
      initialTemperature,
      absoluteTemperature,
      saIterations,
      coolingRate
    });
  }

  function applyPreset(mode) {
    const cfg = saConfigs[mode];
    if (!cfg) return;
    initialTemperature = cfg.initialTemperature;
    absoluteTemperature = cfg.absoluteTemperature;
    saIterations = cfg.saIterations;
    coolingRate = cfg.coolingRate;
  }

  // 표시 가능한 프리셋 키 목록 (customizable=false 면 custom 제외)
  $: visibleModes = Object.entries(saConfigs).filter(
    ([mode]) => customizable || mode !== 'custom'
  );

  // 컴포넌트 마운트 시 storage에서 값 로드
  onMount(() => {
    if (browser) {
      const savedMode = storage.load(STORAGE_KEY);
      if (savedMode && saConfigs[savedMode]) {
        // customizable=false 인데 저장된 모드가 custom 이면 standard 로 폴백
        if (savedMode === 'custom' && !customizable) {
          selectedMode = 'standard';
        } else {
          selectedMode = savedMode;
        }
      }
    }
    // custom 이 아니면 프리셋 값으로 초기화
    if (selectedMode !== 'custom') {
      applyPreset(selectedMode);
    }
    emitConfig();
  });

  // 라디오 버튼 변경 시 처리 함수
  function handleModeChange(event) {
    selectedMode = event.target.value;

    // storage에 저장
    if (browser) {
      storage.save(STORAGE_KEY, selectedMode);
    }

    // custom 모드는 기존 입력값 유지, 그 외 모드는 프리셋 적용
    if (selectedMode !== 'custom') {
      applyPreset(selectedMode);
    }
    emitConfig();
  }

  function handleInputChange() {
    // Custom 모드에서 input 변경 시 즉시 dispatch
    emitConfig();
  }
</script>

<div class="form-group">
  <label class="form-label fw-bold">Simulated Annealing Mode</label>

  <div class="sa-mode-options">
    {#each visibleModes as [mode, config]}
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="saMode"
          id="saMode_{mode}"
          value={mode}
          bind:group={selectedMode}
          on:change={handleModeChange}
        />
        <label class="form-check-label" for="saMode_{mode}">
          <div class="mode-info">
            <span class="mode-title">{config.label}</span>
            <span class="mode-description text-muted">{config.description}</span>
          </div>
        </label>
      </div>
    {/each}
  </div>

  {#if customizable}
    <div class="sa-params mt-3">
      <div class="row g-2">
        <div class="col-6 col-md-3">
          <label class="param-label" for="sa-init-temp">Initial Temp</label>
          <input
            id="sa-init-temp"
            type="number"
            class="form-control form-control-sm"
            min="0"
            step="any"
            bind:value={initialTemperature}
            on:input={handleInputChange}
            disabled={selectedMode !== 'custom'}
          />
        </div>
        <div class="col-6 col-md-3">
          <label class="param-label" for="sa-abs-temp">Absolute Temp</label>
          <input
            id="sa-abs-temp"
            type="number"
            class="form-control form-control-sm"
            min="0"
            step="any"
            bind:value={absoluteTemperature}
            on:input={handleInputChange}
            disabled={selectedMode !== 'custom'}
          />
        </div>
        <div class="col-6 col-md-3">
          <label class="param-label" for="sa-iterations">Iterations</label>
          <input
            id="sa-iterations"
            type="number"
            class="form-control form-control-sm"
            min="1"
            step="1"
            bind:value={saIterations}
            on:input={handleInputChange}
            disabled={selectedMode !== 'custom'}
          />
        </div>
        <div class="col-6 col-md-3">
          <label class="param-label" for="sa-cooling-rate">Cooling Rate</label>
          <input
            id="sa-cooling-rate"
            type="number"
            class="form-control form-control-sm"
            min="0.5"
            max="0.999"
            step="0.001"
            bind:value={coolingRate}
            on:input={handleInputChange}
            disabled={selectedMode !== 'custom'}
          />
        </div>
      </div>
      <small class="form-text text-muted mt-2 d-block">
        프리셋 선택 시 위 값들이 자동으로 채워집니다. <strong>Custom</strong>을 선택하면 직접 편집할 수 있습니다.
      </small>
    </div>
  {/if}

  <small class="form-text text-muted mt-2">
    Higher modes provide better accuracy but take more time to calculate
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
  }

  .sa-mode-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-check {
    position: relative;
    padding: 10px 12px;
    border-radius: 6px;
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .form-check:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
    border-color: #cccccc;
  }

  .form-check:has(.form-check-input:checked) {
    background-color: #e3f2fd;
    border-color: #2196f3;
    box-shadow: 0 1px 3px rgba(33, 150, 243, 0.2);
  }

  .form-check-input {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 12px;
    width: 18px;
    height: 18px;
    accent-color: #2196f3;
    margin: 0;
  }

  .mode-info {
    padding-right: 32px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mode-title {
    font-size: 0.95rem;
    font-weight: 500;
    color: #212121;
    line-height: 1.4;
    white-space: nowrap;
    min-width: 80px;
  }

  .mode-description {
    font-size: 0.8rem;
    color: #757575;
    line-height: 1.3;
    margin: 0;
  }

  .form-check-label {
    cursor: pointer;
    width: 100%;
    display: block;
  }

  .form-text {
    font-size: 0.75rem;
    color: #757575;
    margin-top: 6px;
    line-height: 1.33;
  }

  .form-check:has(.form-check-input:checked) .mode-title {
    color: #1976d2;
  }

  .sa-params {
    padding: 12px 14px;
    background: #fafafa;
    border: 1px solid #eaeaea;
    border-radius: 6px;
  }

  .param-label {
    font-size: 0.75rem;
    color: #555;
    margin-bottom: 4px;
    display: block;
  }
</style>
