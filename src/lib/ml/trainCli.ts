/**
 * `npm run train` — trains the deal win-probability model against DATABASE_URL,
 * activates it and rescores all open deals.
 */
import prisma from "@/lib/prisma";
import { InsufficientDataError, trainAndActivate } from "@/features/ml/server/training";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

async function main() {
  console.log("🧠 Training deal win-probability model...");
  const started = Date.now();
  const { modelVersionId, metrics, rescoredOpenDeals } = await trainAndActivate();
  const cm = metrics.confusionMatrix;
  console.log(`✅ Model ${modelVersionId} trained in ${Date.now() - started} ms and marked active.`);
  console.log(`   Train/test rows : ${metrics.trainSize} / ${metrics.testSize} (win rate ${pct(metrics.positiveRate)})`);
  console.log(`   Test accuracy   : ${pct(metrics.accuracy)}  (train ${pct(metrics.trainAccuracy)})`);
  console.log(`   5-fold CV       : accuracy ${pct(metrics.cvAccuracy)}, AUC ${metrics.cvAuc.toFixed(3)}`);
  console.log(`   Precision/Recall: ${pct(metrics.precision)} / ${pct(metrics.recall)}   AUC ${metrics.auc.toFixed(3)}`);
  console.log(`   Confusion matrix: TP ${cm.tp}  FP ${cm.fp}  TN ${cm.tn}  FN ${cm.fn}`);
  console.log(`   Rescored ${rescoredOpenDeals} open deals.`);
}

main()
  .catch((err) => {
    if (err instanceof InsufficientDataError) console.error(`⚠️  ${err.message}`);
    else console.error("❌ Training failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
