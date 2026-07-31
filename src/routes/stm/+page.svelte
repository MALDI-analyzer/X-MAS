<script>
    import SeqConverter from "$lib/components/stm/SeqConverter.svelte";
    import AminoMapSelector from "$lib/components/AminoMapSelector.svelte";
    import NcAACodonSelector from "$lib/components/NcAACodonSelector.svelte";
    import { aminoMap } from "$lib/helper/amino_mapper";
    import { writable, get } from "svelte/store";
    import { codonTableRtoS } from "$lib/helper/amino_mapper";
    import { StmHelper } from "$lib/helper/stm_helper";
    import StmResultTable from "$lib/components/stm/StmResultTable.svelte";
    import { getContext, tick } from "svelte";
    import StmAdductSelector from "$lib/components/stm/StmAdductSelector.svelte";
    import PotentialModificationSelector from "$lib/components/stm/PotentialModificationSelector.svelte";
    import ReleaseFactorSelector from "$lib/components/stm/ReleaseFactorSelector.svelte";
    import { showAlert } from "$lib/stores/alertStore.js";
    let selectedMonoisotopicAminos = { ...aminoMap };

    let rnaSeq = ""; // RNA 시퀀스로 변경
    let possibilities = [];

    // 선택된 ncaa
    let ncAA = { B: 0.0, J: 0.0, O: 0.0, U: 0.0, X: 0.0, Z: 0.0 };

    let ionTypes = ['+H']; // 배열로 변경
    let potentialModifications = []; // Potential modifications
    let activeStopCodons = ['UAA', 'UAG', 'UGA']; // Release factor로 활성화된 stop 코돈 (기본: RF1+RF2)
    let showByproducts = true; // Note가 있는 행(Byproducts) 표시 여부 (true: 표시, false: 숨김)
    let noNcAASelected = false; // ncAA가 선택되지 않은 경우 경고 표시
    let runtimeMs = 0; // Calculate 클릭부터 결과 노출까지 소요시간(ms)

    /// 선택된 ncaa를 어떤 코돈들과 매핑할지 적어주는 부분 (배열로 변경)
    let codonTitles = writable({
        B: [],
        J: [],
        O: [],
        U: [],
        X: [],
        Z: [],
    });

    const loading = getContext("loading");

    function handleAminoMapChange(newAminos) {
        selectedMonoisotopicAminos = Object.fromEntries(
            Object.entries(newAminos)
                .filter(([key, value]) => value)
                .map(([key]) => [key, aminoMap[key]]),
        );
    }

    function handleNcAAChange(e) {
        ncAA = e.detail;
    }

    function onChangeCodonTitles(codonArray, key) {
        $codonTitles[key] = codonArray;
    }

    async function _onTapCalcButton() {
        loading.set(true);
        const startTime = performance.now();
        const calcSeq = getSequenceBeforeStop(rnaSeq);
        if (!await _validateCheck(calcSeq)) return loading.set(false);
        try {
            const filteredNcAA = removeZeroValueNcAA();
            // ncAA가 선택되지 않은 경우 체크
            noNcAASelected = Object.keys(filteredNcAA).length === 0;

            possibilities = StmHelper.calc(
                calcSeq,
                // @ts-ignore - ncAA 타입은 NcAACodonSelector에서 처리됨
                filteredNcAA,
                removeEmptyCodonTitles(),
                selectedMonoisotopicAminos,
                ionTypes,
                potentialModifications,
                activeStopCodons
            );
            await tick(); // 결과 DOM 반영까지 대기
            runtimeMs = performance.now() - startTime;
        } finally {
            loading.set(false);
        }
    }

    async function _validateCheck(seq) {
        // 입력값 없는 경우
        if (!seq) {
            await showAlert("Please enter RNA sequence.", "Validation Error", "warning");
            return false;
        }
        // 잘못된 입력값 있는경우
        if (seq.includes("?")) {
            await showAlert("Please enter the correct sequence.", "Validation Error", "warning");
            return false;
        }
        // RNA 시퀀스 길이가 3의 배수가 아닌 경우
        if (seq.length % 3 !== 0) {
            await showAlert("RNA sequence length must be a multiple of 3.", "Validation Error", "warning");
            return false;
        }
        // ncaa가 선택이 되었으나 codon 값이 입력되지 않은 경우
        if (!checkCustomCodonTitles1()) {
            await showAlert(
                "Codon name was not entered in the selected non-canonical amino acids used value.",
                "Validation Error",
                "warning"
            );
            return false;
        }
        // ncaa 의 codon 으로 입력된 값이 codonTableRtoS 에 매핑되지 않을때
        if (!await checkCustomCodonTitles2()) {
            return false;
        }
        // adduct가 선택되지 않은 경우는 이제 허용 (none 값으로 처리)
        // if (ionTypes.length === 0) {
        //     await showAlert("Please select at least one adduct type.", "Validation Error", "warning");
        //     return false;
        // }

        return true;
    }

    // ncaa가 선택이 된것중에 codon들이 모두 잘 들어가 있는지 체크
    function checkCustomCodonTitles1() {
        // ncAA에서 value가 0이 아닌 key를 모음
        let nonZeroKeys = Object.keys(ncAA).filter((key) => ncAA[key] !== 0);

        // codonTitles 값을 직접 구독해서 값 확인
        let currentCodonTitles = $codonTitles;

        for (const key of nonZeroKeys) {
            if (!currentCodonTitles[key] || currentCodonTitles[key].length === 0) {
                return false;
            }
        }
        return true;
    }

    async function checkCustomCodonTitles2() {
        // codonTitles의 현재 상태를 가져오기 위해 get 함수 사용
        let current = get(codonTitles);

        // ncAA에서 value가 0이 아닌 key를 모음
        let nonZeroKeys = Object.keys(ncAA).filter((key) => ncAA[key] !== 0);

        let msg = "";
        let isFirst = true;

        nonZeroKeys.forEach((key) => {
            if (key in current && current[key]) {
                current[key].forEach(codon => {
                    if (!(codon in codonTableRtoS)) {
                        // 첫 번째 줄에는 줄바꿈을 넣지 않음
                        if (!isFirst) {
                            msg = msg + "\n"; // 두 번째 이후로는 줄바꿈 추가
                        }
                        msg = msg + `Codon ${codon} is not mapped in RNA`;
                        isFirst = false; // 첫 번째 이후로는 줄바꿈 허용
                    }
                });
            }
        });
        if (msg) {
            await showAlert(msg, "Validation Error", "warning");
            return false;
        }
        return true;
    }

    // codonTitles 에서 빈 배열 제거
    function removeEmptyCodonTitles() {
        // 현재 codonTitles 값을 가져오기
        let current = get(codonTitles);

        // 빈 배열이 아닌 값만 새로운 객체에 저장
        let filteredCodonTitles = Object.fromEntries(
            Object.entries(current).filter(([key, value]) => value && value.length > 0),
        );

        return filteredCodonTitles;
    }

    // ncAA 에서 value 가 0 인거 제거
    function removeZeroValueNcAA() {
        // null이 아닌 값만 새로운 객체에 저장
        let filtedData = Object.fromEntries(
            Object.entries(ncAA).filter(([key, value]) => value !== 0.0),
        );
        return filtedData;
    }

    // RNA에서 Stop 코돈이 존재할 수 있음, 그중 가장 앞에있는 stop의 앞까지만 잘라서 계산에 반영
    // Release factor로 선택된(activeStopCodons) 코돈에서만 trim — ncAA 할당 여부와 무관
    // 입력값을 변경하지 않고 잘라낸 결과를 반환 (사용자가 RF 토글 후 재계산할 수 있도록)
    function getSequenceBeforeStop(seq) {
        const stopCodons = activeStopCodons;
        if (stopCodons.length === 0) return seq;

        // RNA 시퀀스를 3개씩 나누어 코돈으로 변환
        const codons = seq.match(/.{1,3}/g) || [];

        // 첫 번째 Stop 코돈의 인덱스 찾기
        let stopIndex = -1;
        for (let i = 0; i < codons.length; i++) {
            if (stopCodons.includes(codons[i])) {
                stopIndex = i;
                break;
            }
        }

        // Stop 코돈이 없는 경우 전체 시퀀스 유지
        if (stopIndex === -1) return seq;

        // Stop 코돈 이전까지의 코돈들만 다시 합쳐서 반환
        return codons.slice(0, stopIndex).join('');
    }

    function handleAdductChange(e) {
        ionTypes = e.detail;
    }

    function handlePotentialModificationChange(e) {
        potentialModifications = e.detail;
    }

    function handleReleaseFactorChange(e) {
        activeStopCodons = e.detail;
    }
</script>

<svelte:head>
  <title>Sequence to Mass - X-MAS</title>
</svelte:head>

<div class="container mt-5">
    <div class="text-center mb-4">
        <h1>Sequence to Mass</h1>
    </div>

    <div class="mb-3">
        <SeqConverter bind:rnaSeq></SeqConverter>
    </div>

    <div class="mb-3">
        <AminoMapSelector
            on:changeAminos={(e) => handleAminoMapChange(e.detail)}
        />
    </div>

    <div class="mb-3">
        <ReleaseFactorSelector
            on:change={handleReleaseFactorChange}
        />
    </div>

    <div class="mb-3">
        <StmAdductSelector
            on:changeAdduct={handleAdductChange}
        />
    </div>

    <div class="mb-3">
        <NcAACodonSelector
            on:changeNcAA={handleNcAAChange}
            bind:codonTitles
            {onChangeCodonTitles}
            {rnaSeq}
        />
    </div>

    <div class="mb-3">
        <PotentialModificationSelector
            on:change={handlePotentialModificationChange}
        />
    </div>

    <div class="d-flex align-items-center gap-3 mb-3">
        <button
            type="button"
            class="btn btn-primary flex-grow-1"
            on:click={_onTapCalcButton}
        >
        Calculate mass
        </button>
        <div class="byproducts-toggle form-check form-switch d-flex align-items-center">
            <label class="form-check-label me-2 mb-0" for="show-byproducts">Potential byproducts</label>
            <input
                type="checkbox"
                class="form-check-input"
                id="show-byproducts"
                role="switch"
                bind:checked={showByproducts}
            />
        </div>
    </div>

    {#if rnaSeq !== null && possibilities.length > 0}
        {#if noNcAASelected}
            <p class="no-ncaa-warning">No ncAA has been selected</p>
        {/if}
        <StmResultTable {possibilities} showByproducts={showByproducts} {runtimeMs} />
    {/if}
</div>

<style>
  .container {
    padding-left: 0;
    padding-right: 0;
  }

  .no-ncaa-warning {
    color: #856404;
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .byproducts-toggle {
    white-space: nowrap;
    margin-bottom: 0;
  }

  .byproducts-toggle label {
    cursor: pointer;
    margin-bottom: 0;
  }

  .byproducts-toggle .form-check-input {
    margin-top: 0;
    margin-left: 0;
  }

  /* 모바일 반응형 */
  @media (max-width: 767px) {
    .container {
      margin-top: 1rem !important;
    }

    h1 {
      font-size: 1.75rem;
    }

    .mb-3 {
      margin-bottom: 1rem !important;
    }

    .btn {
      padding: 0.75rem;
      font-size: 1rem;
    }

    .byproducts-toggle label {
      font-size: 0.85rem;
    }
  }

  /* 태블릿 */
  @media (min-width: 768px) and (max-width: 1023px) {
    h1 {
      font-size: 2rem;
    }
  }
</style>
