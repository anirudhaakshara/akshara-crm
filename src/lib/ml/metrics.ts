/**
 * Binary classification metrics.
 */

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  auc: number;
  confusionMatrix: ConfusionMatrix;
}

export function confusionMatrix(yTrue: readonly number[], probs: readonly number[], threshold: number = 0.5): ConfusionMatrix {
  const cm: ConfusionMatrix = { tp: 0, fp: 0, tn: 0, fn: 0 };
  yTrue.forEach((y, i) => {
    const pred = probs[i] >= threshold ? 1 : 0;
    if (pred === 1 && y === 1) cm.tp++;
    else if (pred === 1 && y === 0) cm.fp++;
    else if (pred === 0 && y === 0) cm.tn++;
    else cm.fn++;
  });
  return cm;
}

/**
 * ROC AUC via the rank-sum (Mann–Whitney U) formulation; ties get the average rank.
 * Returns 0.5 when only one class is present.
 */
export function rocAuc(yTrue: readonly number[], probs: readonly number[]): number {
  const pairs = yTrue.map((y, i) => ({ y, p: probs[i] })).sort((a, b) => a.p - b.p);
  const nPos = pairs.filter((x) => x.y === 1).length;
  const nNeg = pairs.length - nPos;
  if (nPos === 0 || nNeg === 0) return 0.5;

  let rankSumPos = 0;
  let i = 0;
  while (i < pairs.length) {
    let j = i;
    while (j + 1 < pairs.length && pairs[j + 1].p === pairs[i].p) j++;
    const avgRank = (i + j) / 2 + 1; // ranks are 1-based
    for (let k = i; k <= j; k++) if (pairs[k].y === 1) rankSumPos += avgRank;
    i = j + 1;
  }
  return (rankSumPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

export function classificationMetrics(yTrue: readonly number[], probs: readonly number[], threshold: number = 0.5): ClassificationMetrics {
  const cm = confusionMatrix(yTrue, probs, threshold);
  const total = cm.tp + cm.fp + cm.tn + cm.fn;
  return {
    accuracy: total ? (cm.tp + cm.tn) / total : 0,
    precision: cm.tp + cm.fp ? cm.tp / (cm.tp + cm.fp) : 0,
    recall: cm.tp + cm.fn ? cm.tp / (cm.tp + cm.fn) : 0,
    auc: rocAuc(yTrue, probs),
    confusionMatrix: cm,
  };
}
