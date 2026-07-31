<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  /** @type {number} 0-based position index */
  export let position;
  /** @type {string} natural AA letter at this codon (or '*' for stop) */
  export let natural;
  /** @type {boolean} natural AA 가 현재 Amino acids set 에 포함되어 있는지 */
  export let naturalInSet = false;
  /** @type {Array<{letter: string, name?: string}>} 슬롯 letter 순 정렬된 후보 배열 */
  export let candidates = [];
  /** @type {string} 현재 적용 중인 letter (natural 또는 ncAA letter) */
  export let currentChoice;
  /** @type {{ top: number, left: number }} 화면 좌표 */
  export let anchor = { top: 0, left: 0 };

  const dispatch = createEventDispatcher();

  function select(letter) {
    dispatch('override', { position, letter });
    dispatch('close');
  }

  function close() {
    dispatch('close');
  }

  function handleDocMouseDown(e) {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest('.ncaa-popover')) close();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') close();
  }

  onMount(() => {
    window.addEventListener('mousedown', handleDocMouseDown);
    window.addEventListener('keydown', handleKeydown);
  });
  onDestroy(() => {
    window.removeEventListener('mousedown', handleDocMouseDown);
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  class="ncaa-popover"
  style="top: {anchor.top}px; left: {anchor.left}px;"
  role="dialog"
  aria-label="Select amino acid for position {position + 1}"
>
  <div class="popover-header">Position {position + 1}</div>

  <label class="option" class:disabled={!naturalInSet}>
    <input
      type="radio"
      name="ncaa-pos-{position}"
      value={natural}
      disabled={!naturalInSet}
      checked={currentChoice === natural}
      on:change={() => select(natural)}
    />
    <span class="letter">{natural}</span>
    <span class="label">{natural === '*' ? '(stop)' : '(natural)'}</span>
  </label>

  {#each candidates as cand}
    <label class="option">
      <input
        type="radio"
        name="ncaa-pos-{position}"
        value={cand.letter}
        checked={currentChoice === cand.letter}
        on:change={() => select(cand.letter)}
      />
      <span class="letter">{cand.letter}</span>
      {#if cand.name}<span class="label">({cand.name})</span>{/if}
    </label>
  {/each}
</div>

<style>
  .ncaa-popover {
    position: fixed;
    background: #fff;
    border: 1px solid #ced4da;
    border-radius: 6px;
    padding: 8px 10px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    z-index: 1050;
    min-width: 180px;
    font-size: 0.9rem;
  }

  .popover-header {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #6c757d;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e9ecef;
  }

  .option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 2px;
    cursor: pointer;
    user-select: none;
    margin: 0;
  }

  .option input[type='radio'] {
    cursor: pointer;
    margin: 0;
  }

  .option.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .option.disabled input[type='radio'] {
    cursor: not-allowed;
  }

  .option:not(.disabled):hover {
    background: #f8f9fa;
    border-radius: 3px;
  }

  .letter {
    font-family: 'Courier New', Courier, monospace;
    font-weight: 700;
    font-size: 0.95rem;
    min-width: 14px;
  }

  .label {
    color: #6c757d;
    font-size: 0.82rem;
  }
</style>
