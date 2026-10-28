import { describe, expect, it } from "vitest";
import {
  fitStandardizer,
  loss,
  predictProba,
  sigmoid,
  standardize,
  standardizeRow,
  trainLogisticRegression,
} from "@/lib/ml/logisticRegression";
import { classificationMetrics, confusionMatrix, rocAuc } from "@/lib/ml/metrics";
import { createRng, stratifiedKFold, stratifiedSplit } from "@/lib/ml/split";

describe("sigmoid", () => {
  it("is 0.5 at zero and stable at the extremes", () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(1000)).toBeCloseTo(1, 12);
    expect(sigmoid(-1000)).toBeCloseTo(0, 12);
    expect(Number.isFinite(sigmoid(-1000))).toBe(true);
  });
});

describe("standardizer", () => {
  it("centres and scales each column, and leaves constant columns finite", () => {
    const X = [
      [1, 10, 5],
      [2, 20, 5],
      [3, 30, 5],
    ];
    const s = fitStandardizer(X);
    expect(s.mean).toEqual([2, 20, 5]);
    expect(s.std[2]).toBe(1);
    const Z = standardize(X, s);
    expect(Z[1]).toEqual([0, 0, 0]);
    expect(Z[0][0]).toBeCloseTo(-Z[2][0]);
    expect(standardizeRow([2, 20, 5], s)).toEqual([0, 0, 0]);
  });

  it("does not mutate its input", () => {
    const X = [[1], [3]];
    standardize(X, fitStandardizer(X));
    expect(X).toEqual([[1], [3]]);
  });
});

describe("trainLogisticRegression", () => {
  // Two well-separated clusters: label = 1 when x0 + x1 > 0.
  const rng = createRng(7);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 200; i++) {
    const label = i % 2;
    const centre = label ? 3 : -3;
    X.push([centre + (rng() - 0.5) * 2, centre + (rng() - 0.5) * 2]);
    y.push(label);
  }
  const s = fitStandardizer(X);
  const Z = standardize(X, s);

  it("converges on a linearly separable dataset (100% accuracy, falling loss)", () => {
    const { model, lossHistory } = trainLogisticRegression(Z, y, { iterations: 2000, learningRate: 0.5, l2: 0 });
    const probs = Z.map((row) => predictProba(model, row));
    expect(classificationMetrics(y, probs).accuracy).toBe(1);
    expect(lossHistory[lossHistory.length - 1]).toBeLessThan(lossHistory[0]);
    expect(lossHistory[lossHistory.length - 1]).toBeLessThan(0.05);
    // Loss never increases with a sensible learning rate on a convex objective.
    for (let i = 1; i < lossHistory.length; i++) expect(lossHistory[i]).toBeLessThanOrEqual(lossHistory[i - 1] + 1e-12);
    expect(model.weights[0]).toBeGreaterThan(0);
    expect(model.weights[1]).toBeGreaterThan(0);
  });

  it("L2 regularisation shrinks the weights", () => {
    const free = trainLogisticRegression(Z, y, { iterations: 1500, learningRate: 0.5, l2: 0 }).model;
    const reg = trainLogisticRegression(Z, y, { iterations: 1500, learningRate: 0.5, l2: 0.5 }).model;
    const norm = (w: number[]) => Math.hypot(...w);
    expect(norm(reg.weights)).toBeLessThan(norm(free.weights));
    expect(loss(reg, Z, y, 0)).toBeGreaterThan(loss(free, Z, y, 0));
  });

  it("is deterministic", () => {
    const a = trainLogisticRegression(Z, y, { iterations: 200 }).model;
    const b = trainLogisticRegression(Z, y, { iterations: 200 }).model;
    expect(a).toEqual(b);
  });

  it("rejects mismatched input", () => {
    expect(() => trainLogisticRegression([[1]], [1, 0])).toThrow();
    expect(() => trainLogisticRegression([], [])).toThrow();
  });
});

describe("metrics", () => {
  it("builds a confusion matrix at the 0.5 threshold", () => {
    expect(confusionMatrix([1, 1, 0, 0], [0.9, 0.2, 0.6, 0.1])).toEqual({ tp: 1, fn: 1, fp: 1, tn: 1 });
  });

  it("computes AUC with ties", () => {
    expect(rocAuc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8])).toBeCloseTo(0.75);
    expect(rocAuc([0, 1], [0.5, 0.5])).toBeCloseTo(0.5);
    expect(rocAuc([1, 1], [0.2, 0.9])).toBe(0.5);
  });

  it("derives precision and recall", () => {
    const m = classificationMetrics([1, 1, 1, 0], [0.9, 0.8, 0.1, 0.7]);
    expect(m.precision).toBeCloseTo(2 / 3);
    expect(m.recall).toBeCloseTo(2 / 3);
    expect(m.accuracy).toBeCloseTo(0.5);
  });
});

describe("stratifiedSplit", () => {
  const labels = [...Array(130).fill(1), ...Array(70).fill(0)];

  it("keeps class proportions and covers every row exactly once", () => {
    const { train, test } = stratifiedSplit(labels, 0.2, 42);
    expect(test.length).toBe(40);
    expect(test.filter((i) => labels[i] === 1).length).toBe(26);
    expect(new Set([...train, ...test]).size).toBe(200);
  });

  it("is reproducible for a fixed seed and differs across seeds", () => {
    expect(stratifiedSplit(labels, 0.2, 42)).toEqual(stratifiedSplit(labels, 0.2, 42));
    expect(stratifiedSplit(labels, 0.2, 42).test).not.toEqual(stratifiedSplit(labels, 0.2, 43).test);
  });
});

describe("stratifiedKFold", () => {
  const labels = [...Array(130).fill(1), ...Array(70).fill(0)];
  const folds = stratifiedKFold(labels, 5, 42);

  it("puts every row in exactly one test fold with balanced classes", () => {
    const all = folds.flatMap((f) => f.test);
    expect(all.length).toBe(200);
    expect(new Set(all).size).toBe(200);
    for (const f of folds) {
      expect(f.test.length).toBe(40);
      expect(f.test.filter((i) => labels[i] === 1).length).toBe(26);
      expect(f.train.length + f.test.length).toBe(200);
    }
  });
});
