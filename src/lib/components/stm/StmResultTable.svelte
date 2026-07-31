<script>
  import { adductPrintName, aminoMap } from '$lib/helper/amino_mapper';

  export let possibilities = [];
  export let showByproducts = true;
  export let runtimeMs = 0;

  // 필터링된 결과
  let filteredPossibilities = [];

  // 선택된 필터를 객체로 관리
  let selectedFilters = {};

  // 정렬 상태 관리
  let sortState = {
    monoisotopicWeight: 0,
    molecularWeight: 0,
    sequence: 0  // 0: 초기상태, 1: 오름차순, 2: 내림차순
  };

  // possibilities에서 동적으로 필터 옵션 추출
  $: {
    const allReasons = new Set();
    possibilities.forEach(poss => {
      if (poss.reasons && poss.reasons.length > 0) {
        poss.reasons.forEach(reason => {
          // "dC (x2)" 같은 형식에서 기본 이름만 추출 (카운트 제거)
          const baseReason = reason.replace(/\s*\(x\d+\)$/, '');
          allReasons.add(baseReason);
        });
      }
    });

    // 기존 selectedFilters 상태 유지하면서 새로운 필터 추가
    const newFilters = {};
    allReasons.forEach(reason => {
      newFilters[reason] = selectedFilters[reason] || false;
    });
    selectedFilters = newFilters;
  }

  $: noteOptions = Object.keys(selectedFilters);

  // 필터링 및 정렬 로직
  $: internallyFiltered = possibilities
    .filter(solution => {
      const activeFilters = Object.entries(selectedFilters).filter(([_, isSelected]) => isSelected);
      if (activeFilters.length === 0) return true;
      if (!solution.reasons || solution.reasons.length === 0) return selectedFilters['Only natural AA'];

      // reasons에 "dC (x2)" 같은 카운트가 포함되어 있으므로, 기본 이름으로 비교
      return activeFilters.some(([filter]) =>
        solution.reasons.some(reason => reason.replace(/\s*\(x\d+\)$/, '') === filter)
      );
    })
    .sort((a, b) => {
      // Monoisotopic Weight 정렬
      if (sortState.monoisotopicWeight === 1) {
        return a.weight - b.weight;
      } else if (sortState.monoisotopicWeight === 2) {
        return b.weight - a.weight;
      }

      // Molecular Weight 정렬
      if (sortState.molecularWeight === 1) {
        return a.molecularWeight - b.molecularWeight;
      } else if (sortState.molecularWeight === 2) {
        return b.molecularWeight - a.molecularWeight;
      }

      // Sequence Length 정렬
      const aFilteredLength = a.sequence.filter(item => item.letter !== "").length;
      const bFilteredLength = b.sequence.filter(item => item.letter !== "").length;
      if (sortState.sequence === 1) {
        return aFilteredLength - bFilteredLength;
      } else if (sortState.sequence === 2) {
        return bFilteredLength - aFilteredLength;
      }

      return 0;
    });

  // showByproducts와 internallyFiltered 변경에 반응
  // 항상 새 배열을 생성하여 Svelte가 변경을 감지하도록 함
  $: {
    if (showByproducts) {
      // 모두 표시 (byproducts 표시)
      filteredPossibilities = [...internallyFiltered];
    } else {
      // Note가 없는 것만 표시 (byproducts 숨김)
      filteredPossibilities = internallyFiltered.filter(p => !p.reasons || p.reasons.length === 0);
    }
  }

  function handleFilterChange(filter) {
    selectedFilters[filter] = !selectedFilters[filter];
  }

  function handleSort(column) {
    // 다른 컬럼의 정렬 상태 초기화
    Object.keys(sortState).forEach(key => {
      if (key !== column) sortState[key] = 0;
    });
    
    // 선택된 컬럼의 정렬 상태 순환 (0 -> 1 -> 2 -> 0)
    sortState[column] = (sortState[column] + 1) % 3;
  }
  
  function formatReasons(reasons) {
    if (!reasons || reasons.length === 0) {
      return '';
    }
    const counts = {};
    reasons.forEach(r => {
      counts[r] = (counts[r] || 0) + 1;
    });
    const formatted = Object.entries(counts).map(([r, count]) => {
      // Truncated는 중복이어도 하나만 표시
      return r === 'Truncated' ? r : (count > 1 ? `${r} (x${count})` : r);
    });
    return formatted.join(', ');
  }

  function isCrosslinkedIndex(solution, index) {
    if (!solution.crosslinking) return false;
    return solution.crosslinking.some(c => c.pair[0] === index || c.pair[1] === index);
  }

  function getCrosslinkModification(solution, index) {
    if (!solution.crosslinking) return null;
    const crosslink = solution.crosslinking.find(c => c.pair[0] === index || c.pair[1] === index);
    return crosslink ? crosslink.modification : null;
  }
</script>

<!-- Bootstrap Table -->
<div class="table-responsive mt-3">
  <div class="filter-section mb-3">
    <div class="filter-label mb-2">Filter by:</div>
    <div class="filter-options">
      {#each noteOptions as option}
        <label class="filter-checkbox">
          <input
            type="checkbox"
            checked={selectedFilters[option]}
            on:change={() => handleFilterChange(option)}
          />
          <span class="filter-text">{option}</span>
        </label>
      {/each}
    </div>
    {#if runtimeMs > 0}
      <div class="runtime-display">Runtime: {runtimeMs.toFixed(1)} ms</div>
    {/if}
  </div>

  {#key showByproducts}
    <table class="table table-striped table-hover">
      <thead class="table-light">
        <tr>
          <th scope="col">No.</th>
          <th
            scope="col"
            class="sortable-header"
            on:click={() => handleSort('monoisotopicWeight')}
          >
            Monoisotopic Weight
            {#if sortState.monoisotopicWeight === 1}
              <span class="sort-icon">↑</span>
            {:else if sortState.monoisotopicWeight === 2}
              <span class="sort-icon">↓</span>
            {:else}
              <span class="sort-icon">↕</span>
            {/if}
          </th>
          <th
            scope="col"
            class="sortable-header"
            on:click={() => handleSort('molecularWeight')}
          >
            Molecular Weight
            {#if sortState.molecularWeight === 1}
              <span class="sort-icon">↑</span>
            {:else if sortState.molecularWeight === 2}
              <span class="sort-icon">↓</span>
            {:else}
              <span class="sort-icon">↕</span>
            {/if}
          </th>
          <th
            scope="col"
            class="sortable-header"
            on:click={() => handleSort('sequence')}
          >
            Sequence
            {#if sortState.sequence === 1}
              <span class="sort-icon">↑</span>
            {:else if sortState.sequence === 2}
              <span class="sort-icon">↓</span>
            {:else}
              <span class="sort-icon">↕</span>
            {/if}
          </th>
          <th scope="col">Adduct</th>
          <th scope="col">Note</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredPossibilities as solution, index}
          <tr>
            <td>{index + 1}</td>
            <td>{solution.weight.toFixed(3)}</td>
            <td>{solution.molecularWeight.toFixed(3)}</td>
            <td>
              {#each solution.sequence.map((letter,idx)=>({letter,origIndex:idx})).filter(item=>item.letter.letter!=="") as item,visibleIndex}<span class="letter" data-index={visibleIndex%3===0?visibleIndex+1:undefined}>{#if item.letter.crosslinked && item.letter.crosslinkModification}{#if item.letter.singleSiteModified && item.letter.singleSiteModification && item.letter.singleSiteCondition === 'N-terminus'}<span class="text-danger">{item.letter.singleSiteModification}</span>{/if}<span class:text-danger={!item.letter.natural}>{item.letter.crosslinkModification}</span>{#if item.letter.singleSiteModified && item.letter.singleSiteModification && item.letter.singleSiteCondition === 'C-terminus'}<span class="text-danger">{item.letter.singleSiteModification}</span>{/if}{:else if item.letter.sideChainModified && item.letter.sideChainModification}{#if item.letter.singleSiteModified && item.letter.singleSiteModification && item.letter.singleSiteCondition === 'N-terminus'}<span class="text-danger">{item.letter.singleSiteModification}</span>{/if}<span class:text-danger={!item.letter.natural}>{item.letter.sideChainModification}</span>{#if item.letter.singleSiteModified && item.letter.singleSiteModification && item.letter.singleSiteCondition === 'C-terminus'}<span class="text-danger">{item.letter.singleSiteModification}</span>{/if}{:else if item.letter.singleSiteModified && item.letter.singleSiteModification && item.letter.singleSiteCondition === 'N-terminus'}<span class="text-danger">{item.letter.singleSiteModification}</span><span class:text-danger={!item.letter.natural}>{item.letter.letter}</span>{:else if item.letter.singleSiteModified && item.letter.singleSiteModification && item.letter.singleSiteCondition === 'C-terminus'}<span class:text-danger={!item.letter.natural}>{item.letter.letter}</span><span class="text-danger">{item.letter.singleSiteModification}</span>{:else}<span class:text-danger={!item.letter.natural}>{item.letter.letter}</span>{/if}</span>{/each}
            </td>
            <td>{adductPrintName(solution.adduct) || '-'}</td>
            <td>{formatReasons(solution.reasons)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/key}
</div>

<style>
  .filter-section {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
    position: relative;
  }

  .filter-label {
    font-weight: 600;
    color: #495057;
  }

  .runtime-display {
    position: absolute;
    right: 1rem;
    bottom: 0.5rem;
    font-size: 0.8rem;
    color: #6c757d;
    font-variant-numeric: tabular-nums;
  }

  .filter-options {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .filter-text {
    font-size: 0.9rem;
    color: #495057;
  }

  input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    cursor: pointer;
  }

  .sortable-header {
    cursor: pointer;
    user-select: none;
    position: relative;
    padding-right: 1.5rem;
  }

  .sortable-header:hover {
    background-color: #e9ecef;
  }

  .sort-icon {
    position: absolute;
    right: 0.5rem;
    color: #666;
  }

  th {
    white-space: nowrap;
  }

  .text-danger {
    color: red;
  }

  .letter {
    position: relative;
    display: inline;
    margin-right: 0.2em;
  }

  .letter::before {
    content: attr(data-index);
    position: absolute;
    top: -1em;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.5em;
    color: gray;
    user-select: none;
    pointer-events: none;
  }

  /* 모바일 반응형 */
  @media (max-width: 767px) {
    .filter-section {
      padding: 0.75rem;
    }

    .filter-label {
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }

    .filter-options {
      gap: 0.75rem;
    }

    .filter-checkbox {
      gap: 0.4rem;
    }

    .filter-text {
      font-size: 0.85rem;
    }

    input[type="checkbox"] {
      width: 0.9rem;
      height: 0.9rem;
    }

    .table {
      font-size: 0.85rem;
    }

    .table th, .table td {
      padding: 0.5rem 0.25rem;
    }

    .table th:first-child, .table td:first-child {
      padding-left: 0.5rem;
    }

    .table th:last-child, .table td:last-child {
      padding-right: 0.5rem;
    }

    .sortable-header {
      font-size: 0.85rem;
      padding-right: 1.25rem;
    }

    .sort-icon {
      right: 0.25rem;
      font-size: 0.9rem;
    }

    .letter {
      margin-right: 0.1em;
      font-size: 0.9em;
    }

    .letter::before {
      font-size: 0.45em;
      top: -0.9em;
    }
  }

  /* 태블릿 */
  @media (min-width: 768px) and (max-width: 1023px) {
    .table {
      font-size: 0.9rem;
    }

    .filter-text {
      font-size: 0.85rem;
    }
  }
</style>
