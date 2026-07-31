<script>
    import { createEventDispatcher } from 'svelte';
    
    export let showDialog = false;
    const dispatch = createEventDispatcher();

    const codonTable = [
        {
            title: 'Phe',
            codons: ['UUU', 'UUC']
        },
        {
            title: 'Leu',
            codons: ['UUA', 'UUG', 'CUU', 'CUC', 'CUA', 'CUG']
        },
        {
            title: 'Ile',
            codons: ['AUU', 'AUC', 'AUA']
        },
        {
            title: 'Met (Start)',
            codons: ['AUG'],
            isStart: true
        },
        {
            title: 'Val',
            codons: ['GUU', 'GUC', 'GUA', 'GUG']
        },
        {
            title: 'Ser',
            codons: ['UCU', 'UCC', 'UCA', 'UCG', 'AGU', 'AGC']
        },
        {
            title: 'Pro',
            codons: ['CCU', 'CCC', 'CCA', 'CCG']
        },
        {
            title: 'Thr',
            codons: ['ACU', 'ACC', 'ACA', 'ACG']
        },
        {
            title: 'Ala',
            codons: ['GCU', 'GCC', 'GCA', 'GCG']
        },
        {
            title: 'Tyr',
            codons: ['UAU', 'UAC']
        },
        {
            title: 'Stop',
            codons: ['UAA', 'UAG', 'UGA'],
            isStop: true
        },
        {
            title: 'His',
            codons: ['CAU', 'CAC']
        },
        {
            title: 'Gln',
            codons: ['CAA', 'CAG']
        },
        {
            title: 'Asn',
            codons: ['AAU', 'AAC']
        },
        {
            title: 'Lys',
            codons: ['AAA', 'AAG']
        },
        {
            title: 'Asp',
            codons: ['GAU', 'GAC']
        },
        {
            title: 'Glu',
            codons: ['GAA', 'GAG']
        },
        {
            title: 'Cys',
            codons: ['UGU', 'UGC']
        },
        {
            title: 'Trp',
            codons: ['UGG']
        },
        {
            title: 'Arg',
            codons: ['CGU', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG']
        },
        {
            title: 'Gly',
            codons: ['GGU', 'GGC', 'GGA', 'GGG']
        }
    ];

    function handleSelect(codon) {
        dispatch('select', { codon });
    }

    function handleClose() {
        showDialog = false;
    }
</script>

{#if showDialog}
    <div class="dialog-overlay">
        <div class="dialog-content">
            <div class="dialog-header">
                <h3>RNA Codon Table</h3>
                <button type="button" class="btn-close" on:click={handleClose}></button>
            </div>
            <div class="codon-grid">
                {#each codonTable as group}
                    <div class="codon-group">
                        <div class="amino-title">
                            {group.title}
                        </div>
                        <div class="codons">
                            {#each group.codons as codon}
                                <button
                                    class="codon-btn"
                                    class:stop-codon={group.isStop}
                                    class:start-codon={group.isStart}
                                    on:click={() => handleSelect(codon)}
                                >
                                    {codon}
                                    {#if group.isStop}
                                        <span class="codon-note">(Stop)</span>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .dialog-content {
        background: white;
        padding: 1.5rem;
        border-radius: 4px;
        max-width: 900px;
        width: 95%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #dee2e6;
    }

    .dialog-header h3 {
        font-size: 1.5rem;
        margin: 0;
        color: #1a1a1a;
    }

    .codon-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1rem;
    }

    .codon-group {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 3px;
        padding: 0.75rem;
    }

    .amino-title {
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #495057;
    }

    .codons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }

    .codon-btn {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        padding: 0.25rem 0.5rem;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
        color: #212529;
    }

    .codon-btn:hover {
        background: #e9ecef;
        border-color: #ced4da;
    }

    .stop-codon {
        font-weight: 700;
        border-color: #dc3545;
        background: #fff5f5;
    }

    .start-codon {
        color: #dc3545;
        font-weight: 500;
    }

    .codon-note {
        font-size: 0.7rem;
        margin-left: 0.25rem;
        color: #666;
    }
</style> 