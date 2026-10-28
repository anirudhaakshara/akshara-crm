/**
 * Logistic regression implemented from scratch.
 * - z-score normalisation (fit on training data only)
 * - batch gradient descent
 * - L2 regularisation on weights (not on the bias)
 * All functions are pure: they never mutate their inputs.
 */

export type Vector = number[];
export type Matrix = number[][];

export interface Standardizer {
  mean: Vector;
  std: Vector;
}

export interface LogisticModel {
  weights: Vector;
  bias: number;
}

export interface TrainOptions {
  learningRate?: number;
  iterations?: number;
  /** L2 penalty strength (lambda). */
  l2?: number;
  /** Stop early when the loss improves by less than this between iterations. */
  tolerance?: number;
}

export interface TrainResult {
  model: LogisticModel;
  lossHistory: number[];
  iterations: number;
}

const EPS = 1e-12;

export function sigmoid(z: number): number {
  // Numerically stable for large |z|.
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export function fitStandardizer(X: Matrix): Standardizer {
  if (X.length === 0) throw new Error("Cannot fit a standardizer on an empty matrix");
  const n = X.length;
  const d = X[0].length;
  const mean = new Array<number>(d).fill(0);
  const std = new Array<number>(d).fill(0);

  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j] / n;
  for (const row of X) for (let j = 0; j < d; j++) std[j] += (row[j] - mean[j]) ** 2 / n;
  for (let j = 0; j < d; j++) {
    std[j] = Math.sqrt(std[j]);
    // Constant columns would divide by zero; leave them centred at 0 instead.
    if (std[j] < 1e-9) std[j] = 1;
  }
  return { mean, std };
}

export function standardizeRow(x: Vector, s: Standardizer): Vector {
  return x.map((v, j) => (v - s.mean[j]) / s.std[j]);
}

export function standardize(X: Matrix, s: Standardizer): Matrix {
  return X.map((row) => standardizeRow(row, s));
}

export function linearScore(model: LogisticModel, x: Vector): number {
  let z = model.bias;
  for (let j = 0; j < x.length; j++) z += model.weights[j] * x[j];
  return z;
}

/** Probability of the positive class for an already-standardised row. */
export function predictProba(model: LogisticModel, x: Vector): number {
  return sigmoid(linearScore(model, x));
}

/** Mean binary cross-entropy plus the L2 term. */
export function loss(model: LogisticModel, X: Matrix, y: number[], l2: number = 0): number {
  const n = X.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const p = predictProba(model, X[i]);
    total += -(y[i] * Math.log(p + EPS) + (1 - y[i]) * Math.log(1 - p + EPS));
  }
  const reg = (l2 / 2) * model.weights.reduce((s, w) => s + w * w, 0);
  return total / n + reg;
}

/**
 * Train with batch gradient descent. X must already be standardised.
 */
export function trainLogisticRegression(X: Matrix, y: number[], options: TrainOptions = {}): TrainResult {
  const { learningRate = 0.1, iterations = 3000, l2 = 0.01, tolerance = 1e-7 } = options;
  if (X.length === 0) throw new Error("No training rows");
  if (X.length !== y.length) throw new Error("X and y must have the same number of rows");

  const n = X.length;
  const d = X[0].length;
  let weights = new Array<number>(d).fill(0);
  let bias = 0;
  const lossHistory: number[] = [];
  let prevLoss = Infinity;
  let iter = 0;

  for (; iter < iterations; iter++) {
    const gradW = new Array<number>(d).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const err = predictProba({ weights, bias }, X[i]) - y[i];
      for (let j = 0; j < d; j++) gradW[j] += (err * X[i][j]) / n;
      gradB += err / n;
    }

    weights = weights.map((w, j) => w - learningRate * (gradW[j] + l2 * w));
    bias = bias - learningRate * gradB;

    const current = loss({ weights, bias }, X, y, l2);
    lossHistory.push(current);
    if (Math.abs(prevLoss - current) < tolerance) {
      iter++;
      break;
    }
    prevLoss = current;
  }

  return { model: { weights, bias }, lossHistory, iterations: iter };
}
