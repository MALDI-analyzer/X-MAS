<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { createEventDispatcher } from 'svelte';
    import Modal from '$lib/components/Modal.svelte';
    import MolecularListItem from '$lib/components/MolecularListItem.svelte';
    import NcAACodonSelectItem from './NcAACodonSelectItem.svelte';
    import { get } from 'svelte/store';
    import { storage } from '$lib/services/storage.service';
    import { showAlert } from '$lib/stores/alertStore.js';


    const dispatch = createEventDispatcher();

    export let codonTitles;
    export let onChangeCodonTitles;
    export let rnaSeq = "";
    // 슬롯에 letter (B/J/O/U/X/Z) 배지를 표시할지 여부. NcAASelector 와 동일한 시각 패턴.
    export let showLetterLabels = false;
    /// 로컬 스토리지에 저장된 분자들
    let savedData = writable([]);

    /// 선택된 ncaa 
    let selectedData = writable({
      B: 0.0,
      J: 0.0,
      O: 0.0,
      U: 0.0,
      X: 0.0,
      Z: 0.0
    });

    let showModal = writable(false);
    let selectedKey = 'B'; // Default key
  
    onMount(() => {
      loadSavedData();
    });
  
    function loadSavedData() {
      const storedData = storage.load('moleculeData') || [];
      savedData.set(storedData);
    }
  
    async function openModal(key) {
      if ($savedData.length == 0) {
        await showAlert('There is no ncAA created.', 'Information', 'info');
        return;
      }
      selectedKey = key;
      showModal.set(true);
    }
  
    function closeModal() {
      showModal.set(false);
    }
  
    function selectData(data) {
      selectedData.update((values) => ({ ...values, [selectedKey]: data }));
      closeModal();
    }
  
    function confirmSelection() {
      dispatch('changeNcAA', $selectedData);
    }
  
    function onClickBody(index) {
      let _data = $savedData[index];

      // if(_checkAlreadyExistValue(_data)){
      //   alert('This value has already been added.');
      //   return;
      // }

      selectData(_data);
      confirmSelection();
    }

    // // 전달받은 값이 이미 selectedData에 존재하는지 체크
    // function _checkAlreadyExistValue(data) {
    //   // 현재 `selectedData`의 모든 `value`를 가져옴
    //   let selectedDataValues = Object.values(get(selectedData));
      
    //   // `targetValue`가 `selectedDataValues` 중 하나와 일치하는지 체크
    //   return selectedDataValues.includes(data);
    // }

    function onCancelSelectData(targetKey) {
      selectedData.update(currentData => {
      if (currentData.hasOwnProperty(targetKey)) {
        currentData[targetKey] = 0.0;
      }
      return currentData;
      });
      
      codonTitles.update(currentData => {
      if (currentData.hasOwnProperty(targetKey)) {
        currentData[targetKey] = [];
      }
      return currentData;
      });
      confirmSelection();
    }
  
    function onChangeTitles(codonArray, key){
      onChangeCodonTitles(codonArray, key);
    }

    // Get keys of selectedData
    const keys = Object.keys($selectedData);
  </script>
  
  <div class="mt-4">
    <label for="selector" class="form-label fw-bold">Non-canonical amino acids used</label>
    <div id="selector" class="row g-3">
      {#each keys as key}
        <div class="col-md-4">
          <div class="card h-100 slot-card">
            {#if showLetterLabels}
              <span class="letter-badge" aria-label="Slot letter {key}">{key}</span>
            {/if}
            <div class="card-body d-flex align-items-center justify-content-center">
              {#if $selectedData[key]}
                <NcAACodonSelectItem
                  data={$selectedData[key]}
                  {key}
                  {onCancelSelectData}
                  customCodonTitles={$codonTitles[key] || []}
                  onChangeTitle={onChangeTitles}
                  {rnaSeq}
                />
              {:else}
                <button
                  id="select-btn-{key}"
                  class="btn btn-outline-secondary w-100"
                  on:click={() => openModal(key)}
                  aria-label="Select {key} non-canonical monomer">
                  Select
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  

  {#if $showModal}
    <Modal onClose={closeModal}>
      <ul class="list-group">
        {#each $savedData as data, index}
          <li class="list-group-item">
            <MolecularListItem {data} {index} {onClickBody} />
          </li>
        {/each}
      </ul>
    </Modal>
  {/if}
  
  <style>
    .list-group-item {
      cursor: pointer;
    }

    .card-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  #selector {
    margin: 0.5rem;
  }

    .slot-card {
      position: relative;
    }

    .letter-badge {
      position: absolute;
      top: 6px;
      left: 8px;
      background: #495057;
      color: #fff;
      padding: 2px 10px;
      font-weight: 700;
      font-size: 0.85rem;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      letter-spacing: 0.5px;
      z-index: 1;
      pointer-events: none;
    }
  </style>
  