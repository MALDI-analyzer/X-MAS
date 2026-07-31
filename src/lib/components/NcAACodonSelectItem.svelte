<script>
    import { onMount } from 'svelte';
    import CodonSelectDialog from './CodonSelectDialog.svelte';
    import { formatFormula } from '$lib/helper/formula_util';

    export let data;
    export let key;
    export let onCancelSelectData;
    export let onChangeTitle;
    export let customCodonTitles;
    export let rnaSeq = "";

    let showCodonDialog = false;

    // RNA 시퀀스를 코돈 단위로 분할
    function getRnaCodons(rna) {
        if (!rna) return [];
        return rna.match(/.{1,3}/g) || [];
    }

    // 선택된 코돈 중 RNA 시퀀스에 없는 것이 있는지 확인
    $: rnaCodons = getRnaCodons(rnaSeq);
    $: missingCodons = customCodonTitles.filter(codon => !rnaCodons.includes(codon));
    $: hasWarning = missingCodons.length > 0 && customCodonTitles.length > 0;

    onMount(() => {
      let canvasId = `canvas-ncaa-codon-${data.title}`;
  
      setTimeout(() => {
        ChemDoodle.ELEMENT['H'].jmolColor = 'black';
        ChemDoodle.ELEMENT['S'].jmolColor = '#B9A130';
        let myCanvas = new ChemDoodle.ViewerCanvas(canvasId, 150, 150);
        myCanvas.styles.bonds_width_2D = 0.6;
        myCanvas.styles.bonds_saturationWidthAbs_2D = 2.6;
        myCanvas.styles.bonds_hashSpacing_2D = 2.5;
        myCanvas.styles.atoms_font_size_2D = 10;
        myCanvas.styles.atoms_font_families_2D = ['Helvetica', 'Arial', 'sans-serif'];
        myCanvas.styles.atoms_displayTerminalCarbonLabels_2D = true;
        let mol = new ChemDoodle.io.JSONInterpreter().molFrom(data.moleculeJson);
        myCanvas.loadMolecule(mol);
        myCanvas.repaint();
      }, 100);
    });

    function handleCodonSelect(event) {
      const selectedCodon = event.detail.codon;
      if (!customCodonTitles.includes(selectedCodon)) {
        customCodonTitles = [...customCodonTitles, selectedCodon];
        onChangeTitle(customCodonTitles, key);
      }
      showCodonDialog = false;
    }

    function removeCodon(codonToRemove) {
      customCodonTitles = customCodonTitles.filter(codon => codon !== codonToRemove);
      onChangeTitle(customCodonTitles, key);
    }
</script>

<div class="card-body text-center">
    <h5 class="card-title text-primary"><strong>{data.title}</strong></h5>
    <canvas id={`canvas-ncaa-codon-${data.title}`} width="100" height="100" class="border rounded mt-2 mx-auto" />
    <p class="card-text mb-1 mt-2"><strong>Molecular Formula:</strong> <span class="formula">{@html formatFormula(data.molecularFormula)}</span></p>
    <p class="card-text mb-1"><strong>Monoisotopic Weight:</strong> {data.monoisotopicWeight}</p>
    <p class="card-text mb-1"><strong>Molecular Weight:</strong> {data.molecularWeight}</p>

    <div class="mt-3">
        <!-- Codons 레이블과 선택된 코돈들 -->
        <div class="codons-container mb-2">
          <label class="form-label fw-bold mb-0 me-2">Codons:</label>
          <div class="selected-codons">
            {#each customCodonTitles as codon}
              <span class="badge bg-primary me-1 mb-1">
                {codon}
                <button
                  type="button"
                  class="btn-close btn-close-white ms-1"
                  aria-label="Remove {codon}"
                  on:click={() => removeCodon(codon)}
                ></button>
              </span>
            {/each}
          </div>
        </div>

        <!-- 코돈 추가 버튼 -->
        <button
          class="btn btn-outline-primary btn-sm w-100 mb-2"
          type="button"
          on:click={() => showCodonDialog = true}
        >
          Add Codon
        </button>

        <!-- Remove 버튼 -->
        <button class="btn btn-danger btn-sm w-100" on:click={() => onCancelSelectData(key)}>Remove</button>

    </div>

    <!-- 코돈이 RNA 시퀀스에 없을 때 경고 문구 (버튼 영역 바깥에 배치) -->
    {#if hasWarning}
      <div class="codon-warning mt-2">
        <small>The selected codon is not present in the RNA sequence.</small>
        <strong>{missingCodons.join(', ')}</strong>
      </div>
    {/if}
</div>

<CodonSelectDialog
    bind:showDialog={showCodonDialog}
    on:select={handleCodonSelect}
/>

<style>
    canvas {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .card-title {
        font-size: 1.1rem;
    }

    .card-text {
        font-size: 0.85rem;
    }

    .card-body {
        padding: 10px;
    }

    button {
        font-size: 0.875rem;
    }

    .codons-container {
        display: flex;
        align-items: flex-start;
        gap: 0;
    }

    .codons-container label {
        flex-shrink: 0;
        white-space: nowrap;
        padding-top: 4px;
    }

    .selected-codons {
        min-height: 30px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        flex: 1;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.8em;
    }

    .btn-close {
        font-size: 0.6em;
        padding: 0;
        margin: 0;
        width: 12px;
        height: 12px;
    }

    .formula {
        font-family: 'Times New Roman', Times, serif;
    }

    .codon-warning {
        text-align: center;
        line-height: 1.3;
    }

    .codon-warning small {
        display: block;
        font-size: 0.65em;
        color: #b8860b;
    }

    .codon-warning strong {
        display: block;
        font-size: 0.7em;
        color: #b8860b;
        margin-top: 2px;
    }
</style>
  