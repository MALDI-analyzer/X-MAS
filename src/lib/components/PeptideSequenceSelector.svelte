<script>
  import { createEventDispatcher } from 'svelte';
  import NcAACandidatePopover from './NcAACandidatePopover.svelte';

  const dispatch = createEventDispatcher();

  /** @type {string} */
  export let aminoSequence = '';

  // v2.1: ncAA codon 치환 결과 시각화 props.
  /** @type {Set<number>} 자동 치환된 위치 (보라 테두리 표시) */
  export let autoSubPositions = new Set();
  /** @type {Set<number>} 후보 ≥ 2 위치 (↓ 화살표 + 팝오버 트리거) */
  export let multiCandidatePositions = new Set();
  /** @type {{ [i: number]: Array<{letter: string, name?: string}> }} */
  export let candidatesByPosition = {};
  /** @type {{ [i: number]: string }} 위치별 자연 AA letter (팝오버에 표시) */
  export let naturalByPosition = {};
  /** @type {{ [aa: string]: boolean }} Amino acids set 체크박스 상태 (자연 라디오 disabled 결정) */
  export let selectedAminoSet = {};

  // v1.1.0: RF-비활성 + ncAA 미지정 stop codon 위치. 특수 상태(주황 대각선)로 표시하고
  // ncAA 위치 토글에서 제외한다. (PDF stop codon 요구 7)
  /** @type {Set<number>} */
  export let specialStopPositions = new Set();

  /** @type {import('../../type/SequenceTemplate').PositionState[]} */
  let positionStates = [];

  /** @type {import('../../type/SequenceTemplate').NcAAZone[]} */
  let ncaaZones = [];

  // 각 위치가 속한 zone 인덱스 (green = -1). 인접한 두 variable 영역의 zone 이 다르면
  // 그 경계에 구분선(divider)을 그려 겹침/맞닿음 모호성을 해소한다. (PDF 요구 2)
  /** @type {number[]} */
  let zoneIdByPosition = [];

  // 팝오버 상태
  /** @type {number | null} 현재 열린 팝오버의 위치 인덱스 */
  let popoverPosition = null;
  /** @type {{ top: number, left: number }} */
  let popoverAnchor = { top: 0, left: 0 };

  // 타일 컨테이너 참조 (드래그 시 nearest-tile 폴백용)
  /** @type {HTMLElement} */
  let tilesContainer;

  // 드래그 상태
  let dragging = false;
  let dragMoved = false;
  let dragZoneIndex = -1;
  let dragSide = ''; // 'left' | 'right'
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartCount = 0;

  // ncAA 선택 시 좌우로 기본 노출되는 variable(노랑) 칸 수. (PDF 요구: 3 → 1)
  const DEFAULT_YELLOW_COUNT = 1;

  // aminoSequence가 변경되면 상태 초기화
  $: if (aminoSequence) {
    resetStates(aminoSequence);
  } else {
    positionStates = [];
    ncaaZones = [];
    dispatchChange();
  }

  function resetStates(seq) {
    positionStates = new Array(seq.length).fill('green');
    zoneIdByPosition = new Array(seq.length).fill(-1);
    ncaaZones = [];
    dispatchChange();
  }

  // 아미노산 클릭: 빨간색 토글 (또는 v2.1: 다중 후보 자리면 팝오버)
  function handleAminoClick(index, event) {
    if (dragging) return;
    if (dragMoved) {
      // 드래그 직후 발생한 click 이벤트는 무시 (실제 이동이 있었던 경우)
      dragMoved = false;
      return;
    }
    // 특수 상태(미해결 stop) 자리는 ncAA 위치 토글 대상이 아님 — codon 할당으로만 해결
    if (specialStopPositions.has(index)) return;

    // v2.1: 후보 ≥ 2 인 자리는 팝오버를 열고 manual-zone 토글은 건너뜀.
    if (multiCandidatePositions.has(index)) {
      openPopover(index, event);
      return;
    }

    const existingZoneIdx = ncaaZones.findIndex(z => z.ncaaIndex === index);

    if (existingZoneIdx !== -1) {
      // 이미 빨간색이면 제거 (토글)
      ncaaZones = ncaaZones.filter((_, i) => i !== existingZoneIdx);
    } else {
      // 새 ncAA zone 추가
      const leftMax = getMaxYellowLeft(index);
      const rightMax = getMaxYellowRight(index);
      ncaaZones = [...ncaaZones, {
        ncaaIndex: index,
        leftYellowCount: Math.min(DEFAULT_YELLOW_COUNT, leftMax),
        rightYellowCount: Math.min(DEFAULT_YELLOW_COUNT, rightMax),
      }];
      // 인덱스 순으로 정렬
      ncaaZones.sort((a, b) => a.ncaaIndex - b.ncaaIndex);
    }

    recalcYellowLimits();
    recalcPositionStates();
    dispatchChange();
  }

  // 노란 영역이 이미 빨간 존이 있는 곳과 겹치지 않도록 최대값 계산
  function getMaxYellowLeft(ncaaIndex) {
    // 왼쪽으로 갈 수 있는 최대 거리: 시퀀스 시작 또는 다른 zone의 영역까지
    let max = ncaaIndex; // 시퀀스 시작까지의 거리
    for (const zone of ncaaZones) {
      if (zone.ncaaIndex < ncaaIndex) {
        // 이 zone의 오른쪽 경계 이후부터 가능
        const zoneBoundary = zone.ncaaIndex + zone.rightYellowCount + 1;
        const available = ncaaIndex - zoneBoundary;
        if (available >= 0) {
          max = Math.min(max, available);
        } else {
          max = 0;
        }
      }
    }
    return max;
  }

  function getMaxYellowRight(ncaaIndex) {
    const seqLen = aminoSequence.length;
    let max = seqLen - ncaaIndex - 1; // 시퀀스 끝까지의 거리
    for (const zone of ncaaZones) {
      if (zone.ncaaIndex > ncaaIndex) {
        // 이 zone의 왼쪽 경계 이전까지 가능
        const zoneBoundary = zone.ncaaIndex - zone.leftYellowCount - 1;
        const available = zoneBoundary - ncaaIndex;
        if (available >= 0) {
          max = Math.min(max, available);
        } else {
          max = 0;
        }
      }
    }
    return max;
  }

  // 노란 제한값 재계산 (zone 추가/제거 후)
  function recalcYellowLimits() {
    ncaaZones = ncaaZones.map(zone => {
      const leftMax = getMaxYellowLeft(zone.ncaaIndex);
      const rightMax = getMaxYellowRight(zone.ncaaIndex);
      return {
        ...zone,
        leftYellowCount: Math.min(zone.leftYellowCount, leftMax),
        rightYellowCount: Math.min(zone.rightYellowCount, rightMax),
      };
    });
  }

  // positionStates 재계산
  function recalcPositionStates() {
    if (!aminoSequence) return;
    const states = new Array(aminoSequence.length).fill('green');
    const zoneIds = new Array(aminoSequence.length).fill(-1);

    ncaaZones.forEach((zone, zi) => {
      // 빨간색
      states[zone.ncaaIndex] = 'red';
      zoneIds[zone.ncaaIndex] = zi;

      // 왼쪽 노란색
      for (let i = 1; i <= zone.leftYellowCount; i++) {
        const idx = zone.ncaaIndex - i;
        if (idx >= 0 && states[idx] !== 'red') {
          states[idx] = 'yellow';
          zoneIds[idx] = zi;
        }
      }

      // 오른쪽 노란색
      for (let i = 1; i <= zone.rightYellowCount; i++) {
        const idx = zone.ncaaIndex + i;
        if (idx < aminoSequence.length && states[idx] !== 'red') {
          states[idx] = 'yellow';
          zoneIds[idx] = zi;
        }
      }
    });

    positionStates = states;
    zoneIdByPosition = zoneIds;
  }

  // 드래그 시작 (노란 영역 경계)
  function handleDragStart(event, zoneIndex, side) {
    event.preventDefault();
    dragging = true;
    dragMoved = false;
    dragZoneIndex = zoneIndex;
    dragSide = side;
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    dragStartX = clientX;
    dragStartY = clientY;
    dragStartCount = side === 'left'
      ? ncaaZones[zoneIndex].leftYellowCount
      : ncaaZones[zoneIndex].rightYellowCount;

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  }

  function handleDragMove(event) {
    if (!dragging || dragZoneIndex < 0) return;
    event.preventDefault();

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const dx = clientX - dragStartX;
    const dy = clientY - dragStartY;
    if (Math.sqrt(dx * dx + dy * dy) > 4) dragMoved = true;

    // 커서 아래 타일을 절대 인덱스로 찾음. 줄바꿈 경계에서는 축소하려면 커서가 줄 밖 빈
    // 공간으로 나가는데, 그 지점엔 타일이 없어 elementFromPoint 가 실패한다(줄바꿈 드래그
    // 버그). 이 경우 가장 가까운 타일로 폴백해 경계 조정이 계속 동작하게 한다.
    let hoverIndex = -1;
    const el = document.elementFromPoint(clientX, clientY);
    const tileEl = el && el.closest ? el.closest('.tile') : null;
    const hoverIndexAttr = tileEl ? tileEl.getAttribute('data-index') : null;
    if (hoverIndexAttr !== null) {
      hoverIndex = parseInt(hoverIndexAttr, 10);
    } else {
      hoverIndex = findNearestTileIndex(clientX, clientY);
    }
    if (hoverIndex < 0 || Number.isNaN(hoverIndex)) return;

    const zone = ncaaZones[dragZoneIndex];

    // 다른 ncAA(빨간 영역) 위에서는 갱신하지 않음 (자기 자신의 ncaaIndex 는 허용 -> 카운트 0 까지 축소 가능)
    if (hoverIndex !== zone.ncaaIndex && positionStates[hoverIndex] === 'red') return;

    if (dragSide === 'left') {
      const newCount = Math.max(0, zone.ncaaIndex - hoverIndex);
      const maxLeft = getMaxYellowLeft(zone.ncaaIndex);
      ncaaZones[dragZoneIndex] = {
        ...zone,
        leftYellowCount: Math.min(newCount, maxLeft),
      };
    } else {
      const newCount = Math.max(0, hoverIndex - zone.ncaaIndex);
      const maxRight = getMaxYellowRight(zone.ncaaIndex);
      ncaaZones[dragZoneIndex] = {
        ...zone,
        rightYellowCount: Math.min(newCount, maxRight),
      };
    }

    ncaaZones = [...ncaaZones];
    recalcPositionStates();
    dispatchChange();
  }

  // 커서 좌표에서 가장 가까운 타일의 절대 인덱스를 반환 (elementFromPoint 실패 시 폴백).
  // 각 타일 rect 에 좌표를 clamp 한 거리로 최근접을 고르므로, 줄 밖/줄 사이 빈 공간에서도
  // 그 줄의 첫/끝 타일로 자연스럽게 수렴한다.
  function findNearestTileIndex(x, y) {
    if (!tilesContainer) return -1;
    const tiles = tilesContainer.querySelectorAll('.tile[data-index]');
    let best = -1;
    let bestDist = Infinity;
    for (const t of tiles) {
      const r = t.getBoundingClientRect();
      const cx = Math.max(r.left, Math.min(x, r.right));
      const cy = Math.max(r.top, Math.min(y, r.bottom));
      const ddx = x - cx;
      const ddy = y - cy;
      const d = ddx * ddx + ddy * ddy;
      if (d < bestDist) {
        bestDist = d;
        const attr = t.getAttribute('data-index');
        best = attr !== null ? parseInt(attr, 10) : best;
      }
    }
    return best;
  }

  function handleDragEnd() {
    dragging = false;
    dragZoneIndex = -1;
    dragSide = '';
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('touchend', handleDragEnd);
  }

  // 특정 위치가 노란 영역의 경계(드래그 핸들)인지 확인
  function getDragHandle(index) {
    for (let zi = 0; zi < ncaaZones.length; zi++) {
      const zone = ncaaZones[zi];
      // 왼쪽 노란 경계 (안쪽으로 줄이기)
      const leftBoundary = zone.ncaaIndex - zone.leftYellowCount;
      if (index === leftBoundary && zone.leftYellowCount > 0) {
        return { zoneIndex: zi, side: 'left' };
      }
      // 왼쪽 노란 바깥의 초록 (바깥으로 늘리기). leftYellowCount === 0 케이스도 자연스럽게 포함됨.
      const leftOuter = zone.ncaaIndex - zone.leftYellowCount - 1;
      if (index === leftOuter && index >= 0 && positionStates[index] === 'green') {
        return { zoneIndex: zi, side: 'left' };
      }
      // 오른쪽 노란 경계 (안쪽으로 줄이기)
      const rightBoundary = zone.ncaaIndex + zone.rightYellowCount;
      if (index === rightBoundary && zone.rightYellowCount > 0) {
        return { zoneIndex: zi, side: 'right' };
      }
      // 오른쪽 노란 바깥의 초록 (바깥으로 늘리기)
      const rightOuter = zone.ncaaIndex + zone.rightYellowCount + 1;
      if (index === rightOuter && index < aminoSequence.length && positionStates[index] === 'green') {
        return { zoneIndex: zi, side: 'right' };
      }
    }
    return null;
  }

  // Fixed/Gap 세그먼트 계산
  function computeSegments() {
    if (!aminoSequence || positionStates.length === 0) {
      return { fixedSegments: [], gapSegments: [] };
    }

    const fixedSegments = [];
    const gapSegments = [];

    let i = 0;
    while (i < aminoSequence.length) {
      if (positionStates[i] === 'green') {
        // 연속된 green 수집
        let start = i;
        let seq = '';
        while (i < aminoSequence.length && positionStates[i] === 'green') {
          seq += aminoSequence[i];
          i++;
        }
        fixedSegments.push({ startIndex: start, sequence: seq });
      } else {
        // 연속된 red/yellow 수집
        let start = i;
        let origSeq = '';
        while (i < aminoSequence.length && positionStates[i] !== 'green') {
          origSeq += aminoSequence[i];
          i++;
        }
        gapSegments.push({ startIndex: start, length: origSeq.length, originalSequence: origSeq });
      }
    }

    return { fixedSegments, gapSegments };
  }

  function dispatchChange() {
    const { fixedSegments, gapSegments } = computeSegments();
    dispatch('change', {
      positionStates: [...positionStates],
      fixedSegments,
      gapSegments,
      ncaaZones: [...ncaaZones],
      fullSequence: aminoSequence,
    });
  }

  // 팝오버 열기: 클릭된 타일 아래에 floating 으로 배치.
  function openPopover(index, event) {
    const target = event && event.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : null;
    if (target) {
      const rect = target.getBoundingClientRect();
      popoverAnchor = { top: rect.bottom + 6, left: rect.left };
    } else {
      popoverAnchor = { top: 0, left: 0 };
    }
    popoverPosition = index;
  }

  function closePopover() {
    popoverPosition = null;
  }

  function handleOverride(e) {
    // 상위로 forward — 페이지에서 positionOverrides 갱신
    dispatch('override', e.detail);
  }

  // 반응형 세그먼트 정보
  // positionStates/aminoSequence를 직접 참조해야 Svelte가 의존성으로 추적함
  $: segments = (positionStates, aminoSequence, computeSegments());
  $: fixedCount = positionStates.filter(s => s === 'green').length;
  $: gapCount = positionStates.filter(s => s !== 'green').length;
</script>

{#if aminoSequence}
  <div class="peptide-selector mb-3">
    <span class="form-label fw-bold d-block">Narrow search space (fix your sequence)</span>
    <div class="sequence-help">
      <small class="text-muted">
        Click amino acids to mark ncAA positions. Drag yellow edges to adjust boundaries.
      </small>
    </div>

    <div class="sequence-tiles" role="group" aria-label="Peptide sequence selector" bind:this={tilesContainer}>
      {#each aminoSequence.split('') as amino, index}
        {@const state = positionStates[index] || 'green'}
        {@const handle = getDragHandle(index)}
        {@const isAutoSub = autoSubPositions.has(index)}
        {@const isMulti = multiCandidatePositions.has(index)}
        {@const isSpecialStop = specialStopPositions.has(index)}
        {@const zoneDivider =
          index > 0 &&
          state !== 'green' &&
          positionStates[index - 1] !== undefined &&
          positionStates[index - 1] !== 'green' &&
          zoneIdByPosition[index] >= 0 &&
          zoneIdByPosition[index - 1] >= 0 &&
          zoneIdByPosition[index] !== zoneIdByPosition[index - 1]}
        <div
          class="tile tile-{state}"
          class:tile-drag-handle={handle !== null && !isSpecialStop}
          class:tile-auto-sub={isAutoSub && state === 'green'}
          class:tile-multi={isMulti}
          class:tile-special-stop={isSpecialStop}
          class:tile-zone-divider={zoneDivider}
          data-index={index}
          role="button"
          tabindex="0"
          aria-label="Position {index + 1}: {amino} ({isSpecialStop ? 'unassigned stop codon' : state}{isAutoSub ? ', auto-substituted' : ''}{isMulti ? ', multiple candidates' : ''})"
          on:click={(e) => handleAminoClick(index, e)}
          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAminoClick(index, e); }}
          on:mousedown={(e) => { if (handle && !isSpecialStop) handleDragStart(e, handle.zoneIndex, handle.side); }}
          on:touchstart={(e) => { if (handle && !isSpecialStop) handleDragStart(e, handle.zoneIndex, handle.side); }}
        >
          <span class="tile-index">{index + 1}</span>
          <span class="tile-amino">{amino}</span>
          {#if isMulti}
            <span class="tile-arrow" aria-hidden="true">▾</span>
          {/if}
        </div>
      {/each}
    </div>

    {#if popoverPosition !== null}
      <NcAACandidatePopover
        position={popoverPosition}
        natural={naturalByPosition[popoverPosition] || ''}
        naturalInSet={!!selectedAminoSet[naturalByPosition[popoverPosition]]}
        candidates={candidatesByPosition[popoverPosition] || []}
        currentChoice={aminoSequence[popoverPosition] || ''}
        anchor={popoverAnchor}
        on:override={handleOverride}
        on:close={closePopover}
      />
    {/if}

    <!-- 범례 -->
    <div class="legend mt-2">
      <span class="legend-item">
        <span class="legend-color legend-green"></span>
        <small>Fixed ({fixedCount})</small>
      </span>
      <span class="legend-item">
        <span class="legend-color legend-red"></span>
        <small>ncAA ({positionStates.filter(s => s === 'red').length})</small>
      </span>
      <span class="legend-item">
        <span class="legend-color legend-yellow"></span>
        <small>Variable ({positionStates.filter(s => s === 'yellow').length})</small>
      </span>
    </div>

    <!-- 세그먼트 요약 -->
    {#if ncaaZones.length > 0}
      <div class="segments-summary mt-2">
        <small class="text-muted">
          Fixed segments: {segments.fixedSegments.map(s => `"${s.sequence}"`).join(', ') || 'None'}
          {#if segments.gapSegments.length > 0}
            <br/>Variable gaps: {segments.gapSegments.map(s => `${s.length} positions`).join(', ')}
          {/if}
        </small>
      </div>
    {/if}
  </div>
{/if}

<style>
  .peptide-selector {
    user-select: none;
  }

  .sequence-help {
    margin-bottom: 8px;
  }

  .sequence-tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 44px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background-color 0.15s, border-color 0.15s, transform 0.1s;
  }

  .tile:hover {
    transform: scale(1.08);
    border-color: #666;
  }

  .tile:focus-visible {
    outline: 2px solid #0d6efd;
    outline-offset: 1px;
  }

  .tile-green {
    background-color: #c8e6c9;
    border-color: #a5d6a7;
    color: #2e7d32;
  }

  .tile-red {
    background-color: #ef9a9a;
    border-color: #e57373;
    color: #c62828;
  }

  .tile-yellow {
    background-color: #fff9c4;
    border-color: #fff176;
    color: #f57f17;
  }

  /* v2.1: 자동 치환된 자리 (보라 테두리). green 타일에만 덧입혀짐 (manual red/yellow 우선) */
  .tile-auto-sub {
    background-color: #e1bee7;
    border-color: #8e24aa;
    color: #4a148c;
  }

  /* v1.1.0: 미해결 stop codon (RF-비활성 + ncAA 미지정). 주황 대각선 줄무늬로 "ncAA 할당 필요" 강조.
     green/red/yellow 상태 위에 덧입혀지며 최우선 표시. */
  .tile-special-stop {
    background-color: #ffe0b2 !important;
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4px,
      rgba(230, 81, 0, 0.35) 4px,
      rgba(230, 81, 0, 0.35) 8px
    ) !important;
    border-color: #e65100 !important;
    border-style: dashed !important;
    border-width: 2px !important;
    color: #bf360c !important;
    cursor: not-allowed;
  }

  .tile-arrow {
    position: absolute;
    bottom: -2px;
    right: 2px;
    font-size: 9px;
    line-height: 1;
    color: #6a1b9a;
    pointer-events: none;
  }

  .tile-multi {
    cursor: pointer;
  }

  .tile {
    position: relative;
  }

  .tile-drag-handle {
    cursor: ew-resize;
  }

  /* v1.1.0: 서로 다른 ncAA zone 의 variable 영역이 맞닿는 경계에 세로 구분선.
     .tile 이 position:relative 이므로 왼쪽 2px gap 안에 divider 를 띄운다. (PDF 요구 2) */
  .tile-zone-divider::after {
    content: '';
    position: absolute;
    left: -2px;
    top: 3px;
    bottom: 3px;
    width: 2px;
    background: #455a64;
    border-radius: 1px;
    pointer-events: none;
  }

  .tile-yellow.tile-drag-handle {
    border-style: dashed;
    border-width: 2px;
  }

  .tile-green.tile-drag-handle:hover {
    border-style: dashed;
    border-width: 2px;
    border-color: #2e7d32;
  }

  .tile-amino {
    font-weight: 700;
    font-size: 14px;
    line-height: 1;
  }

  .tile-index {
    font-size: 9px;
    opacity: 0.6;
    line-height: 1;
    margin-top: 2px;
  }

  .legend {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .legend-color {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-green {
    background-color: #c8e6c9;
    border: 1px solid #a5d6a7;
  }

  .legend-red {
    background-color: #ef9a9a;
    border: 1px solid #e57373;
  }

  .legend-yellow {
    background-color: #fff9c4;
    border: 1px solid #fff176;
  }

  /* 모바일 */
  @media (max-width: 767px) {
    .tile {
      width: 28px;
      height: 38px;
    }

    .tile-amino {
      font-size: 12px;
    }

    .tile-index {
      font-size: 8px;
    }

    .legend {
      gap: 10px;
    }
  }
</style>
