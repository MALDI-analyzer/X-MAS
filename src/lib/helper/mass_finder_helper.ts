import { AminoModel } from '../model/AminoModel';

import type { IonType, FormyType } from '../../type/Types';
import type { FixedSegment, GapSegment } from '../../type/SequenceTemplate';

import { calculateSimilarity, calculateSequenceSimilarity, calculateSequenceSimilarityWithCounts, sortAmino, removeDuplicates, removeSingleFSequences, processKnownSequenceOverlap } from './mass_util';
import { getIonWeight, codonTableRtoS } from './amino_mapper';
import { logger } from '../utils/logger';
import {
    SIMULATED_ANNEALING_CONFIG,
    CHEMICAL_CONSTANTS,
    REFERENCE_SEQUENCE_CONFIG,
} from '../config/algorithm.config';
import { SA_EVALUATE_WEIGHTS, SORT_WEIGHTS } from '../config/scoring.config';

export interface FixedSeqWeights {
    massDiff: number;
    seqDiff: number;
}

/**
 * 매스 파인더 핵심로직
 * 시뮬레이티드 어닐링 알고리즘을 사용해 입력된 mass에 사용된 아미노산을 추측해 결과를 도출한다.
 * [FormyType] 과 [IonType] 값에 따라 분기가 나뉘며 unknown 이면 계산할 범위가 커져 가능하면 지정하는것을 추천함
 *
 * 이전 버전과의 호환성을 위해 static 메서드를 유지하지만, 내부적으로는 인스턴스를 생성하여 사용합니다.
 */
export class MassFinderHelper {
    // Instance variables (이전 module-level 변수들)
    private dataMap: { [key: string]: number } = {};
    private moleMap: { [key: string]: number } = {};
    private referenceSequence: string = '';
    private formyType: FormyType = 'unknown';
    private ionType: IonType = 'unknown';
    private topSolutionsCount: number = SIMULATED_ANNEALING_CONFIG.TOP_SOLUTIONS_COUNT;
    private coolingRate: number = SIMULATED_ANNEALING_CONFIG.COOLING_RATE;
    private evaluateWeights: FixedSeqWeights = {
        massDiff: SA_EVALUATE_WEIGHTS.NORMALIZED_MASS_DIFF,
        seqDiff: SA_EVALUATE_WEIGHTS.SEQUENCE_DIFF,
    };
    private sortWeights: FixedSeqWeights = {
        massDiff: SORT_WEIGHTS.MASS_ACCURACY,
        seqDiff: SORT_WEIGHTS.SEQUENCE_SIMILARITY,
    };

    // 이온 타입이 적용된 이후 생긴 함수
    // [targetMass] : 목표 무게
    // [initAminos] : 필수로 들어가는 아미노산의 string 입력값
    // [fomyType] : 포밀레이스가 들어가는지에 대한 값, 포밀레이스는 항상 결과물의 제일 앞에 붙음
    // [ionType] : 이온이 들어가는지에 대한 값
    // [aminoMap] : 계산에 사용되는 아미노산의 모음
    // [proteinSequence] : 초기 솔루션으로 사용할 단백질/RNA 시퀀스 (선택사항)
    // [initialTemperature] : 시뮬레이티드 어닐링 초기 온도
    // [absoluteTemperature] : 시뮬레이티드 어닐링 최소 온도
    // [saIterations] : 시뮬레이티드 어닐링 반복 횟수
    // 최종적으로 AminoModel의 리스트를 리턴함
    calcByIonType(targetMass: number, initAminos: string, fomyType: FormyType, ionType: IonType, aminoMap: { [key: string]: number }, molecularMap: { [key: string]: number }, proteinSequence?: string, initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE, absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE, saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS, coolingRate?: number, evaluateWeights?: FixedSeqWeights, sortWeights?: FixedSeqWeights): AminoModel[] {
        if (coolingRate !== undefined) this.coolingRate = coolingRate;
        if (evaluateWeights) this.evaluateWeights = evaluateWeights;
        if (sortWeights) this.sortWeights = sortWeights;
        this.ionType = ionType;
        let bestSolutions: AminoModel[] = [];
        bestSolutions = this.calc(targetMass - getIonWeight(this.ionType), initAminos, fomyType, ionType, aminoMap, molecularMap, proteinSequence, initialTemperature, absoluteTemperature, saIterations)
            .map(e => new AminoModel({
                ...e,
                weight: (e.weight ?? 0) + getIonWeight(this.ionType),
                molecularWeight: (e.molecularWeight ?? 0) + getIonWeight(this.ionType),
                similarity: calculateSimilarity(targetMass, (e.weight ?? 0) + getIonWeight(this.ionType))
            }));
        return bestSolutions;
    }

    // Static wrapper for backward compatibility
    static calcByIonType(targetMass: number, initAminos: string, fomyType: FormyType, ionType: IonType, aminoMap: { [key: string]: number }, molecularMap: { [key: string]: number }, proteinSequence?: string, initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE, absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE, saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS, coolingRate?: number, evaluateWeights?: FixedSeqWeights, sortWeights?: FixedSeqWeights): AminoModel[] {
        const instance = new MassFinderHelper();
        return instance.calcByIonType(targetMass, initAminos, fomyType, ionType, aminoMap, molecularMap, proteinSequence, initialTemperature, absoluteTemperature, saIterations, coolingRate, evaluateWeights, sortWeights);
    }

    /// calcByIonType 함수에서 이온값에따라 알아서 구분되어 호출되는 함수
    calc(targetMass: number, initAminos: string, fomyType: FormyType, ionType: IonType, aminoMap: { [key: string]: number }, molecularMap: { [key: string]: number }, proteinSequence?: string, initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE, absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE, saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS): AminoModel[] {
        this.formyType = fomyType;
        this.dataMap = { ...aminoMap };
        this.moleMap = { ...molecularMap };

        // 참조 시퀀스 설정 및 Fixed sequence와의 중복 처리
        let processedInitAminos = initAminos;
        if (proteinSequence) {
            const isRnaSequence = /^[AUGC]+$/.test(proteinSequence) && proteinSequence.length % 3 === 0;
            const rnaConvertedSequence = isRnaSequence ? this.convertRnaToAminoAcids(proteinSequence) : proteinSequence;

            // Fixed sequence와 RNA 변환 시퀀스 간의 중복 처리
            const overlapResult = processKnownSequenceOverlap(initAminos, rnaConvertedSequence);

            // 처리된 Fixed sequence 사용
            processedInitAminos = overlapResult.finalKnownSequence;

            // 참조 시퀀스는 중복 제거된 나머지 RNA 시퀀스와 Fixed sequence 결합
            if (overlapResult.remainingRnaSequence) {
                this.referenceSequence = processedInitAminos + overlapResult.remainingRnaSequence;
            } else {
                this.referenceSequence = rnaConvertedSequence; // 원본 RNA 변환 시퀀스 사용
            }
        } else {
            this.referenceSequence = '';
        }

        let bestSolutions: AminoModel[] = [];
        const initAminoWeight = this.getInitAminoWeight(processedInitAminos);
        targetMass -= initAminoWeight.monoisotopicWeight;

        // targetMass가 매우 작거나 음수인 경우 (Fixed sequence만으로 충분한 경우)
        // 추가 아미노산이 필요 없으므로 빈 시퀀스 반환
        if (targetMass <= 1.0 && processedInitAminos) {
            const emptyWeight = this.getMonoisotopicWeightSum("");
            const emptyMolWeight = this.getMolecularWeightSum("");
            bestSolutions.push(new AminoModel({ code: "", weight: emptyWeight, molecularWeight: emptyMolWeight }));
        } else {
            const [minRange, maxRange] = this.getMinMaxRange(this.formyType, targetMass);

            for (let i = minRange; i < maxRange; i++) {
                // i > 0일 때는 Fixed sequence와 추가 아미노산 사이의 펩타이드 결합 물 분자 추가
                const connectionWater = (processedInitAminos && i > 0) ? CHEMICAL_CONSTANTS.WATER_WEIGHT : 0;
                const addWeight = this.getWaterWeight(i) + connectionWater;
                let solutions = this.calcByFType(this.formyType, targetMass + addWeight, i, proteinSequence, initialTemperature, absoluteTemperature, saIterations);
                solutions = removeDuplicates(solutions);
                solutions = removeSingleFSequences(solutions);
                bestSolutions = bestSolutions.concat(solutions);
            }
        }

        // 전체 결과에 대해 다시 한 번 중복 제거 (강화된 중복 제거)
        bestSolutions = removeDuplicates(bestSolutions);
        bestSolutions = sortAmino(bestSolutions, targetMass, this.referenceSequence, this.sortWeights).slice(0, this.topSolutionsCount);
        bestSolutions = this.setInitAminoToResult(bestSolutions, processedInitAminos, initAminoWeight);
        bestSolutions = this.setMetaData(bestSolutions, this.formyType, ionType, processedInitAminos);
        bestSolutions = this.setSequenceSimilarity(bestSolutions);

        bestSolutions.forEach(solution => {
            logger.debug(`SA Result: sequence=${solution.code}, weight=${solution.weight}`);
        });

        return bestSolutions;
    }

    // Static wrapper for backward compatibility
    static calc(targetMass: number, initAminos: string, fomyType: FormyType, ionType: IonType, aminoMap: { [key: string]: number }, molecularMap: { [key: string]: number }, proteinSequence?: string, initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE, absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE, saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS): AminoModel[] {
        const instance = new MassFinderHelper();
        return instance.calc(targetMass, initAminos, fomyType, ionType, aminoMap, molecularMap, proteinSequence, initialTemperature, absoluteTemperature, saIterations);
    }

    // calc 함수에서 호출되는 함수
    // FormyType 값에 따라 솔루션을 각각 구해와서 전달하는 역할을 한다.
    // preserveLength: SA 가 길이를 유지해야 하는지 여부 (template/gap 모드 전용)
    calcByFType(fType: FormyType, targetMass: number, seqLength: number, proteinSequence?: string, initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE, absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE, saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS, preserveLength: boolean = false): AminoModel[] {
        const bestSolutions: AminoModel[] = [];
        for (let i = 0; i < saIterations; i++) {
            switch (fType) {
                case 'no': // 포밀레이스 없으면 무게 안빼고 계산해도됨
                    const solutionNo = this.simulatedAnnealing(targetMass, seqLength, proteinSequence, initialTemperature, absoluteTemperature, preserveLength);
                    const seqsN = Object.keys(solutionNo)[0];
                    const weightN = this.getMonoisotopicWeightSum(seqsN);
                    const molecularWeightN = this.getMolecularWeightSum(seqsN);
                    bestSolutions.push(new AminoModel({ code: Object.keys(solutionNo)[0], weight: weightN, molecularWeight: molecularWeightN }));
                    break;
                case 'yes': // 포밀레이스 있으면 무게를 빼고 계산후 가장 앞에 'f' 붙여줌
                    const solutionYes = this.simulatedAnnealing(targetMass - CHEMICAL_CONSTANTS.FORMYLATION_WEIGHT, seqLength, proteinSequence, initialTemperature, absoluteTemperature, preserveLength);
                    const seqsY = `f${Object.keys(solutionYes)[0]}`;
                    const weightY = this.getMonoisotopicWeightSum(seqsY);
                    const molecularWeightY = this.getMolecularWeightSum(seqsY);
                    bestSolutions.push(new AminoModel({ code: `f${Object.keys(solutionYes)[0]}`, weight: weightY, molecularWeight: molecularWeightY }));
                    break;
                case 'unknown': // 포밀레이스 있는지 없는지 몰라서 둘다 계산해야함
                    const solutionUnknown1 = this.simulatedAnnealing(targetMass, seqLength, proteinSequence, initialTemperature, absoluteTemperature, preserveLength);
                    const solutionUnknown2 = this.simulatedAnnealing(targetMass - CHEMICAL_CONSTANTS.FORMYLATION_WEIGHT, seqLength, proteinSequence, initialTemperature, absoluteTemperature, preserveLength);
                    const seqsU1 = Object.keys(solutionUnknown1)[0];
                    const seqsU2 = `f${Object.keys(solutionUnknown2)[0]}`;
                    const weightU1 = this.getMonoisotopicWeightSum(seqsU1);
                    const weightU2 = this.getMonoisotopicWeightSum(seqsU2);
                    const molecularWeightU1 = this.getMolecularWeightSum(seqsU1);
                    const molecularWeightU2 = this.getMolecularWeightSum(seqsU2);
                    bestSolutions.push(new AminoModel({ code: Object.keys(solutionUnknown1)[0], weight: weightU1, molecularWeight: molecularWeightU1 }));
                    bestSolutions.push(new AminoModel({ code: `f${Object.keys(solutionUnknown2)[0]}`, weight: weightU2, molecularWeight: molecularWeightU2 }));
                    break;
            }
        }
        return bestSolutions;
    }

    // Static wrapper for backward compatibility
    static calcByFType(fType: FormyType, targetMass: number, seqLength: number, proteinSequence?: string, initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE, absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE, saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS, preserveLength: boolean = false): AminoModel[] {
        const instance = new MassFinderHelper();
        return instance.calcByFType(fType, targetMass, seqLength, proteinSequence, initialTemperature, absoluteTemperature, saIterations, preserveLength);
    }

    /// 핵심로직으로 랜덤한 값과 그 랜던값에서 조금 바꾼 다른 값을 계속 비교해 나가면서 최적의 해를 찾음
    /// preserveLength=true 면 neighborSolution 의 트림을 건너뛰고 길이 고정 (template/gap 모드용).
    simulatedAnnealing(targetMass: number, seqLength: number, proteinSequence?: string, initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE, absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE, preserveLength: boolean = false): { [key: string]: number } {
        let temperature = initialTemperature;
        // 1차 비교군을 위한 조합 추출해서 목표값과의 차이 저장
        let currentSolution = proteinSequence ? this.proteinBasedSolution(proteinSequence, seqLength) : this.randomSolution(seqLength);
        let currentEnergy = this.evaluate(currentSolution, targetMass);
        // 1차 비교군을 베스트로지정해놓음
        let bestSolution = [...currentSolution];
        let bestEnergy = currentEnergy;

        // 초기온도에 계속해서 냉각률을 곱해서 최소온도가 될때까지 반복해서 최적의 해를 구함
        while (temperature > absoluteTemperature) {
            // 기존 조합을 기준으로 새로운 조합 추출
            const newSolution = this.neighborSolution(currentSolution, targetMass, preserveLength);
            const newEnergy = this.evaluate(newSolution, targetMass);

            // 새 조합이 합격되는지 체크
            if (this.acceptanceProbability(currentEnergy, newEnergy, temperature) > Math.random()) {
                currentSolution = newSolution;
                currentEnergy = newEnergy;
            }

            // 새 조합이 목표값과의 차이가 더 적으면 새로운 베스트로 셋팅
            if (currentEnergy < bestEnergy) {
                bestSolution = [...currentSolution];
                bestSolution.sort();
                bestEnergy = currentEnergy;
            }

            temperature *= this.coolingRate;
        }

        return { [bestSolution.join('')]: bestEnergy };
    }

    // Static wrapper for backward compatibility
    static simulatedAnnealing(targetMass: number, seqLength: number, proteinSequence?: string, initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE, absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE, preserveLength: boolean = false): { [key: string]: number } {
        const instance = new MassFinderHelper();
        return instance.simulatedAnnealing(targetMass, seqLength, proteinSequence, initialTemperature, absoluteTemperature, preserveLength);
    }

    // 초기에 사용될 기준이 되는 조합을 랜덤으로 만드는 함수 (다양성 개선, 선택된 아미노산만 사용)
    randomSolution(seqLength: number): string[] {
        const solution: string[] = [];
        const aminoKeys = Object.keys(this.dataMap);

        // 선택된 아미노산이 없으면 빈 배열 반환
        if (aminoKeys.length === 0) return solution;

        while (solution.length < seqLength) {
            // 가중치 기반 선택으로 다양성 증대 (선택된 아미노산 중에서만)
            let aminoAcid: string;
            // 사용 가능한 아미노산들 중 랜덤으로 선택
            aminoAcid = aminoKeys[Math.floor(Math.random() * aminoKeys.length)];
            solution.push(aminoAcid);
        }
        return solution;
    }

    // Static wrapper for backward compatibility
    static randomSolution(seqLength: number): string[] {
        const instance = new MassFinderHelper();
        return instance.randomSolution(seqLength);
    }

    // RNA 시퀀스를 아미노산으로 변환하는 함수.
    // v2.1: ncAA codon 치환 + position override + stop suppression 지원.
    //  - excludedAA: Amino acids set 에서 해제된 natural AA letter 집합. 해당 codon 의 natural 이 이 집합에 있고
    //    ncaaCodonMap 에 후보가 있으면 자동 치환.
    //  - ncaaCodonMap: codon → 후보 ncAA 배열 (슬롯 letter 순 정렬됨). 첫 후보가 기본 적용.
    //  - positionOverrides: 사용자가 팝오버에서 직접 선택한 letter. 무조건 우선.
    //  - stop codon 에 ncAA 가 할당된 경우: amber/ochre/opal suppression 패턴으로 break 우회.
    convertRnaToAminoAcids(
        rnaSequence: string,
        options?: {
            excludedAA?: Set<string>;
            ncaaCodonMap?: { [codon: string]: Array<{ letter: string }> };
            positionOverrides?: { [position: number]: string };
        }
    ): string {
        if (!rnaSequence) return '';

        const codons = rnaSequence.match(/.{1,3}/g) || [];
        const excluded = options?.excludedAA ?? new Set<string>();
        const codonMap = options?.ncaaCodonMap ?? {};
        const overrides = options?.positionOverrides ?? {};

        let aminoSequence = '';

        for (let i = 0; i < codons.length; i++) {
            const codon = codons[i];
            if (codon.length !== 3) continue;

            // 사용자 override 가 있으면 무조건 우선
            if (overrides[i] !== undefined) {
                aminoSequence += overrides[i];
                continue;
            }

            const natural = (codonTableRtoS as { [k: string]: string })[codon];
            const candidates = codonMap[codon] ?? [];

            if (natural === '[Stop]') {
                if (candidates.length > 0) {
                    // Suppression: stop 자리에 ncAA 치환 후 번역 계속
                    aminoSequence += candidates[0].letter;
                } else {
                    break; // 기존 동작: stop 만나면 중단
                }
            } else if (natural && excluded.has(natural) && candidates.length > 0) {
                // 자연 AA 가 set 에서 제외되었고 ncAA 후보 존재 → 자동 치환 (첫 후보)
                aminoSequence += candidates[0].letter;
            } else if (natural) {
                aminoSequence += natural;
            }
        }

        return aminoSequence;
    }

    // Static wrapper for backward compatibility
    static convertRnaToAminoAcids(
        rnaSequence: string,
        options?: {
            excludedAA?: Set<string>;
            ncaaCodonMap?: { [codon: string]: Array<{ letter: string }> };
            positionOverrides?: { [position: number]: string };
        }
    ): string {
        const instance = new MassFinderHelper();
        return instance.convertRnaToAminoAcids(rnaSequence, options);
    }

    // 단백질/RNA 시퀀스를 기반으로 초기 솔루션을 생성하는 함수
    proteinBasedSolution(inputSequence: string, seqLength: number): string[] {
        // RNA 시퀀스인지 확인 (A, U, G, C로만 구성되고 3의 배수 길이)
        const isRnaSequence = /^[AUGC]+$/.test(inputSequence) && inputSequence.length % 3 === 0;

        // RNA 시퀀스면 아미노산으로 변환
        const aminoSequence = isRnaSequence ? this.convertRnaToAminoAcids(inputSequence) : inputSequence;

        // 선택된 아미노산만 사용하도록 필터링
        const availableAminos = Object.keys(this.dataMap);
        const solution: string[] = [];

        // 초기 아미노산 시퀀스에서 사용 가능한 아미노산만 추가
        const validAminosFromSequence: string[] = [];
        for (const amino of aminoSequence.split('')) {
            if (this.dataMap[amino]) {
                solution.push(amino);
                validAminosFromSequence.push(amino);
            }
        }

        // seqLength에 맞춰 시퀀스 조정
        if (solution.length < seqLength) {
            // aminoSequence 길이가 seqLength보다 짧으면 aminoSequence에서 랜덤으로 추가
            while (solution.length < seqLength && validAminosFromSequence.length > 0) {
                const randomAmino = validAminosFromSequence[Math.floor(Math.random() * validAminosFromSequence.length)];
                solution.push(randomAmino);
            }
            // 만약 validAminosFromSequence가 비어있으면 availableAminos에서 선택 (폴백)
            while (solution.length < seqLength) {
                const randomAmino = availableAminos[Math.floor(Math.random() * availableAminos.length)];
                solution.push(randomAmino);
            }
        } else if (solution.length > seqLength) {
            // aminoSequence 길이가 seqLength보다 길면 랜덤으로 제거
            while (solution.length > seqLength) {
                const randomIndex = Math.floor(Math.random() * solution.length);
                solution.splice(randomIndex, 1);
            }
        }
        // solution.length === seqLength인 경우는 그대로 유지

        return solution;
    }

    // Static wrapper for backward compatibility
    static proteinBasedSolution(inputSequence: string, seqLength: number): string[] {
        const instance = new MassFinderHelper();
        return instance.proteinBasedSolution(inputSequence, seqLength);
    }

    // 기존 선택된 조합에서 아미노산을 새걸로 갈아치워서 새로운 조합 생성 (참조 시퀀스 고려, 다양성 개선)
    // preserveLength=true 이면 길이 고정 (template/gap 모드용). 트림 단계 스킵.
    neighborSolution(currentSolution: string[], targetMass: number, preserveLength: boolean = false): string[] {
        const newSolution = [...currentSolution];
        const availableAminos = Object.keys(this.dataMap);

        const index = Math.floor(Math.random() * newSolution.length);
        let newAminoAcid: string;

        // 참조 시퀀스가 있는 경우 참조 시퀀스의 아미노산을 우선적으로 선택
        if (this.referenceSequence) {
            // 설정된 확률로 참조 시퀀스에서 아미노산 선택
            if (Math.random() < REFERENCE_SEQUENCE_CONFIG.USE_PROBABILITY && this.referenceSequence.length > 0) {
                // 참조 시퀀스에서 무작위로 아미노산 선택
                const refIndex = Math.floor(Math.random() * this.referenceSequence.length);
                const candidateAmino = this.referenceSequence[refIndex];

                // 선택된 아미노산이 사용 가능한 아미노산 목록에 있는지 확인
                if (this.dataMap[candidateAmino]) {
                    newAminoAcid = candidateAmino;
                } else {
                    // 사용 불가능하면 선택된 아미노산 중에서 랜덤 선택
                    newAminoAcid = availableAminos[Math.floor(Math.random() * availableAminos.length)];
                }
            } else {
                // 선택된 아미노산 중에서 랜덤 선택
                newAminoAcid = availableAminos[Math.floor(Math.random() * availableAminos.length)];
            }
        } else {
            // 참조 시퀀스가 없는 경우 선택된 아미노산 중에서 랜덤 선택
            newAminoAcid = availableAminos[Math.floor(Math.random() * availableAminos.length)];
        }

        newSolution[index] = newAminoAcid;

        // Template/gap 모드 (preserveLength=true) 에서는 gapLen 이 정확히 유지돼야 하므로
        // 트림 단계를 건너뛴다. 트림이 발생하면 SS->BS->BB 같은 경로의 중간 상태가
        // saTargetMass 를 살짝 초과할 때 길이가 줄어들어 BB 에 도달할 수 없게 된다.
        if (preserveLength) return newSolution;

        // 질량이 목표값을 초과하는 경우 아미노산 제거 (가변 길이 모드 전용)
        let currentMass = newSolution.reduce((sum, amino) => sum + (this.dataMap[amino] ?? 0), 0);
        while (currentMass > targetMass && newSolution.length > 0) {
            newSolution.splice(Math.floor(Math.random() * newSolution.length), 1);
        }
        return newSolution;
    }

    // Static wrapper for backward compatibility
    static neighborSolution(currentSolution: string[], targetMass: number, preserveLength: boolean = false): string[] {
        const instance = new MassFinderHelper();
        return instance.neighborSolution(currentSolution, targetMass, preserveLength);
    }

    // 도출된 솔루션의 전체 질량과 목표값의 차이 도출 (시퀀스 유사도 고려)
    evaluate(solution: string[], targetMass: number): number {
        const mass = solution.reduce((sum, gene) => sum + (this.dataMap[gene] ?? 0), 0);
        const massDifference = Math.abs(targetMass - mass);

        // 참조 시퀀스가 있는 경우 시퀀스 유사도도 고려
        if (this.referenceSequence) {
            const currentSequence = solution.join('');
            const sequenceSimilarity = calculateSequenceSimilarity(currentSequence, this.referenceSequence);

            // 시퀀스 유사도를 역수로 변환 (높을수록 좋음 -> 낮을수록 좋음)
            const sequenceDifference = (100 - sequenceSimilarity) / 100;

            // 분자량 차이를 정규화 (큰 값을 방지하기 위해)
            const normalizedMassDiff = massDifference / targetMass;

            // 복합 평가 점수 계산 - difference 값 우선시
            return normalizedMassDiff * this.evaluateWeights.massDiff + sequenceDifference * this.evaluateWeights.seqDiff;
        }

        // 참조 시퀀스가 없는 경우 기존 방식대로 분자량 차이만 고려
        return massDifference;
    }

    // Static wrapper for backward compatibility
    static evaluate(solution: string[], targetMass: number): number {
        const instance = new MassFinderHelper();
        return instance.evaluate(solution, targetMass);
    }

    // newEnergy < currentEnergy 이면 합격
    // currentEnergy 가 작아도 exp 함수에 따라 자연로그 e의 currentEnergy - newEnergy 승을 현재 온도로 나눠서 합격할수도 있음
    acceptanceProbability(currentEnergy: number, newEnergy: number, temperature: number): number {
        return newEnergy < currentEnergy ? 1.0 : Math.exp((currentEnergy - newEnergy) / temperature);
    }

    // Static wrapper for backward compatibility
    static acceptanceProbability(currentEnergy: number, newEnergy: number, temperature: number): number {
        const instance = new MassFinderHelper();
        return instance.acceptanceProbability(currentEnergy, newEnergy, temperature);
    }

    // 넘어온 code로 무게를 계산하고 포멜레이스 포함이면 그 무게까지 더해줌
    getMonoisotopicWeightSum(solutionCombine: string): number {
        if (solutionCombine.startsWith('f')) {
            // 포밀레이션이 있는 경우: f를 제외한 아미노산들만 계산
            const aminoSequence = solutionCombine.slice(1);
            let result = aminoSequence.split('').reduce((sum, e) => sum + (this.dataMap[e] ?? 0), 0);
            // 아미노산들만의 물 증발량 계산 (포밀레이션은 물 증발량에 포함되지 않음)
            result -= this.getWaterWeight(aminoSequence.length);
            // 포밀레이션 무게 추가
            result += CHEMICAL_CONSTANTS.FORMYLATION_WEIGHT;
            return result;
        } else {
            // 포밀레이션이 없는 경우: 모든 아미노산 계산
            let result = solutionCombine.split('').reduce((sum, e) => sum + (this.dataMap[e] ?? 0), 0);
            result -= this.getWaterWeight(solutionCombine.length);
            return result;
        }
    }

    // Static wrapper for backward compatibility
    static getMonoisotopicWeightSum(solutionCombine: string): number {
        const instance = new MassFinderHelper();
        return instance.getMonoisotopicWeightSum(solutionCombine);
    }

    getMolecularWeightSum(solutionCombine: string): number {
        if (solutionCombine.startsWith('f')) {
            // 포밀레이션이 있는 경우: f를 제외한 아미노산들만 계산
            const aminoSequence = solutionCombine.slice(1);
            let result = aminoSequence.split('').reduce((sum, e) => sum + (this.moleMap[e] ?? 0), 0);
            // 아미노산들만의 물 증발량 계산 (포밀레이션은 물 증발량에 포함되지 않음)
            result -= this.getWaterWeight(aminoSequence.length);
            // 포밀레이션 무게 추가
            result += CHEMICAL_CONSTANTS.FORMYLATION_WEIGHT;
            return result;
        } else {
            // 포밀레이션이 없는 경우: 모든 아미노산 계산
            let result = solutionCombine.split('').reduce((sum, e) => sum + (this.moleMap[e] ?? 0), 0);
            result -= this.getWaterWeight(solutionCombine.length);
            return result;
        }
    }

    // Static wrapper for backward compatibility
    static getMolecularWeightSum(solutionCombine: string): number {
        const instance = new MassFinderHelper();
        return instance.getMolecularWeightSum(solutionCombine);
    }

    getWaterWeight(aminoLength: number): number {
        if (aminoLength === 0) return 0;
        return CHEMICAL_CONSTANTS.WATER_WEIGHT * (aminoLength - 1);
    }

    // Static wrapper for backward compatibility
    static getWaterWeight(aminoLength: number): number {
        const instance = new MassFinderHelper();
        return instance.getWaterWeight(aminoLength);
    }

    // 물 증발량 계산을위해 가능한 아미노산의 갯수 범위를 산정힘
    getMinMaxRange(type: FormyType, targetMass: number): [number, number] {
        // 사용 가능한 아미노산의 종류들의 최대 최소 값
        const minValue = Math.min(...Object.values(this.dataMap));
        const maxValue = Math.max(...Object.values(this.dataMap));
        // 포밀레이스가 들어갈수도 있다면 FORMYLATION_WEIGHT 값이 제일 작은값
        const max = type === 'yes' || type === 'unknown' ? Math.ceil(targetMass / CHEMICAL_CONSTANTS.FORMYLATION_WEIGHT) : Math.ceil(targetMass / minValue);
        const min = Math.floor(targetMass / maxValue);
        return [min, max];
    }

    // Static wrapper for backward compatibility
    static getMinMaxRange(type: FormyType, targetMass: number): [number, number] {
        const instance = new MassFinderHelper();
        return instance.getMinMaxRange(type, targetMass);
    }

    // 초기 입력된 아미노산의 총 무게에서 물 증발량을 제거한 값
    getInitAminoWeight(initAmino: string): { monoisotopicWeight: number, molecularWeight: number } {
        // Fixed sequence 내부 펩타이드 결합에 대한 물 증발량만 계산
        // (추가 아미노산과의 연결은 calc() 함수에서 별도 처리)
        const initAminoWaterWeight = this.getWaterWeight(initAmino.length);
        let initAminoMonoisotopicWeight = 0;
        let initAminoMolecularWeight = 0;
        if (initAmino) {
            for (const i of initAmino.split('')) {
                initAminoMonoisotopicWeight += this.dataMap[i] ?? 0;
                initAminoMolecularWeight += this.moleMap[i] ?? 0;
            }
        }
        return {
            monoisotopicWeight: initAminoMonoisotopicWeight - initAminoWaterWeight,
            molecularWeight: initAminoMolecularWeight - initAminoWaterWeight
        };
    }

    // Static wrapper for backward compatibility
    static getInitAminoWeight(initAmino: string): { monoisotopicWeight: number, molecularWeight: number } {
        const instance = new MassFinderHelper();
        return instance.getInitAminoWeight(initAmino);
    }

    /// 기존 베스트 솔루션 에서 init 값을 앞에 붙여주는 로직
    setInitAminoToResult(bestSolutions: AminoModel[], initAmino: string, initAminoWeight: { monoisotopicWeight: number, molecularWeight: number }): AminoModel[] {
        if (!initAmino) return bestSolutions;
        return bestSolutions.map(item => {
            const weight = (item.weight ?? 0) + initAminoWeight.monoisotopicWeight;
            const molecularWeight = (item.molecularWeight ?? 0) + initAminoWeight.molecularWeight;
            if (!item.code) {
                return new AminoModel({ ...item, code: initAmino, weight: weight, molecularWeight: molecularWeight });
            } else {
                const firstString = item.code[0];
                if (firstString === 'f') {
                    return new AminoModel({ ...item, code: `f${initAmino}${item.code.slice(1)}`, weight: weight, molecularWeight: molecularWeight });
                } else {
                    return new AminoModel({ ...item, code: `${initAmino}${item.code}`, weight: weight, molecularWeight: molecularWeight });
                }
            }
        });
    }

    // Static wrapper for backward compatibility
    static setInitAminoToResult(bestSolutions: AminoModel[], initAmino: string, initAminoWeight: { monoisotopicWeight: number, molecularWeight: number }): AminoModel[] {
        const instance = new MassFinderHelper();
        return instance.setInitAminoToResult(bestSolutions, initAmino, initAminoWeight);
    }

    /// FormyType, IonType, essential seq 붙여주는 부분
    setMetaData(bestSolutions: AminoModel[], formyType: FormyType, ionType: IonType, essentialSeq: string): AminoModel[] {
        return bestSolutions.map(e => new AminoModel({ ...e, formyType, ionType, essentialSeq }));
    }

    // Static wrapper for backward compatibility
    static setMetaData(bestSolutions: AminoModel[], formyType: FormyType, ionType: IonType, essentialSeq: string): AminoModel[] {
        const instance = new MassFinderHelper();
        return instance.setMetaData(bestSolutions, formyType, ionType, essentialSeq);
    }

    /// 참조 시퀀스가 있는 경우 시퀀스 유사도 계산하여 추가
    setSequenceSimilarity(bestSolutions: AminoModel[]): AminoModel[] {
        if (!this.referenceSequence) {
            // 참조 시퀀스가 없는 경우 그대로 반환
            return bestSolutions;
        }

        return bestSolutions.map(solution => {
            const similarityData = calculateSequenceSimilarityWithCounts(solution.code ?? '', this.referenceSequence);
            return new AminoModel({
                ...solution,
                sequenceSimilarity: Math.round(similarityData.similarity * 100) / 100, // 소수점 2자리로 반올림
                matchedCount: similarityData.matchedCount,
                totalCount: similarityData.totalCount
            });
        });
    }

    // Static wrapper for backward compatibility
    static setSequenceSimilarity(bestSolutions: AminoModel[]): AminoModel[] {
        const instance = new MassFinderHelper();
        return instance.setSequenceSimilarity(bestSolutions);
    }

    // ============================================================
    // Template-based calculation (다중 고정 세그먼트 + 갭)
    // ============================================================

    /**
     * Template 기반 계산의 진입점 (이온 타입 처리 포함)
     * RNA에서 번역된 펩타이드의 고정/변경 영역 정보를 받아서 갭 위치만 SA로 탐색
     */
    calcByIonTypeWithTemplate(
        targetMass: number,
        templateData: {
            fullSequence: string;
            positionStates: string[];
            fixedSegments: FixedSegment[];
            gapSegments: GapSegment[];
            totalLength: number;
            gapTotalLength: number;
        },
        fomyType: FormyType,
        ionType: IonType,
        aminoMap: { [key: string]: number },
        molecularMap: { [key: string]: number },
        initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE,
        absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE,
        saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS,
        coolingRate?: number,
        evaluateWeights?: FixedSeqWeights,
        sortWeights?: FixedSeqWeights
    ): AminoModel[] {
        if (coolingRate !== undefined) this.coolingRate = coolingRate;
        if (evaluateWeights) this.evaluateWeights = evaluateWeights;
        if (sortWeights) this.sortWeights = sortWeights;
        this.ionType = ionType;
        const ionWeight = getIonWeight(this.ionType);

        let bestSolutions = this.calcWithTemplate(
            targetMass - ionWeight,
            templateData,
            fomyType,
            aminoMap,
            molecularMap,
            initialTemperature,
            absoluteTemperature,
            saIterations
        ).map(e => new AminoModel({
            ...e,
            weight: (e.weight ?? 0) + ionWeight,
            molecularWeight: (e.molecularWeight ?? 0) + ionWeight,
            similarity: calculateSimilarity(targetMass, (e.weight ?? 0) + ionWeight)
        }));

        return bestSolutions;
    }

    // Static wrapper
    static calcByIonTypeWithTemplate(
        targetMass: number,
        templateData: {
            fullSequence: string;
            positionStates: string[];
            fixedSegments: FixedSegment[];
            gapSegments: GapSegment[];
            totalLength: number;
            gapTotalLength: number;
        },
        fomyType: FormyType,
        ionType: IonType,
        aminoMap: { [key: string]: number },
        molecularMap: { [key: string]: number },
        initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE,
        absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE,
        saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS,
        coolingRate?: number,
        evaluateWeights?: FixedSeqWeights,
        sortWeights?: FixedSeqWeights
    ): AminoModel[] {
        const instance = new MassFinderHelper();
        return instance.calcByIonTypeWithTemplate(targetMass, templateData, fomyType, ionType, aminoMap, molecularMap, initialTemperature, absoluteTemperature, saIterations, coolingRate, evaluateWeights, sortWeights);
    }

    /**
     * Template 기반 핵심 계산
     *
     * 기존 calc()와 동일하게 갭 길이를 min~max 범위로 반복하며 SA를 실행.
     * 갭 영역의 아미노산 개수는 고정이 아니라, 남은 질량에 따라 가변.
     *
     * 수식:
     *   totalMass = fixedRawMass + gapRawSum - (fixedCount + gapLen - 1) * WATER [+ formylation]
     *   gapRawSum = targetMass + (fixedCount + gapLen - 1) * WATER - fixedRawMass
     */
    calcWithTemplate(
        targetMass: number,
        templateData: {
            fullSequence: string;
            positionStates: string[];
            fixedSegments: FixedSegment[];
            gapSegments: GapSegment[];
            totalLength: number;
            gapTotalLength: number;
        },
        fomyType: FormyType,
        aminoMap: { [key: string]: number },
        molecularMap: { [key: string]: number },
        initialTemperature: number = SIMULATED_ANNEALING_CONFIG.INITIAL_TEMPERATURE,
        absoluteTemperature: number = SIMULATED_ANNEALING_CONFIG.ABSOLUTE_TEMPERATURE,
        saIterations: number = SIMULATED_ANNEALING_CONFIG.DEFAULT_ITERATIONS
    ): AminoModel[] {
        this.formyType = fomyType;
        this.dataMap = { ...aminoMap };
        this.moleMap = { ...molecularMap };

        // 고정 세그먼트 분석
        let fixedRawMass = 0;
        let fixedCount = 0;
        for (const segment of templateData.fixedSegments) {
            for (const amino of segment.sequence) {
                fixedRawMass += this.dataMap[amino] ?? 0;
                fixedCount++;
            }
        }

        // 각 고정 세그먼트 내부의 물 증발량 합산
        let totalFixedInternalWater = 0;
        for (const segment of templateData.fixedSegments) {
            totalFixedInternalWater += this.getWaterWeight(segment.sequence.length);
        }
        const fixedNetMass = fixedRawMass - totalFixedInternalWater;

        // 갭 참조 시퀀스: SA가 원본 갭 아미노산 조성을 참고하도록
        const gapReferenceSequence = templateData.gapSegments.map(g => g.originalSequence).join('');
        this.referenceSequence = gapReferenceSequence;

        // Edge case: 갭 세그먼트가 정의되지 않으면 원본 시퀀스 그대로 반환
        if (templateData.gapSegments.length === 0) {
            const fullCode = templateData.fullSequence;
            const weight = this.getMonoisotopicWeightSum(fullCode);
            const molecularWeight = this.getMolecularWeightSum(fullCode);
            return [new AminoModel({ code: fullCode, weight, molecularWeight })];
        }

        // 남은 질량 = targetMass - 고정 세그먼트의 순 질량 (기존 calc의 adjustedTarget과 동일)
        const adjustedTarget = targetMass - fixedNetMass;

        // 기존 calc()와 동일하게 가능한 갭 길이 범위를 계산하여 반복
        const [minGapLen, maxGapLenBase] = this.getMinMaxRange(this.formyType, adjustedTarget);

        // getMinMaxRange 는 아미노산 "전체" 질량(물 포함)으로 나눠 최대 갭 길이를 구하지만,
        // 갭에 들어가는 각 잔기는 펩타이드 결합마다 물 한 분자를 잃는다(아래 saTargetMass 가 addWeight 로
        // 되돌려 준다). 이 때문에 adjustedTarget 이 가장 가벼운 아미노산 질량보다 작으면 maxGapLen 이 1 이
        // 되어 gapLen=0(빈 갭)만 시도되고, 실제로는 잔기 하나가 들어가야 할 갭이 통째로 비어버린다
        // (heavy ncAA 벤치마크 버그). 잔기 질량(전체 질량 - 물) 기준으로 상한을 보정한다.
        // 항상 기존 값 이상이므로(더 작은 수로 나눔) 기존 template 결과를 줄이지 않는다.
        const minAminoMass = Math.min(...Object.values(this.dataMap));
        const residueMinMass = Math.max(1, minAminoMass - CHEMICAL_CONSTANTS.WATER_WEIGHT);
        const maxGapLen = Math.max(maxGapLenBase, Math.ceil(adjustedTarget / residueMinMass));

        let bestSolutions: AminoModel[] = [];

        // Edge case: 고정 질량이 목표를 초과하면 갭 없이 고정만으로 반환
        if (adjustedTarget <= 1.0 && fixedCount > 0) {
            const fixedOnlyCode = templateData.fixedSegments.map(s => s.sequence).join('');
            const weight = this.getMonoisotopicWeightSum(fixedOnlyCode);
            const molecularWeight = this.getMolecularWeightSum(fixedOnlyCode);
            bestSolutions.push(new AminoModel({ code: '', weight, molecularWeight }));
        }

        for (let gapLen = minGapLen; gapLen < maxGapLen; gapLen++) {
            if (gapLen < 0) continue;

            // gapLen=0이면 갭 아미노산 없이 고정 세그먼트만으로 구성
            if (gapLen === 0 && fixedCount > 0) {
                const fixedOnlyCode = templateData.fixedSegments.map(s => s.sequence).join('');
                const emptyWeight = this.getMonoisotopicWeightSum(fixedOnlyCode);
                const emptyMolWeight = this.getMolecularWeightSum(fixedOnlyCode);
                bestSolutions.push(new AminoModel({ code: '', weight: emptyWeight, molecularWeight: emptyMolWeight }));
                continue;
            }

            // SA 목표 질량 계산
            // 전체 시퀀스 길이 = fixedCount + gapLen
            // 전체 물 증발 = (fixedCount + gapLen - 1) * WATER
            // addWeight = 전체 물 증발 - 고정 내부 물 증발
            //           = (gapLen - 1 + numFixedSegments) * WATER
            // (다중 고정 세그먼트의 연결 수를 정확히 반영)
            const totalWater = this.getWaterWeight(fixedCount + gapLen);
            const addWeight = totalWater - totalFixedInternalWater;
            const saTargetMass = adjustedTarget + addWeight;

            if (saTargetMass <= 0) continue;

            let solutions = this.calcByFType(
                this.formyType,
                saTargetMass,
                gapLen,
                gapReferenceSequence,
                initialTemperature,
                absoluteTemperature,
                saIterations,
                true  // preserveLength: gap 길이 고정
            );
            solutions = removeDuplicates(solutions);
            solutions = removeSingleFSequences(solutions);
            bestSolutions = bestSolutions.concat(solutions);
        }

        // 전체 결과 중복 제거
        bestSolutions = removeDuplicates(bestSolutions);

        // 템플릿 재조립: 고정 세그먼트 사이에 SA 결과를 비례 분배
        // (이 단계에서 weight가 full sequence 기준으로 재계산됨)
        bestSolutions = this.assembleTemplateResult(bestSolutions, templateData, fixedNetMass);

        // 재조립된 full code 기준으로 중복 제거 및 정렬
        // gap weight 기준으로 미리 정렬하면 numSegments*WATER offset 때문에
        // 화면에 보이는 Difference 순서와 어긋나므로 반드시 재조립 이후에 정렬한다
        bestSolutions = removeDuplicates(bestSolutions);
        this.referenceSequence = templateData.fullSequence;
        bestSolutions = sortAmino(bestSolutions, targetMass, this.referenceSequence, this.sortWeights)
            .slice(0, this.topSolutionsCount);

        const fixedSeqDisplay = templateData.fixedSegments.map(s => s.sequence).join('~');
        bestSolutions = this.setMetaData(bestSolutions, this.formyType, this.ionType, fixedSeqDisplay);
        bestSolutions = this.setSequenceSimilarity(bestSolutions);

        bestSolutions.forEach(solution => {
            logger.debug(`Template SA Result: sequence=${solution.code}, weight=${solution.weight}`);
        });

        return bestSolutions;
    }

    /**
     * SA 결과를 템플릿에 맞게 전체 시퀀스로 재조립
     *
     * 갭 길이가 가변이므로, SA가 찾은 아미노산을 각 갭 세그먼트에 비례 분배.
     * 예: 원래 갭 [3, 3] + SA 결과 4개 → [2, 2]로 분배
     */
    assembleTemplateResult(
        solutions: AminoModel[],
        templateData: {
            fullSequence: string;
            positionStates: string[];
            fixedSegments: FixedSegment[];
            gapSegments: GapSegment[];
            totalLength: number;
        },
        fixedNetMass: number
    ): AminoModel[] {
        const gaps = templateData.gapSegments;
        const fixed = templateData.fixedSegments;
        const totalOriginalGapLen = gaps.reduce((sum, g) => sum + g.length, 0);

        // 고정/갭 세그먼트를 startIndex 순서로 정렬된 파트 목록 생성
        const parts: Array<{ type: 'fixed' | 'gap'; index: number; startIndex: number }> = [];
        fixed.forEach((f, i) => parts.push({ type: 'fixed', index: i, startIndex: f.startIndex }));
        gaps.forEach((g, i) => parts.push({ type: 'gap', index: i, startIndex: g.startIndex }));
        parts.sort((a, b) => a.startIndex - b.startIndex);

        return solutions.map(solution => {
            const gapAminos = solution.code || '';
            const hasFormylation = gapAminos.startsWith('f');
            const cleanGapAminos = hasFormylation ? gapAminos.slice(1) : gapAminos;
            const totalGapAminos = cleanGapAminos.length;

            // 갭 아미노산을 원래 갭 크기 비율로 분배
            let distributed = 0;
            const gapDistribution = gaps.map((g, idx) => {
                if (totalOriginalGapLen === 0 || totalGapAminos === 0) return 0;
                if (idx === gaps.length - 1) {
                    return totalGapAminos - distributed; // 마지막 갭이 나머지 흡수
                }
                const share = Math.round(totalGapAminos * g.length / totalOriginalGapLen);
                distributed += share;
                return share;
            });

            // 파트 순서대로 조립
            let fullCode = '';
            let gapOffset = 0;

            for (const part of parts) {
                if (part.type === 'fixed') {
                    fullCode += fixed[part.index].sequence;
                } else {
                    const count = gapDistribution[part.index] || 0;
                    fullCode += cleanGapAminos.substring(gapOffset, gapOffset + count);
                    gapOffset += count;
                }
            }

            if (hasFormylation) {
                fullCode = 'f' + fullCode;
            }

            // 전체 시퀀스 기준으로 질량 재계산
            const weight = this.getMonoisotopicWeightSum(fullCode);
            const molecularWeight = this.getMolecularWeightSum(fullCode);

            return new AminoModel({ ...solution, code: fullCode, weight, molecularWeight });
        });
    }

    /**
     * 다중 고정 세그먼트의 순 질량 계산 (각 세그먼트 내부 물 증발 포함)
     * 기존 getInitAminoWeight와 동일한 역할, 다중 세그먼트 대응
     */
    getMultiSegmentFixedWeight(fixedSegments: FixedSegment[]): { monoisotopicWeight: number, molecularWeight: number } {
        let monoWeight = 0;
        let molWeight = 0;
        for (const segment of fixedSegments) {
            const internalWater = this.getWaterWeight(segment.sequence.length);
            for (const amino of segment.sequence) {
                monoWeight += this.dataMap[amino] ?? 0;
                molWeight += this.moleMap[amino] ?? 0;
            }
            monoWeight -= internalWater;
            molWeight -= internalWater;
        }
        return { monoisotopicWeight: monoWeight, molecularWeight: molWeight };
    }
}