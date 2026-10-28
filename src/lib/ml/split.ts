/**
 * Deterministic, stratified train/test split.
 */

/** mulberry32: small, fast, seedable PRNG returning floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface SplitIndices {
  train: number[];
  test: number[];
}

/**
 * Splits row indices so that each class keeps (approximately) the same share in train and test.
 */
export function stratifiedSplit(labels: readonly number[], testRatio: number = 0.2, seed: number = 42): SplitIndices {
  const rng = createRng(seed);
  const byClass = new Map<number, number[]>();
  labels.forEach((label, idx) => {
    const list = byClass.get(label) ?? [];
    list.push(idx);
    byClass.set(label, list);
  });

  const train: number[] = [];
  const test: number[] = [];
  for (const label of Array.from(byClass.keys()).sort((a, b) => a - b)) {
    const idxs = shuffle(byClass.get(label)!, rng);
    const nTest = Math.round(idxs.length * testRatio);
    test.push(...idxs.slice(0, nTest));
    train.push(...idxs.slice(nTest));
  }
  return { train: train.sort((a, b) => a - b), test: test.sort((a, b) => a - b) };
}

/**
 * Stratified k-fold: returns k (train, test) index pairs, each row appearing in exactly one test fold.
 */
export function stratifiedKFold(labels: readonly number[], k: number = 5, seed: number = 42): SplitIndices[] {
  const rng = createRng(seed);
  const folds: number[][] = Array.from({ length: k }, () => []);
  const byClass = new Map<number, number[]>();
  labels.forEach((label, idx) => {
    const list = byClass.get(label) ?? [];
    list.push(idx);
    byClass.set(label, list);
  });
  let offset = 0;
  for (const label of Array.from(byClass.keys()).sort((a, b) => a - b)) {
    shuffle(byClass.get(label)!, rng).forEach((idx, i) => folds[(i + offset) % k].push(idx));
    offset += byClass.get(label)!.length;
  }
  return folds.map((testFold, f) => ({
    test: [...testFold].sort((a, b) => a - b),
    train: folds
      .filter((_, g) => g !== f)
      .flat()
      .sort((a, b) => a - b),
  }));
}
