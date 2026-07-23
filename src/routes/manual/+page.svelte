<script>
  function goToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<svelte:head>
  <title>X-MAS User Guide</title>
</svelte:head>

<!-- Navigation Bar -->
<nav class="navbar navbar-expand-lg navbar-dark bg-primary manual-nav">
  <div class="container-fluid">
    <a class="navbar-brand" href="#" on:click={(e) => {e.preventDefault(); goToSection('welcome')}}>X-MAS User Guide</a>
    <button
      class="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarNav"
      aria-controls="navbarNav"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav ms-auto">
        <li class="nav-item">
          <a class="nav-link" href="#" on:click={(e) => {e.preventDefault(); goToSection('welcome')}}>Welcome</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" on:click={(e) => {e.preventDefault(); goToSection('ncaa')}}>My ncAAs</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" on:click={(e) => {e.preventDefault(); goToSection('potential')}}>Potential Modification</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" on:click={(e) => {e.preventDefault(); goToSection('s2m')}}>S2M</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" on:click={(e) => {e.preventDefault(); goToSection('m2s')}}>M2S</a>
        </li>
      </ul>
    </div>
  </div>
</nav>

<!-- Page Content -->
<div class="container my-4">
  <!-- Welcome Section -->
  <section id="welcome" class="mb-5">
    <div class="card">
      <div class="card-body">
        <h2 class="section-title">Welcome to X-MAS</h2>
        <p class="card-text">
          <strong>X-MAS (eXpanded-code Mass Analysis System)</strong> is an analysis tool for mass spectrometry (MS) data of peptides containing non-canonical amino acids (ncAAs) produced in reconstituted cell-free translation systems (rCFSs).
        </p>

        <div class="text-center my-4">
          <img src="/manual/image1.png" alt="X-MAS Screenshot" class="img-fluid rounded shadow" style="max-width: 100%;" />
        </div>

        <p>This tool provides two pre-defined functionalities for ncAAs and modifications, which are used in two complementary analysis approaches:</p>

        <ul>
          <li><strong>My ncAAs:</strong> Pre-define and save the chemical structures of ncAAs for use in reconstituted cell-free system (rCFS)</li>
          <li><strong>Potential modification:</strong> Pre-define chemical or enzymatic modifications that occur, or may occur, on peptides after translation.</li>
          <li><strong>Sequence to Mass (S2M):</strong> Calculate the expected masses of peptides containing ncAAs from RNA sequences, incorporating possible ncAA-related translational errors and user-defined chemical and enzymatic modifications at the peptide level.</li>
          <li><strong>Mass to Sequence (M2S):</strong> Predict possible peptide sequences from observed masses using translation information (e.g., RNA sequence, amino acid set, etc.).</li>
        </ul>

        <p>Together, these functions allow enabling more efficient and easier interpretation of peptide MS data.</p>

        <div class="alert alert-info mt-4">
          <h5 class="alert-heading">General Workflow</h5>
          <p class="mb-2"><strong>Recommended order:</strong></p>
          <ol class="mb-0">
            <li><strong>Preparation phase:</strong>
              <ul>
                <li>Define and save ncAAs (if using genetic code expansion)</li>
                <li>Define and save Potential Modifications (if modeling PTMs)</li>
              </ul>
            </li>
            <li><strong>Prediction phase (S2M):</strong>
              <ul>
                <li>Enter RNA sequence</li>
                <li>Define parameters (RNA sequence used, amino acids used, adduct, ncAAs, Potential modifications)</li>
                <li>Calculate to get expected masses</li>
              </ul>
            </li>
            <li><strong>Identification phase (M2S):</strong>
              <ul>
                <li>Take observed MS peaks</li>
                <li>Provide as much optional information as possible</li>
                <li>Use M2S to identify unknown sequences</li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </section>

  <!-- My ncAAs Section -->
  <section id="ncaa" class="mb-5">
    <div class="card">
      <div class="card-body">
        <h2 class="section-title">My ncAAs</h2>
        <div class="text-center my-3">
          <img src="/manual/image2.png" alt="My ncAAs" class="img-fluid rounded" />
        </div>

        <p class="card-text">
          <strong>Purpose:</strong> Define and save the chemical structures of non-canonical amino acids (ncAAs) for use in ribosome-mediated cell-free synthesis (rCFS). This step is essential for genetic code expansion experiments involving synthetic ncAAs.
        </p>

        <div class="alert alert-info">
          <strong>When to use:</strong> Use this tab before running S2M or M2S calculations if your experiment involves ncAAs. Each ncAA needs to be defined only once and can be reused across multiple analyses.
        </div>

        <!-- Accordion for ncAA Steps -->
        <div class="accordion mt-4" id="ncaaAccordion">
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#ncaaStep1" aria-expanded="true" aria-controls="ncaaStep1">
                Step 1 - Define the Name of the ncAA
              </button>
            </h2>
            <div id="ncaaStep1" class="accordion-collapse collapse show" data-bs-parent="#ncaaAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image3.png" alt="ncAA Name Input" class="img-fluid rounded" />
                </div>
                <p>Enter a name that will be used to identify this ncAA in subsequent analyses (e.g., B, J, pAF, β-Ala).</p>
                <p><strong>Requirements:</strong></p>
                <ul>
                  <li>The name must not contain spaces (single continuous string).</li>
                  <li>Each ncAA must have a unique name.</li>
                  <li>Letters, numbers, and special characters are allowed.</li>
                </ul>
                <div class="alert alert-warning">
                  <strong>Warning:</strong> Avoid using the one-letter codes of the 20 canonical amino acids (A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y) to prevent ambiguity in sequence-to-mass mapping.
                </div>
                <p><strong>Tip:</strong> Use abbreviations commonly adopted in the literature or define a consistent naming system (e.g., pAF for para-azido-phenylalanine).</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#ncaaStep2" aria-expanded="false" aria-controls="ncaaStep2">
                Step 2 - Draw the Chemical Structure
              </button>
            </h2>
            <div id="ncaaStep2" class="accordion-collapse collapse" data-bs-parent="#ncaaAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image4.png" alt="Chemical Canvas" class="img-fluid rounded" />
                </div>
                <p>Use the chemical canvas to draw the chemical structure of the ncAA.</p>
                <p><strong>Drawing tools:</strong></p>
                <ul>
                  <li><img src="/manual/image5.png" alt="Atoms" class="tool-icon" /> <strong>Atoms label:</strong> Add or change atoms (C, N, O, S, etc.).</li>
                  <li><img src="/manual/image6.png" alt="Attributes" class="tool-icon" /> <strong>Attributes:</strong> Assign formal charges when necessary.</li>
                  <li><img src="/manual/image7.png" alt="Bonds" class="tool-icon" /> <strong>Bonds:</strong> Single, wedge, dash double, or triple bonds.</li>
                  <li><img src="/manual/image8.png" alt="Rings" class="tool-icon" /> <strong>Rings:</strong> Benzene, cyclohexane, and other ring structures.</li>
                  <li><img src="/manual/image9.png" alt="Chain" class="tool-icon" /> <strong>Carbon Chain:</strong> Create linear chains or repeating structural units.</li>
                  <li><img src="/manual/image10.png" alt="Move" class="tool-icon" /> <strong>Move:</strong> Move and reposition atoms or molecular fragments.</li>
                  <li><img src="/manual/image11.png" alt="Clear" class="tool-icon" /> <strong>Clear:</strong> Remove the entire chemical structure from the drawing canvas.</li>
                  <li><img src="/manual/image12.png" alt="Eraser" class="tool-icon" /> <strong>Eraser:</strong> Remove atoms or bonds from the structure.</li>
                  <li><img src="/manual/image13.png" alt="Center" class="tool-icon" /> <strong>Center:</strong> Moves the drawn structure to the center of the canvas.</li>
                  <li><img src="/manual/image14.png" alt="Flip" class="tool-icon" /> <strong>Flip horizontally/vertically:</strong> Flip the structure horizontally or vertically.</li>
                  <li><img src="/manual/image15.png" alt="Undo" class="tool-icon" /> <strong>Undo/Redo:</strong> Revert or reapply the most recent action.</li>
                  <li><img src="/manual/image16.png" alt="Scale" class="tool-icon" /> <strong>Increase/Decrease scale:</strong> Zoom in or out of the view.</li>
                </ul>
                <div class="text-center my-3">
                  <img src="/manual/image17.png" alt="Load Template" class="img-fluid rounded" />
                </div>
                <p><strong>Tip:</strong> If you want to further modify an existing amino acid or a previously drawn ncAA, click Load Template to load it as a starting structure and edit it directly.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#ncaaStep3" aria-expanded="false" aria-controls="ncaaStep3">
                Step 3 - Calculate and Save
              </button>
            </h2>
            <div id="ncaaStep3" class="accordion-collapse collapse" data-bs-parent="#ncaaAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image18.png" alt="Calculate and Save" class="img-fluid rounded" />
                </div>
                <p>Click "Calculate molecular weight" to automatically calculate molecular properties:</p>
                <ul>
                  <li>Molecular formula (e.g., C₁₁H₁₂N₂O₂)</li>
                  <li>Monoisotopic mass (used for MS-based analysis)</li>
                  <li>Average molecular weight</li>
                </ul>
                <p>Click "Save ncAA" to store the defined ncAAs in the browser's local storage, where it remains available for future sessions.</p>
                <p>Once saved, the ncAA is immediately available in both <strong>S2M</strong> and <strong>M2S</strong> tabs and can be reused without redrawing.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#ncaaStep4" aria-expanded="false" aria-controls="ncaaStep4">
                Step 4 - Manage and Remove
              </button>
            </h2>
            <div id="ncaaStep4" class="accordion-collapse collapse" data-bs-parent="#ncaaAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image19.png" alt="Manage ncAAs" class="img-fluid rounded" />
                </div>
                <ul>
                  <li>All saved ncAAs are listed below the canvas</li>
                  <li>To remove an ncAA, click "X"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Potential Modification Section -->
  <section id="potential" class="mb-5">
    <div class="card">
      <div class="card-body">
        <h2 class="section-title">Potential Modification</h2>
        <div class="text-center my-3">
          <img src="/manual/image20.png" alt="Potential Modification" class="img-fluid rounded" />
        </div>

        <p class="card-text">
          <strong>Purpose:</strong> Define enzymatic and chemical reactions that may occur during translation or post-synthetic reaction. These reactions are incorporated into X-MAS as candidate modification events and are combinatorially explored in S2M. Consequently, X-MAS enumerates plausible modified peptide species and compares them with experimental MS data to support data interpretation.
        </p>

        <div class="alert alert-info">
          <strong>When to Use:</strong> Use this step when specific, pre-defined modification events that cause predictable mass shifts are expected, such as:
          <ul class="mb-0 mt-2">
            <li>Post-translational modifications (PTMs) (e.g. formylation, phosphorylation, acetylation, etc.)</li>
            <li>Chemical reactions</li>
            <li>Crosslinking (e.g. disulfide bonds, chemical crosslinkers)</li>
          </ul>
        </div>

        <div class="alert alert-warning">
          <strong>Note:</strong> If you expect no modifications, skip this section.
        </div>

        <!-- Accordion for Potential Modification Steps -->
        <div class="accordion mt-4" id="potentialAccordion">
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#potentialStep1" aria-expanded="true" aria-controls="potentialStep1">
                Step 1 - Enter modification name
              </button>
            </h2>
            <div id="potentialStep1" class="accordion-collapse collapse show" data-bs-parent="#potentialAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image21.png" alt="Modification Name" class="img-fluid rounded" />
                </div>
                <ul>
                  <li>Define the names of the modifications that may occur.</li>
                  <li>These names are used as memo labels in S2M to indicate which modification event occurred</li>
                </ul>
                <p><strong>Tip:</strong> "Formylation" is already defined by default modification and does not need to be defined.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#potentialStep2" aria-expanded="false" aria-controls="potentialStep2">
                Step 2 - Type
              </button>
            </h2>
            <div id="potentialStep2" class="accordion-collapse collapse" data-bs-parent="#potentialAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image22.png" alt="Modification Type" class="img-fluid rounded" />
                </div>
                <p>Select the modification type based on whether the reaction involves one-site or two-sites:</p>

                <div class="row mt-3">
                  <div class="col-md-6">
                    <div class="card h-100">
                      <div class="card-body">
                        <h6 class="card-title"><strong>Single-site</strong></h6>
                        <div class="text-center my-2">
                          <img src="/manual/image23.png" alt="Single-site" class="img-fluid rounded" />
                        </div>
                        <p class="card-text small">Use "Single-site" for one-site modifications</p>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="card h-100">
                      <div class="card-body">
                        <h6 class="card-title"><strong>Crosslinking</strong></h6>
                        <div class="text-center my-2">
                          <img src="/manual/image24.png" alt="Crosslinking" class="img-fluid rounded" />
                        </div>
                        <p class="card-text small">Use "Crosslinking" for two-site modifications.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#potentialStep3a" aria-expanded="false" aria-controls="potentialStep3a">
                Step 3 - Condition (Single-site)
              </button>
            </h2>
            <div id="potentialStep3a" class="accordion-collapse collapse" data-bs-parent="#potentialAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image25.png" alt="Single-site Condition" class="img-fluid rounded" />
                </div>
                <p>Condition specifies the reaction site where a modification can occur. Three options are available:</p>

                <div class="mt-3">
                  <h6><strong>N-terminus</strong></h6>
                  <div class="text-center my-2">
                    <img src="/manual/image26.png" alt="N-terminus" class="img-fluid rounded" style="max-width: 400px;" />
                  </div>
                  <ul>
                    <li>This applies to cases where the modification occurs when the target is located at the N-terminus.</li>
                    <li>The modification name is written as a prefix before the first residue.</li>
                    <li>Example: <code>MXXXXX</code> → <code>fMXXXXX</code></li>
                  </ul>
                </div>

                <div class="mt-3">
                  <h6><strong>C-terminus</strong></h6>
                  <div class="text-center my-2">
                    <img src="/manual/image27.png" alt="C-terminus" class="img-fluid rounded" style="max-width: 400px;" />
                  </div>
                  <ul>
                    <li>This applies to cases where the modification occurs when the target is located at the C-terminus.</li>
                    <li>The modification name is written as a suffix after the residue</li>
                    <li>Example: <code>XXXXXA</code> → <code>XXXXXAn</code></li>
                  </ul>
                </div>

                <div class="mt-3">
                  <h6><strong>Side chain</strong></h6>
                  <div class="text-center my-2">
                    <img src="/manual/image28.png" alt="Side chain" class="img-fluid rounded" style="max-width: 400px;" />
                  </div>
                  <ul>
                    <li>This applies to cases where the modification occurs regardless of the target position in the sequence.</li>
                    <li>The modification name is written as a substitution for the target.</li>
                    <li>Example: <code>XXBXX</code> → <code>XXCXX</code></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#potentialStep3b" aria-expanded="false" aria-controls="potentialStep3b">
                Step 3 - Condition (Crosslinking)
              </button>
            </h2>
            <div id="potentialStep3b" class="accordion-collapse collapse" data-bs-parent="#potentialAccordion">
              <div class="accordion-body">
                <p>Specify the positional relationship between the two targets (<strong>target amino acid 1</strong> and <strong>target amino acid 2</strong>) involved in the crosslinking event.</p>

                <div class="mt-3">
                  <h6><strong>Adjacent</strong></h6>
                  <div class="text-center my-2">
                    <img src="/manual/image29.png" alt="Adjacent" class="img-fluid rounded" />
                  </div>
                  <ul>
                    <li>Select this option when <strong>target amino acid 1</strong> and <strong>target amino acid 2</strong> are directly adjacent in the sequence.</li>
                    <li>The directionality (1→2, 2→1, or 1↔2) determines in which direction a reaction can occur between the two targets.</li>
                  </ul>
                </div>

                <div class="mt-3">
                  <h6><strong>Distance</strong></h6>
                  <div class="text-center my-2">
                    <img src="/manual/image30.png" alt="Distance" class="img-fluid rounded" />
                  </div>
                  <ul>
                    <li>Select this option when crosslinking depends on the sequence distance between <strong>target amino acid 1</strong> and <strong>target amino acid 2</strong>.</li>
                    <li>The distance is defined as the number of residues separating the two target amino acids and can be specified using (&gt;, =, &lt;) with a numeric value.</li>
                  </ul>
                </div>

                <div class="text-center my-3">
                  <img src="/manual/image28.png" alt="Crosslink Example" class="img-fluid rounded" style="max-width: 400px;" />
                </div>
                <p>If a condition is specified, define the chemical name. When the condition is satisfied, both Target 1 and Target 2 are substituted with the modification name.</p>
                <p>Example: <code>XCXXCX</code> → <code>XdCXXdCX</code></p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#potentialStep4" aria-expanded="false" aria-controls="potentialStep4">
                Step 4 - Select Targets
              </button>
            </h2>
            <div id="potentialStep4" class="accordion-collapse collapse" data-bs-parent="#potentialAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image31.png" alt="Select Targets" class="img-fluid rounded" />
                </div>
                <ul>
                  <li>Select the substrates on which the modification can occur.</li>
                  <li>Available targets include canonical amino acids as well as ncAAs saved under "My ncAA".</li>
                  <li>A reaction will occur when the selected substrates satisfy the specified condition.</li>
                </ul>
                <p><strong>Tip:</strong> For N-terminus and C-terminus condition cases, "<strong>All</strong>" can be selected as the target. In this case, the reaction occurs whenever the condition is satisfied, regardless of the specific target.</p>

                <div class="text-center my-3">
                  <img src="/manual/image32.png" alt="Two Targets" class="img-fluid rounded" />
                </div>
                <p>In crosslinking, two targets must be selected.</p>
                <div class="alert alert-warning">
                  <strong>Note:</strong> Under the Adjacent condition, the order of Target 1 and Target 2 affects the outcome and must be considered when selecting the targets.
                </div>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#potentialStep5" aria-expanded="false" aria-controls="potentialStep5">
                Step 5 - Draw the modified chemical structure
              </button>
            </h2>
            <div id="potentialStep5" class="accordion-collapse collapse" data-bs-parent="#potentialAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image33.png" alt="Draw Modified Structure" class="img-fluid rounded" />
                </div>
                <ul>
                  <li>Draw the post-modification structure of the target.</li>
                  <li>If the target is set to "All", draw the structure in which the modification is applied to <strong>glycine</strong>.</li>
                  <li>In crosslinking, draw the structure in which the two targets are chemically modified and linked together.</li>
                </ul>
                <div class="alert alert-warning">
                  <strong>Important:</strong> Do not draw the two targets as a dipeptide (i.e., do not connect them via a peptide backbone).
                </div>
                <div class="text-center my-3">
                  <img src="/manual/image34.png" alt="Crosslink Structure" class="img-fluid rounded" />
                </div>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#potentialStep6" aria-expanded="false" aria-controls="potentialStep6">
                Step 6 - Calculate and Save
              </button>
            </h2>
            <div id="potentialStep6" class="accordion-collapse collapse" data-bs-parent="#potentialAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image64.png" alt="Calculate and Save" class="img-fluid rounded" />
                </div>
                <p>Click "Calculate Molecular Weight" to calculate the molecular weight based on the drawn modified structure.</p>
                <div class="alert alert-warning">
                  <strong>Note:</strong> For N-terminus / C-terminus in single-site, molecular weight calculation follows a different rule: only the mass difference introduced by the modification is applied to the target mass.
                </div>
                <p>Click "Save modification" to store the modification locally.</p>
                <div class="text-center my-3">
                  <img src="/manual/image35.png" alt="Saved Modifications" class="img-fluid rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Sequence to Mass (S2M) Section -->
  <section id="s2m" class="mb-5">
    <div class="card">
      <div class="card-body">
        <h2 class="section-title">Sequence to Mass (S2M)</h2>
        <div class="text-center my-3">
          <img src="/manual/image36.png" alt="S2M" class="img-fluid rounded" />
        </div>

        <p class="card-text">
          <strong>Purpose:</strong> Calculate all possible peptide masses that could arise from an RNA sequence, considering biological phenomena such as:
        </p>
        <ul>
          <li>Non-canonical amino acid (ncAA) incorporation.</li>
          <li>Translational errors.</li>
          <li>Post-translational modifications.</li>
          <li>Adduct ion formation during MS analysis.</li>
        </ul>

        <div class="alert alert-info">
          <strong>When to use:</strong> Use S2M when all translation parameters are known - such as the input RNA sequence, the non-canonical amino acids (ncAAs) and the set of amino acids used for translation, codons for ncAAs - to predict the peptide masses expected in an MS experiment. This is particularly useful for validating genetic code expansion experiments and confirming expected translation products.
        </div>

        <!-- Accordion for S2M Steps -->
        <div class="accordion mt-4" id="s2mAccordion">
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#s2mStep1" aria-expanded="true" aria-controls="s2mStep1">
                Step 1 - RNA Sequence
              </button>
            </h2>
            <div id="s2mStep1" class="accordion-collapse collapse show" data-bs-parent="#s2mAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image37.png" alt="RNA Sequence Input" class="img-fluid rounded" />
                </div>
                <p>Enter your RNA or DNA sequence (A, T, U, G, and C bases only).</p>
                <ul>
                  <li>DNA sequences will be automatically converted to RNA (T→U)</li>
                  <li>Sequence length must be a multiple of three (codon units)</li>
                  <li>Translation terminates at the first stop codon (UAG, UAA, UGA)</li>
                  <li>The entered RNA/DNA sequence is immediately translated, and the peptide sequence with amino acid positions is shown below</li>
                </ul>
                <div class="text-center my-3">
                  <img src="/manual/image38.png" alt="Translated Sequence" class="img-fluid rounded" />
                </div>
                <p><strong>Tip:</strong> Sequences are saved locally for reuse</p>
                <div class="text-center my-3">
                  <img src="/manual/image39.png" alt="Save Load" class="img-fluid rounded" />
                </div>
                <ul>
                  <li><img src="/manual/image40.png" alt="Save" class="tool-icon" /> <strong>Save:</strong> Sequences are saved locally for reuse</li>
                  <li><img src="/manual/image41.png" alt="Load" class="tool-icon" /> <strong>Load:</strong> Previously saved sequences are loaded for use.</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#s2mStep2" aria-expanded="false" aria-controls="s2mStep2">
                Step 2 - Amino acids set
              </button>
            </h2>
            <div id="s2mStep2" class="accordion-collapse collapse" data-bs-parent="#s2mAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image42.png" alt="Amino Acids Set" class="img-fluid rounded" />
                </div>
                <ul>
                  <li>Select only the amino acids that were supplied in the translation reaction to reflect the experimental setup.</li>
                  <li>Unselected amino acids won't be incorporated, even if their codons appear in the RNA sequence</li>
                  <li>Codons for unselected amino acids may result in ribosome skipping or ncAA incorporation (if assigned)</li>
                  <li>Useful for reconstituted cell-free system experiments with limited amino acid pools</li>
                </ul>
                <p><strong>Tip:</strong> All Check selects all amino acids on the first click and deselects all on the second click, while StrepII, Flag, HA, and cMyc select only the amino acids used in the corresponding tag sequences.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#s2mStep3" aria-expanded="false" aria-controls="s2mStep3">
                Step 3 - Adduct Selection
              </button>
            </h2>
            <div id="s2mStep3" class="accordion-collapse collapse" data-bs-parent="#s2mAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image43.png" alt="Adduct Selection" class="img-fluid rounded" />
                </div>
                <p>Select ion adducts that form during mass spectrometry analysis.</p>
                <p><strong>Available adducts:</strong></p>

                <h6>1) Positive</h6>
                <ul>
                  <li><strong>H⁺</strong> (Proton) - Most common in positive mode MS</li>
                  <li><strong>Na⁺</strong> (Sodium) - common metal adduct</li>
                  <li><strong>K⁺</strong> (Potassium) - Another common metal adduct</li>
                  <li><strong>NH₄⁺</strong> (Ammonium)</li>
                  <li><strong>none</strong> - Neutral mass [M]</li>
                </ul>

                <h6>2) Negative</h6>
                <ul>
                  <li><strong>H⁻</strong> (Proton) - Most common in negative mode MS</li>
                  <li><strong>Na⁻</strong> (Sodium) - common metal adduct</li>
                  <li><strong>K⁻</strong> (Potassium)</li>
                  <li><strong>NH₄⁻</strong> (Ammonium)</li>
                  <li><strong>none</strong> - Neutral mass [M]</li>
                </ul>

                <p><strong>Tip:</strong> You can select multiple adducts. The tool will generate separate results for each, displayed as [M+H]⁺, [M+Na]⁺, etc.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#s2mStep4" aria-expanded="false" aria-controls="s2mStep4">
                Step 4 - Non-canonical amino acids used
              </button>
            </h2>
            <div id="s2mStep4" class="accordion-collapse collapse" data-bs-parent="#s2mAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image44.png" alt="ncAA Selection" class="img-fluid rounded" />
                </div>
                <p>Assign non-canonical amino acids to specific codons for genetic code expansion experiments.</p>
                <ol>
                  <li>Select the ncAA used for translation from pre-defined ncAAs
                    <div class="alert alert-warning mt-2">
                      If not already defined, draw and save your ncAA structures in the "My ncAAs" tab (see section "My ncAA")
                    </div>
                    <div class="text-center my-2">
                      <img src="/manual/image45.png" alt="ncAA List" class="img-fluid rounded" />
                    </div>
                  </li>
                  <li>Click the "Add Codon" and select codons for the ncAA in the codon table
                    <div class="text-center my-2">
                      <img src="/manual/image46.png" alt="Codon Table" class="img-fluid rounded" />
                    </div>
                    <div class="alert alert-info mt-2">
                      <ul class="mb-0">
                        <li>Multiple codons can be assigned to one ncAA</li>
                        <li>The same codon can be assigned to different ncAAs (all possibilities will be calculated)</li>
                      </ul>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#s2mStep5" aria-expanded="false" aria-controls="s2mStep5">
                Step 5 - Potential modification
              </button>
            </h2>
            <div id="s2mStep5" class="accordion-collapse collapse" data-bs-parent="#s2mAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image47.png" alt="Potential Modification" class="img-fluid rounded" />
                </div>
                <p>Apply custom chemical modifications to your peptides (post-translational modifications or chemical reactions).</p>
                <ol>
                  <li>Click the "Select" box</li>
                  <li>Select up to pre-defined potential modifications from your saved library.
                    <div class="text-center my-2">
                      <img src="/manual/image48.png" alt="Modification List" class="img-fluid rounded" />
                    </div>
                    <div class="alert alert-warning mt-2">
                      If not already defined, draw and save your ncAA structures in the "Potential modification" tab (see section "Potential modification")
                    </div>
                  </li>
                  <li>You can select up to 4 modifications</li>
                </ol>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#s2mStep6" aria-expanded="false" aria-controls="s2mStep6">
                Step 6 - Calculate mass
              </button>
            </h2>
            <div id="s2mStep6" class="accordion-collapse collapse" data-bs-parent="#s2mAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image49.png" alt="Calculate Mass" class="img-fluid rounded" />
                </div>
                <ol>
                  <li>Click "Calculate mass" to generate all possible peptide containing ncAAs masses.</li>
                  <li>If you want to include byproducts generated by ncAA-related translational errors in the results, enable the "Potential Byproduct" option.</li>
                </ol>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#s2mStep7" aria-expanded="false" aria-controls="s2mStep7">
                Step 7 - Results
              </button>
            </h2>
            <div id="s2mStep7" class="accordion-collapse collapse" data-bs-parent="#s2mAccordion">
              <div class="accordion-body">
                <p><strong>Results include:</strong></p>
                <ul>
                  <li><strong>Sequence:</strong> Amino acid sequence with ncAAs and modification markers</li>
                  <li><strong>Monoisotopic Weight:</strong> Most accurate mass for MS analysis</li>
                  <li><strong>Molecular Weight:</strong> Average mass considering isotope distribution</li>
                  <li><strong>Adduct:</strong> Selected ion adducts ([M+H]⁺, [M+Na]⁺, etc.)</li>
                  <li><strong>Note:</strong> When the "Potential Byproduct" option is enabled, a note is added, and results generated by the following events are also included:
                    <ul>
                      <li><strong>Ribosome skipping:</strong> Codon assigned to an ncAA is skipped, resulting in shorter peptide.</li>
                      <li><strong>Reinitiation:</strong> Translation restarts at a downstream site, producing N-terminally truncated peptides (restart can occur at or after the ncAA region).</li>
                      <li><strong>Premature termination:</strong> Translation terminates before or at the ncAA region, producing C-terminally truncated peptides.</li>
                      <li><strong>Potential modifications:</strong> Peptides reflecting user-defined chemical or enzymatic modifications.</li>
                      <li><strong>None:</strong> No translational error or potential modifications occur.</li>
                    </ul>
                  </li>
                </ul>
                <p><strong>Tip:</strong> The results can be sorted by mass or sequence length in ascending or descending order by clicking the top of the results table.</p>
                <div class="text-center my-3">
                  <img src="/manual/image50.png" alt="Results Table" class="img-fluid rounded" />
                </div>
                <p><strong>Tip:</strong> To view only the results generated by specific events, use the Filter function.</p>
                <div class="text-center my-3">
                  <img src="/manual/image51.png" alt="Filter Function" class="img-fluid rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Mass to Sequence (M2S) Section -->
  <section id="m2s" class="mb-5">
    <div class="card">
      <div class="card-body">
        <h2 class="section-title">Mass to Sequence (M2S)</h2>
        <div class="text-center my-3">
          <img src="/manual/image52.png" alt="M2S" class="img-fluid rounded" />
        </div>

        <p class="card-text">
          <strong>Purpose:</strong> Predict possible peptide sequences from an observed mass spectrometry peak.
        </p>

        <div class="alert alert-info">
          <strong>When to use:</strong> This is particularly useful when you:
          <ul class="mb-0 mt-2">
            <li>Detect unassigned peaks in your MS data</li>
            <li>Want to identify potential peptide sequences matching a specific mass</li>
            <li>Have partial sequence information to narrow down possibilities</li>
            <li>Need to validate or identify translation products</li>
          </ul>
        </div>

        <div class="alert alert-warning">
          <strong>Important:</strong> Providing as much known information as possible (RNA sequence, fixed regions, amino acid pool) significantly improves prediction accuracy and reduces computation time.
        </div>

        <!-- Accordion for M2S Steps -->
        <div class="accordion mt-4" id="m2sAccordion">
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep1" aria-expanded="true" aria-controls="m2sStep1">
                Step 1 - Enter the 'Detected mass'
              </button>
            </h2>
            <div id="m2sStep1" class="accordion-collapse collapse show" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image53.png" alt="Detected Mass Input" class="img-fluid rounded" />
                </div>
                <p><strong>Enter the observed mass</strong> from your mass spectrometry peak (required).</p>
                <p><strong>Tips for best results:</strong></p>
                <ul>
                  <li>Use the monoisotopic mass (most intense peak in the isotope cluster)</li>
                  <li>Verify that the mass spectrometer calibration is correct and that mass errors are within an acceptable range.</li>
                  <li>If you selected an adduct, enter the mass including the adduct (e.g., for [M+Na]⁺, enter M+22.99)</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep2" aria-expanded="false" aria-controls="m2sStep2">
                Step 2 - Enter the 'Fixed sequence' (Optional)
              </button>
            </h2>
            <div id="m2sStep2" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image54.png" alt="Fixed Sequence" class="img-fluid rounded" />
                </div>
                <p>Enter peptide sequence regions expected to be preserved, such as affinity tags.</p>
                <p><strong>Benefits:</strong></p>
                <ul>
                  <li>All predicted sequences will contain this fixed region</li>
                  <li>Dramatically reduces search space and improves accuracy</li>
                  <li>Useful when you have partial sequence information from tandem MS</li>
                </ul>
                <p><strong>Example:</strong> If you know the peptide contains <code>MSTINM</code>, enter this sequence and the algorithm will only generate sequences containing this subsequence.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep3" aria-expanded="false" aria-controls="m2sStep3">
                Step 3 - RNA Sequence used (Optional)
              </button>
            </h2>
            <div id="m2sStep3" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image55.png" alt="RNA Sequence" class="img-fluid rounded" />
                </div>
                <p>Enter the RNA sequence used for translation if known.</p>
                <p><strong>Why this helps:</strong></p>
                <ul>
                  <li>Sequences similar to the theoretically translated peptide sequence derived from the input RNA sequence are prioritized for identification.</li>
                </ul>
                <p><strong>Tip:</strong> Sequences are saved locally for reuse</p>
                <ul>
                  <li><img src="/manual/image40.png" alt="Save" class="tool-icon" /> <strong>Save:</strong> Sequences are saved locally for reuse</li>
                  <li><img src="/manual/image41.png" alt="Load" class="tool-icon" /> <strong>Load:</strong> Previously saved sequences are loaded for use.</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep4" aria-expanded="false" aria-controls="m2sStep4">
                Step 4 - Formylation
              </button>
            </h2>
            <div id="m2sStep4" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image56.png" alt="Formylation" class="img-fluid rounded" />
                </div>
                <p>Specify if N-terminal formylation is present.</p>
                <p><strong>Options:</strong></p>
                <ul>
                  <li><strong>Yes:</strong> All predicted sequences include formylation (adds 27.99 Da to mass, denoted as 'f')</li>
                  <li><strong>No:</strong> No formylation is applied to the predicted sequences.</li>
                  <li><strong>Unknown:</strong> both formylated and non-formylated sequences are considered.</li>
                </ul>
                <p><strong>Background:</strong> In bacterial translation and some eukaryotic organelles, "the start codon, AUG" encodes formyl-methionine (fMet) instead of methionine. This adds a formyl group (CHO) to the N-terminus.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep5" aria-expanded="false" aria-controls="m2sStep5">
                Step 5 - Adduct Selection
              </button>
            </h2>
            <div id="m2sStep5" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image57.png" alt="Adduct Selection" class="img-fluid rounded" />
                </div>
                <p>Select the ion adduct observed in your MS peak.</p>
                <div class="text-center my-3">
                  <img src="/manual/image58.png" alt="Adduct Options" class="img-fluid rounded" />
                </div>
                <p>The algorithm will account for the adduct mass when predicting sequences</p>
                <p><strong>Tip:</strong> [M+H]⁺ is the most common adduct in positive mode in MALDI-ToF</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep6" aria-expanded="false" aria-controls="m2sStep6">
                Step 6 - Simulated Annealing Iterations
              </button>
            </h2>
            <div id="m2sStep6" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image59.png" alt="SA Mode" class="img-fluid rounded" />
                </div>
                <p>Adjust the <strong>number of iterations</strong> of the simulated annealing algorithm with the slider. Benchmarking showed that the initial temperature has no meaningful effect on results &mdash; only the iteration count does &mdash; so the temperature is now fixed and only iterations are exposed. Drag the cursor for fine (non-linear) control:</p>
                <div class="table-responsive">
                  <table class="table table-bordered">
                    <thead class="table-light">
                      <tr>
                        <th>Slider position</th>
                        <th>Iterations</th>
                        <th>Best For</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Fast</strong> (far left)</td>
                        <td>100</td>
                        <td>Quick searches, low masses, or when an RNA sequence is provided</td>
                      </tr>
                      <tr>
                        <td><strong>Standard</strong> (center, default)</td>
                        <td>1,000</td>
                        <td>Balanced accuracy and speed &mdash; recommended starting point</td>
                      </tr>
                      <tr>
                        <td><strong>Deep think</strong> (far right)</td>
                        <td>50,000</td>
                        <td>Maximum accuracy for high masses or complex sequences (may take tens of seconds or more)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>The value box on the right shows the current iteration count; you can also type a value directly. A speed hint indicates the approximate time relative to Standard.</p>
                <p><strong>Result Count:</strong> Choose how many top results to display (20, 50, or 100).</p>
                <p><strong>Recommendation:</strong> Start at <strong>Standard</strong>. If results aren't satisfactory, slide toward <strong>Deep think</strong> for a more exhaustive search.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep7" aria-expanded="false" aria-controls="m2sStep7">
                Step 7 - Amino Acids set
              </button>
            </h2>
            <div id="m2sStep7" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image42.png" alt="Amino Acids Set" class="img-fluid rounded" />
                </div>
                <p>Select which amino acids to include peptide sequences expressed in rCFSs.</p>
                <p><strong>Why narrow the search?</strong></p>
                <ul>
                  <li>Reduces computational complexity</li>
                  <li>Improves result quality by excluding amino acids not used in translation</li>
                </ul>
                <p><strong>Tip:</strong> Keep all amino acids selected unless you have specific reasons to exclude some.</p>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep8" aria-expanded="false" aria-controls="m2sStep8">
                Step 8 - Non-Canonical Amino Acids used (Optional)
              </button>
            </h2>
            <div id="m2sStep8" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image44.png" alt="ncAA Selection" class="img-fluid rounded" />
                </div>
                <p><strong>Click the Select button, then enter the ncAAs used in the rCFSs</strong></p>
                <p>The algorithm will consider these ncAAs as possible building blocks.</p>
                <p><strong>Tip:</strong> Only select ncAAs that were actually present in your translation system.</p>
                <div class="text-center my-3">
                  <img src="/manual/image60.png" alt="ncAA Selected" class="img-fluid rounded" />
                </div>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep9" aria-expanded="false" aria-controls="m2sStep9">
                Step 9 - Predict sequences
              </button>
            </h2>
            <div id="m2sStep9" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image61.png" alt="Predict Sequences" class="img-fluid rounded" />
                </div>
                <p>Click 'Predict sequences' to start the prediction.</p>
                <p><strong>Results include:</strong></p>
                <ul>
                  <li><strong>Monoisotopic/Molecular Weight:</strong> Calculated mass</li>
                  <li><strong>Sequence:</strong> Predicted amino acid sequence</li>
                  <li><strong>Adduct:</strong> An adduct attached to the calculated peptide based on your MS peak</li>
                  <li><strong>Sequence Similarity:</strong> If an RNA sequence is provided, sequence similarity (%) between the translated peptide and the M2S-calculated peptide</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#m2sStep10" aria-expanded="false" aria-controls="m2sStep10">
                Step 10 - Data Management
              </button>
            </h2>
            <div id="m2sStep10" class="accordion-collapse collapse" data-bs-parent="#m2sAccordion">
              <div class="accordion-body">
                <div class="text-center my-3">
                  <img src="/manual/image62.png" alt="Data Management" class="img-fluid rounded" />
                </div>
                <p><strong>Interpreting results:</strong> Top results are sorted by a combined score. Look for sequences with both high mass accuracy and high sequence similarity (if RNA was provided).</p>
                <p><strong>Tip:</strong> Set 'Max Result Count' to specify the maximum number of results to get</p>
                <div class="text-center my-3">
                  <img src="/manual/image63.png" alt="Max Result Count" class="img-fluid rounded" />
                </div>
                <ul>
                  <li><strong>Max Result Count:</strong> Choose how many top results to display (20, 50, or 100).</li>
                  <li>Click 'Download Excel' to export the displayed data.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Troubleshooting -->
        <div class="card mt-4">
          <div class="card-header">
            <h5 class="mb-0">Troubleshooting</h5>
          </div>
          <div class="card-body">
            <h6><strong>S2M returns too many results:</strong></h6>
            <ul>
              <li>Deselect amino acids that weren't present in your experiment</li>
              <li>Limit the number of selected 'Potential Modifications'</li>
              <li>Check if ncAA codon assignments are correct</li>
            </ul>

            <h6 class="mt-3"><strong>M2S doesn't find good matches:</strong></h6>
            <ul>
              <li>Increase the iteration count by sliding toward Deep think</li>
              <li>Verify accurately detected mass</li>
              <li>Double-check the adduct selection</li>
              <li>Provide RNA sequence if available</li>
              <li>Verify that the formylation setting is correct</li>
            </ul>

            <h6 class="mt-3"><strong>Mass doesn't match expected value:</strong></h6>
            <ul>
              <li>Verify ncAA structures are drawn correctly</li>
              <li>Check if water loss is being calculated correctly (because of peptide bond formation)</li>
              <li>Ensure adduct mass is included/excluded appropriately</li>
              <li>Confirm that the modification structures are accurate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
    max-width: 1200px;
  }

  .card {
    margin-bottom: 2rem;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .card-body {
    padding: 2rem;
  }

  .accordion-button {
    font-weight: bold;
  }

  .accordion-body {
    line-height: 1.7;
  }

  .table {
    margin-top: 1rem;
  }

  code {
    background-color: #f8f9fa;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
  }

  .tool-icon {
    height: 24px;
    vertical-align: middle;
    margin-right: 5px;
  }

  .img-fluid {
    max-width: 100%;
    height: auto;
  }

  .manual-nav {
    position: sticky;
    top: 56px; /* 사이트 메인 네비게이션 높이 아래에 위치 */
    z-index: 1010; /* 메인 네비게이션(1020)보다 낮게 설정 */
  }

  .section-title {
    font-size: 2rem;
    font-weight: 700;
    color: #0d6efd;
    border-bottom: 3px solid #0d6efd;
    padding-bottom: 0.75rem;
    margin-bottom: 1.5rem;
  }

  /* Mobile responsive */
  @media (max-width: 767px) {
    .section-title {
      font-size: 1.5rem;
      padding-bottom: 0.5rem;
      margin-bottom: 1rem;
    }

    .container {
      margin-top: 0 !important;
      margin-bottom: 1rem !important;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }

    .navbar {
      padding: 0.5rem 1rem;
    }

    .navbar-brand {
      font-size: 1rem;
    }

    .nav-link {
      font-size: 0.9rem;
      padding: 0.5rem;
    }

    .card {
      margin-bottom: 1rem;
      border-radius: 8px;
    }

    .card-body {
      padding: 1rem;
    }

    .card-title {
      font-size: 1.5rem;
    }

    h2 {
      font-size: 1.5rem;
    }

    h5, h6 {
      font-size: 1rem;
    }

    .accordion-button {
      font-size: 0.95rem;
      padding: 0.75rem 1rem;
    }

    .accordion-body {
      font-size: 0.9rem;
      padding: 1rem;
    }

    .alert {
      font-size: 0.9rem;
      padding: 0.75rem;
    }

    .table {
      font-size: 0.85rem;
    }

    code {
      font-size: 0.85rem;
      padding: 1px 4px;
    }

    ul, ol {
      padding-left: 1.25rem;
    }

    .ms-3 {
      margin-left: 0.75rem !important;
    }

    .tool-icon {
      height: 20px;
    }
  }

  /* Tablet */
  @media (min-width: 768px) and (max-width: 1023px) {
    .card-body {
      padding: 1.5rem;
    }

    .accordion-button {
      font-size: 1rem;
    }

    .accordion-body {
      font-size: 0.95rem;
    }
  }

  /* Table horizontal scroll (mobile) */
  @media (max-width: 767px) {
    .table-responsive {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .table {
      min-width: 400px;
    }
  }
</style>
