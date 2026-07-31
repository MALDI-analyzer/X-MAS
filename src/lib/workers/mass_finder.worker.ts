import { MassFinderHelper } from '../helper/mass_finder_helper';

self.onmessage = (e) => {
  const {
    detectedMass,
    knownSequence,
    proteinSequence,
    formylation,
    adduct,
    monoisotopicMap,
    molecularMap,
    initialTemperature = 10000,
    absoluteTemperature = 0.00001,
    saIterations = 100,
    coolingRate,
    evaluateWeights,
    sortWeights,
    sequenceTemplate
  } = e.data;

  try {
    let solutions;

    if (sequenceTemplate && sequenceTemplate.gapTotalLength > 0) {
      // Template 기반 계산: 다중 고정 세그먼트 + 갭
      solutions = MassFinderHelper.calcByIonTypeWithTemplate(
        detectedMass,
        sequenceTemplate,
        formylation,
        adduct,
        monoisotopicMap,
        molecularMap,
        initialTemperature,
        absoluteTemperature,
        saIterations,
        coolingRate,
        evaluateWeights,
        sortWeights
      );
    } else {
      // 기존 계산: 단일 고정 시퀀스 (하위 호환)
      solutions = MassFinderHelper.calcByIonType(
        detectedMass,
        knownSequence,
        formylation,
        adduct,
        monoisotopicMap,
        molecularMap,
        proteinSequence,
        initialTemperature,
        absoluteTemperature,
        saIterations,
        coolingRate,
        evaluateWeights,
        sortWeights
      );
    }

    self.postMessage({ type: 'success', solutions });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};
