// Position state for each amino acid in the peptide sequence visualization
export type PositionState = 'green' | 'yellow' | 'red';

// A single ncAA zone: the red position and its yellow neighborhood extents
export interface NcAAZone {
    ncaaIndex: number;         // Index of the red (ncAA) position
    leftYellowCount: number;   // Number of yellow positions to the left (default 1, min 0)
    rightYellowCount: number;  // Number of yellow positions to the right (default 1, min 0)
}

// A contiguous fixed (green) segment within the sequence
export interface FixedSegment {
    startIndex: number;   // Start index in the full sequence
    sequence: string;     // The amino acid sequence (e.g., "MW", "EK", "T")
}

// A contiguous variable (red+yellow) gap between fixed segments
export interface GapSegment {
    startIndex: number;        // Start index in the full sequence
    length: number;            // Number of positions SA needs to fill
    originalSequence: string;  // Original amino acids at these positions (for reference/similarity)
}

// Complete template describing the sequence structure for calculation
export interface SequenceTemplate {
    fullSequence: string;              // Full translated peptide (e.g., "MWSHPQFEKST")
    positionStates: PositionState[];   // State of each position
    fixedSegments: FixedSegment[];     // Green segments (ordered by startIndex)
    gapSegments: GapSegment[];         // Red+yellow segments (ordered by startIndex)
    totalLength: number;               // fullSequence.length
    gapTotalLength: number;            // Sum of all gap lengths
}
