import { DealStage, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { featureColumns, selectTopIndustries, extractFeatures } from "@/lib/ml/features";
import {
  fitStandardizer,
  predictProba,
  standardize,
  trainLogisticRegression,
} from "@/lib/ml/logisticRegression";
import { classificationMetrics } from "@/lib/ml/metrics";
import { stratifiedKFold, stratifiedSplit } from "@/lib/ml/split";
import { dealFeatureSelect, toFeatureInput } from "@/features/ml/server/dataset";
import { rescoreOpenDeals } from "@/features/ml/server/inference";
import {
  MIN_CLOSED_DEALS,
  type StoredFeatureStats,
  type StoredMetrics,
  type StoredWeights,
} from "@/features/ml/types";

export const HYPERPARAMETERS = {
  learningRate: 0.1,
  iterations: 3000,
  l2: 0.01,
  testRatio: 0.2,
  seed: 42,
} as const;

export class InsufficientDataError extends Error {
  constructor(public closedDeals: number) {
    super(`Need at least ${MIN_CLOSED_DEALS} closed deals to train; found ${closedDeals}.`);
  }
}

export interface TrainingOutcome {
  modelVersionId: string;
  metrics: StoredMetrics;
  rescoredOpenDeals: number;
}

/**
 * Trains on closed deals (WON = 1, LOST = 0), evaluates on a stratified 20% hold-out,
 * stores the new ModelVersion as the only active one, then rescores all open deals.
 */
export async function trainAndActivate(): Promise<TrainingOutcome> {
  const rows = await prisma.deal.findMany({
    where: { stage: { in: [DealStage.WON, DealStage.LOST] }, closedAt: { not: null } },
    select: dealFeatureSelect,
    // Deterministic order (ids are random UUIDs/cuids) so the seeded split is identical in every environment.
    orderBy: [{ closedAt: "asc" }, { value: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  if (rows.length < MIN_CLOSED_DEALS) throw new InsufficientDataError(rows.length);

  const industries = selectTopIndustries(rows.map((r) => r.company?.industry ?? null));
  const spec = { industries };
  const columns = featureColumns(spec);
  const X = rows.map((r) => extractFeatures(toFeatureInput(r), r.closedAt as Date, spec));
  const y: number[] = rows.map((r) => (r.stage === DealStage.WON ? 1 : 0));

  const { train, test } = stratifiedSplit(y, HYPERPARAMETERS.testRatio, HYPERPARAMETERS.seed);
  const Xtrain = train.map((i) => X[i]);
  const ytrain = train.map((i) => y[i]);
  const standardizer = fitStandardizer(Xtrain);
  const result = trainLogisticRegression(standardize(Xtrain, standardizer), ytrain, HYPERPARAMETERS);

  const Ztest = standardize(test.map((i) => X[i]), standardizer);
  const ytest = test.map((i) => y[i]);
  const testMetrics = classificationMetrics(ytest, Ztest.map((row) => predictProba(result.model, row)));
  const trainMetrics = classificationMetrics(
    ytrain,
    standardize(Xtrain, standardizer).map((row) => predictProba(result.model, row))
  );

  // Cross-validated estimate (same features and hyperparameters, 5 stratified folds).
  const folds = stratifiedKFold(y, 5, HYPERPARAMETERS.seed).map(({ train: tr, test: te }) => {
    const s = fitStandardizer(tr.map((i) => X[i]));
    const m = trainLogisticRegression(standardize(tr.map((i) => X[i]), s), tr.map((i) => y[i]), HYPERPARAMETERS).model;
    return classificationMetrics(
      te.map((i) => y[i]),
      standardize(te.map((i) => X[i]), s).map((row) => predictProba(m, row))
    );
  });
  const cvAccuracy = folds.reduce((sum, f) => sum + f.accuracy, 0) / folds.length;
  const cvAuc = folds.reduce((sum, f) => sum + f.auc, 0) / folds.length;

  const weights: StoredWeights = { columns, weights: result.model.weights, bias: result.model.bias };
  const featureStats: StoredFeatureStats = { mean: standardizer.mean, std: standardizer.std, industries };
  const metrics: StoredMetrics = {
    accuracy: testMetrics.accuracy,
    precision: testMetrics.precision,
    recall: testMetrics.recall,
    auc: testMetrics.auc,
    confusionMatrix: testMetrics.confusionMatrix,
    trainAccuracy: trainMetrics.accuracy,
    cvAccuracy,
    cvAuc,
    trainSize: train.length,
    testSize: test.length,
    positiveRate: y.reduce((s, v) => s + v, 0) / y.length,
    iterations: result.iterations,
    finalLoss: result.lossHistory[result.lossHistory.length - 1],
    hyperparameters: { ...HYPERPARAMETERS },
  };

  const [, created] = await prisma.$transaction([
    prisma.modelVersion.updateMany({ where: { name: "deal-win", isActive: true }, data: { isActive: false } }),
    prisma.modelVersion.create({
      data: {
        name: "deal-win",
        weights: weights as unknown as Prisma.InputJsonValue,
        featureStats: featureStats as unknown as Prisma.InputJsonValue,
        metrics: metrics as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    }),
  ]);

  const rescoredOpenDeals = await rescoreOpenDeals({ id: created.id, weights, stats: featureStats });
  return { modelVersionId: created.id, metrics, rescoredOpenDeals };
}
