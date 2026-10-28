import { DealStage, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { featureColumns, snapshotFeatures, vectorize } from "@/lib/ml/features";
import { standardizeRow } from "@/lib/ml/logisticRegression";
import { explainScore } from "@/lib/ml/explain";
import { dealFeatureSelect, toFeatureInput, type DealFeatureRow } from "@/features/ml/server/dataset";
import {
  MIN_CLOSED_DEALS,
  type StoredFeatureStats,
  type StoredScoreFactors,
  type StoredWeights,
} from "@/features/ml/types";

export interface LoadedModel {
  id: string;
  weights: StoredWeights;
  stats: StoredFeatureStats;
}

const CLOSED: DealStage[] = [DealStage.WON, DealStage.LOST];

export async function closedDealCount(): Promise<number> {
  return prisma.deal.count({ where: { stage: { in: CLOSED } } });
}

/**
 * The active model, or null when there is none or the SRS fallback applies (< 30 closed deals).
 */
export async function loadUsableModel(): Promise<LoadedModel | null> {
  const [active, closed] = await Promise.all([
    prisma.modelVersion.findFirst({ where: { isActive: true, name: "deal-win" }, orderBy: { trainedAt: "desc" } }),
    closedDealCount(),
  ]);
  if (!active || closed < MIN_CLOSED_DEALS) return null;
  return {
    id: active.id,
    weights: active.weights as unknown as StoredWeights,
    stats: active.featureStats as unknown as StoredFeatureStats,
  };
}

export interface DealScore {
  winProbability: number | null;
  scoreFactors: StoredScoreFactors | null;
}

export function scoreRow(model: LoadedModel, row: DealFeatureRow, now: Date = new Date()): DealScore {
  if (CLOSED.includes(row.stage)) return { winProbability: null, scoreFactors: null };
  const spec = { industries: model.stats.industries };
  const columns = featureColumns(spec);
  const snapshot = snapshotFeatures(toFeatureInput(row), now, spec);
  const z = standardizeRow(vectorize(snapshot, spec), model.stats);
  const { probability, factors } = explainScore(
    { weights: model.weights.weights, bias: model.weights.bias },
    columns,
    z,
    snapshot
  );
  return {
    winProbability: Math.round(probability * 10000) / 10000,
    scoreFactors: { modelVersionId: model.id, scoredAt: now.toISOString(), factors },
  };
}

function toDbData(score: DealScore) {
  return {
    winProbability: score.winProbability,
    scoreFactors: score.scoreFactors
      ? (score.scoreFactors as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
  };
}

/**
 * Recomputes and stores one deal's win probability. Called whenever a deal or its activities change.
 * Closed deals and the "not enough data" case store null.
 */
export async function rescoreDeal(dealId: string, model?: LoadedModel | null): Promise<DealScore> {
  const usable = model === undefined ? await loadUsableModel() : model;
  const row = await prisma.deal.findUnique({ where: { id: dealId }, select: dealFeatureSelect });
  if (!row) return { winProbability: null, scoreFactors: null };
  const score = usable ? scoreRow(usable, row) : { winProbability: null, scoreFactors: null };
  await prisma.deal.update({ where: { id: dealId }, data: toDbData(score) });
  return score;
}

/**
 * Same as rescoreDeal but never throws: a scoring problem must not fail the user's save.
 */
export async function safeRescoreDeal(dealId: string | null | undefined): Promise<DealScore | null> {
  if (!dealId) return null;
  try {
    return await rescoreDeal(dealId);
  } catch (err) {
    console.error(`[ml] Failed to rescore deal ${dealId}:`, err);
    return null;
  }
}

/** Rescores every open deal (after training). Returns how many were updated. */
export async function rescoreOpenDeals(model: LoadedModel | null): Promise<number> {
  const rows = await prisma.deal.findMany({
    where: { stage: { notIn: CLOSED } },
    select: dealFeatureSelect,
  });
  const now = new Date();
  const updates = rows.map((row) => {
    const score = model ? scoreRow(model, row, now) : { winProbability: null, scoreFactors: null };
    return prisma.deal.update({ where: { id: row.id }, data: toDbData(score) });
  });
  // Batched in chunks to stay friendly with the pooled (pgbouncer) connection.
  for (let i = 0; i < updates.length; i += 25) {
    await prisma.$transaction(updates.slice(i, i + 25));
  }
  return rows.length;
}
