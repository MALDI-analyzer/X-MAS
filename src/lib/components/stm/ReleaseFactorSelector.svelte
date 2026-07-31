<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const releaseFactors = [
    { value: 'RF1', label: 'RF1 (UAA, UAG)', codons: ['UAA', 'UAG'] },
    { value: 'RF2', label: 'RF2 (UAA, UGA)', codons: ['UAA', 'UGA'] }
  ];

  let selected = ['RF1', 'RF2'];

  function computeStopCodons(selectedValues) {
    const set = new Set();
    for (const rf of releaseFactors) {
      if (selectedValues.includes(rf.value)) {
        rf.codons.forEach((c) => set.add(c));
      }
    }
    return Array.from(set);
  }

  function handleChange(value) {
    if (selected.includes(value)) {
      selected = selected.filter((v) => v !== value);
    } else {
      selected = [...selected, value];
    }
    dispatch('change', computeStopCodons(selected));
  }
</script>

<div class="form-group">
  <div class="form-label fw-bold mb-2">Release factor</div>
  <div class="checkboxes-row">
    {#each releaseFactors as rf}
      <div class="form-check">
        <input
          class="form-check-input"
          type="checkbox"
          id="release-factor-{rf.value}"
          checked={selected.includes(rf.value)}
          on:change={() => handleChange(rf.value)}
        />
        <label class="form-check-label" for="release-factor-{rf.value}">
          {rf.label}
        </label>
      </div>
    {/each}
  </div>
</div>

<style>
  .form-group {
    margin-bottom: 10px;
  }

  .checkboxes-row {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    margin: 0.5rem;
  }

  .form-check {
    margin-bottom: 0;
  }

  .form-check-label {
    font-size: 0.95em;
    font-weight: 600;
  }
</style>
