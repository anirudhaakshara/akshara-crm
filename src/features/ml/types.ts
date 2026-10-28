import type { FeatureColumn } from "@/lib/ml/features";
import type { ConfusionMatrix } from "@/lib/ml/metrics";
import type { ScoreFactor } from "@/lib/ml/explain";

/** Shape of ModelVersion.weights */
export interface StoredWeights {
  columns: FeatureColumn[];
  weights: number[];
  bias: number;
}

/** Shape of ModelVersion.featureStats */
export interface StoredFeatureStats {
  mean: number[];
  std: number[];
  industries: string[];
}

/** Shape of ModelVersion.metrics */
export interface StoredMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  auc: number;
  trainAccuracy: number;
  /** Mean over a stratified 5-fold cross-validation — a steadier estimate than one 40-row hold-out. */
  cvAccuracy: number;
  cvAuc: number;
  trainSize: number;
  testSize: number;
  positiveRate: number;
  confusionMatrix: ConfusionMatrix;
  iterations: number;
  finalLoss: number;
  hyperparameters: { learningRate: number; iterations: number; l2: number; testRatio: number; seed: number };
}

/** Shape of Deal.scoreFactors */
export interface StoredScoreFactors {
  modelVersionId: string;
  scoredAt: string;
  factors: ScoreFactor[];
}

export const MIN_CLOSED_DEALS = 30;
export const HOT_THRESHOLD = 0.7;
export const WARM_THRESHOLD = 0.4;

export type ScoreBand = "HOT" | "WARM" | "COLD";

export function scoreBand(p: number): ScoreBand {
  if (p >= HOT_THRESHOLD) return "HOT";
  if (p >= WARM_THRESHOLD) return "WARM";
  return "COLD";
}
