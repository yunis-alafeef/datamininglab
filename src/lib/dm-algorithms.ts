// خوارزميات تنقيب البيانات - تنفيذ كامل في المتصفح
// ID3, C4.5, Prism, Naive Bayes, Evaluation

export type Row = Record<string, string | number>;
export type Dataset = { columns: string[]; rows: Row[] };

const log2 = (x: number) => (x === 0 ? 0 : Math.log2(x));

export function entropy(labels: (string | number)[]): number {
  const counts: Record<string, number> = {};
  for (const l of labels) counts[String(l)] = (counts[String(l)] || 0) + 1;
  const n = labels.length;
  let h = 0;
  for (const k in counts) {
    const p = counts[k] / n;
    h -= p * log2(p);
  }
  return h;
}

export function classCounts(rows: Row[], target: string): Record<string, number> {
  const c: Record<string, number> = {};
  for (const r of rows) c[String(r[target])] = (c[String(r[target])] || 0) + 1;
  return c;
}

// ==================== ID3 ====================
export type TreeNode = {
  attribute?: string;
  value?: string;
  children?: TreeNode[];
  label?: string;
  isLeaf: boolean;
  count?: number;
  entropy?: number;
  gain?: number;
  distribution?: Record<string, number>;
};

export type SplitInfo = {
  attribute: string;
  entropies: { value: string; entropy: number; count: number; dist: Record<string, number> }[];
  weightedEntropy: number;
  gain: number;
  intrinsic: number;
  gainRatio: number;
};

export function computeSplits(rows: Row[], attrs: string[], target: string): {
  parentEntropy: number;
  splits: SplitInfo[];
  best: SplitInfo | null;
} {
  const parentEntropy = entropy(rows.map((r) => r[target]));
  const n = rows.length;
  const splits: SplitInfo[] = [];
  for (const a of attrs) {
    const groups: Record<string, Row[]> = {};
    for (const r of rows) {
      const v = String(r[a]);
      (groups[v] = groups[v] || []).push(r);
    }
    const entriesArr = Object.entries(groups);
    const entropies = entriesArr.map(([value, g]) => ({
      value,
      entropy: entropy(g.map((r) => r[target])),
      count: g.length,
      dist: classCounts(g, target),
    }));
    const weighted = entropies.reduce((s, e) => s + (e.count / n) * e.entropy, 0);
    const intrinsic = -entriesArr.reduce((s, [, g]) => {
      const p = g.length / n;
      return s + p * log2(p);
    }, 0);
    const gain = parentEntropy - weighted;
    splits.push({
      attribute: a,
      entropies,
      weightedEntropy: weighted,
      gain,
      intrinsic,
      gainRatio: intrinsic === 0 ? 0 : gain / intrinsic,
    });
  }
  splits.sort((a, b) => b.gain - a.gain);
  return { parentEntropy, splits, best: splits[0] || null };
}

export function id3(rows: Row[], attrs: string[], target: string): TreeNode {
  const dist = classCounts(rows, target);
  const classes = Object.keys(dist);
  if (classes.length === 1) {
    return { isLeaf: true, label: classes[0], count: rows.length, distribution: dist };
  }
  if (attrs.length === 0 || rows.length === 0) {
    const majority = classes.sort((a, b) => dist[b] - dist[a])[0] || "?";
    return { isLeaf: true, label: majority, count: rows.length, distribution: dist };
  }
  const { splits, best, parentEntropy } = computeSplits(rows, attrs, target);
  if (!best || best.gain <= 0) {
    const majority = classes.sort((a, b) => dist[b] - dist[a])[0];
    return { isLeaf: true, label: majority, count: rows.length, distribution: dist };
  }
  const children: TreeNode[] = [];
  const groups: Record<string, Row[]> = {};
  for (const r of rows) {
    const v = String(r[best.attribute]);
    (groups[v] = groups[v] || []).push(r);
  }
  const remaining = attrs.filter((a) => a !== best.attribute);
  for (const v of Object.keys(groups)) {
    const child = id3(groups[v], remaining, target);
    child.value = v;
    children.push(child);
  }
  void splits; void parentEntropy;
  return {
    isLeaf: false,
    attribute: best.attribute,
    children,
    count: rows.length,
    entropy: parentEntropy,
    gain: best.gain,
    distribution: dist,
  };
}

// ==================== C4.5 (يدعم القيم العددية) ====================
function isNumericColumn(rows: Row[], col: string): boolean {
  let numCount = 0, total = 0;
  for (const r of rows) {
    if (r[col] === undefined || r[col] === null || r[col] === "") continue;
    total++;
    const n = Number(r[col]);
    if (!isNaN(n) && typeof r[col] !== "boolean") numCount++;
  }
  return total > 0 && numCount / total > 0.8;
}

export type C45Split = SplitInfo & { threshold?: number; numeric?: boolean };

export function computeC45Splits(rows: Row[], attrs: string[], target: string): {
  parentEntropy: number;
  splits: C45Split[];
  best: C45Split | null;
} {
  const parentEntropy = entropy(rows.map((r) => r[target]));
  const n = rows.length;
  const splits: C45Split[] = [];
  for (const a of attrs) {
    if (isNumericColumn(rows, a)) {
      const sorted = [...rows].sort((x, y) => Number(x[a]) - Number(y[a]));
      const values = Array.from(new Set(sorted.map((r) => Number(r[a])))).sort((x, y) => x - y);
      let bestGain = -Infinity;
      let bestThr = values[0];
      let bestEntropies: C45Split["entropies"] = [];
      let bestWeighted = 0;
      let bestIntrinsic = 0;
      for (const thr of values) {
        const left = sorted.filter((r) => Number(r[a]) <= thr);
        const right = sorted.filter((r) => Number(r[a]) > thr);
        if (left.length === 0 || right.length === 0) continue;
        const eL = entropy(left.map((r) => r[target]));
        const eR = entropy(right.map((r) => r[target]));
        const w = (left.length / n) * eL + (right.length / n) * eR;
        const g = parentEntropy - w;
        const pL = left.length / n, pR = right.length / n;
        const intrinsic = -(pL * log2(pL) + pR * log2(pR));
        if (g > bestGain) {
          bestGain = g;
          bestThr = thr;
          bestEntropies = [
            { value: `<= ${thr}`, entropy: eL, count: left.length, dist: classCounts(left, target) },
            { value: `> ${thr}`, entropy: eR, count: right.length, dist: classCounts(right, target) },
          ];
          bestWeighted = w;
          bestIntrinsic = intrinsic;
        }
      }
      splits.push({
        attribute: a,
        numeric: true,
        threshold: bestThr,
        entropies: bestEntropies,
        weightedEntropy: bestWeighted,
        gain: bestGain === -Infinity ? 0 : bestGain,
        intrinsic: bestIntrinsic,
        gainRatio: bestIntrinsic === 0 ? 0 : bestGain / bestIntrinsic,
      });
    } else {
      const s = computeSplits(rows, [a], target).splits[0];
      splits.push({ ...s, numeric: false });
    }
  }
  splits.sort((a, b) => b.gain - a.gain);
  return { parentEntropy, splits, best: splits[0] || null };
}

export function c45(rows: Row[], attrs: string[], target: string): TreeNode {
  const dist = classCounts(rows, target);
  const classes = Object.keys(dist);
  if (classes.length === 1) return { isLeaf: true, label: classes[0], count: rows.length, distribution: dist };
  if (attrs.length === 0 || rows.length === 0) {
    const majority = classes.sort((a, b) => dist[b] - dist[a])[0] || "?";
    return { isLeaf: true, label: majority, count: rows.length, distribution: dist };
  }
  const { splits, best, parentEntropy } = computeC45Splits(rows, attrs, target);
  if (!best || best.gain <= 0) {
    const majority = classes.sort((a, b) => dist[b] - dist[a])[0];
    return { isLeaf: true, label: majority, count: rows.length, distribution: dist };
  }
  const children: TreeNode[] = [];
  if (best.numeric && best.threshold !== undefined) {
    const left = rows.filter((r) => Number(r[best.attribute]) <= (best.threshold as number));
    const right = rows.filter((r) => Number(r[best.attribute]) > (best.threshold as number));
    const cL = c45(left, attrs, target);
    cL.value = `<= ${best.threshold}`;
    children.push(cL);
    const cR = c45(right, attrs, target);
    cR.value = `> ${best.threshold}`;
    children.push(cR);
  } else {
    const groups: Record<string, Row[]> = {};
    for (const r of rows) {
      const v = String(r[best.attribute]);
      (groups[v] = groups[v] || []).push(r);
    }
    const remaining = attrs.filter((a) => a !== best.attribute);
    for (const v of Object.keys(groups)) {
      const child = c45(groups[v], remaining, target);
      child.value = v;
      children.push(child);
    }
  }
  void splits;
  return {
    isLeaf: false,
    attribute: best.attribute + (best.numeric ? ` (≤ ${best.threshold})` : ""),
    children,
    count: rows.length,
    entropy: parentEntropy,
    gain: best.gain,
    distribution: dist,
  };
}

// ==================== Prism ====================
export type PrismRule = {
  conditions: { attribute: string; value: string }[];
  conclusion: { attribute: string; value: string };
  coverage: number;
  accuracy: number;
};

export type PrismStep = {
  targetClass: string;
  rule: PrismRule;
  iterations: {
    attribute: string;
    value: string;
    probability: string;
    covered: number;
  }[][];
};

export function prism(rows: Row[], attrs: string[], target: string): {
  rules: PrismRule[];
  steps: PrismStep[];
} {
  const rules: PrismRule[] = [];
  const steps: PrismStep[] = [];
  const classes = Array.from(new Set(rows.map((r) => String(r[target]))));

  for (const cls of classes) {
    let remaining = [...rows];
    while (remaining.some((r) => String(r[target]) === cls)) {
      let subset = [...remaining];
      const conditions: { attribute: string; value: string }[] = [];
      const usedAttrs = new Set<string>();
      const stepIters: PrismStep["iterations"] = [];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const availAttrs = attrs.filter((a) => !usedAttrs.has(a));
        if (availAttrs.length === 0) break;
        const options: { attribute: string; value: string; probability: number; covered: number; correct: number }[] = [];
        for (const a of availAttrs) {
          const values = Array.from(new Set(subset.map((r) => String(r[a]))));
          for (const v of values) {
            const matched = subset.filter((r) => String(r[a]) === v);
            const correct = matched.filter((r) => String(r[target]) === cls).length;
            if (matched.length === 0) continue;
            options.push({
              attribute: a,
              value: v,
              probability: correct / matched.length,
              covered: matched.length,
              correct,
            });
          }
        }
        if (options.length === 0) break;
        options.sort((a, b) =>
          b.probability !== a.probability ? b.probability - a.probability : b.correct - a.correct,
        );
        const best = options[0];
        stepIters.push(
          options.slice(0, 8).map((o) => ({
            attribute: o.attribute,
            value: o.value,
            probability: `${o.correct}/${o.covered} = ${o.probability.toFixed(3)}`,
            covered: o.covered,
          })),
        );
        conditions.push({ attribute: best.attribute, value: best.value });
        usedAttrs.add(best.attribute);
        subset = subset.filter((r) => String(r[best.attribute]) === best.value);
        if (best.probability === 1 || subset.length === 0) break;
      }

      if (conditions.length === 0) break;
      const covered = remaining.filter((r) =>
        conditions.every((c) => String(r[c.attribute]) === c.value),
      );
      const correctCount = covered.filter((r) => String(r[target]) === cls).length;
      const rule: PrismRule = {
        conditions,
        conclusion: { attribute: target, value: cls },
        coverage: covered.length,
        accuracy: covered.length === 0 ? 0 : correctCount / covered.length,
      };
      rules.push(rule);
      steps.push({ targetClass: cls, rule, iterations: stepIters });
      // احذف السجلات المغطاة من هذا الكلاس
      remaining = remaining.filter(
        (r) => !(String(r[target]) === cls && conditions.every((c) => String(r[c.attribute]) === c.value)),
      );
      if (correctCount === 0) break;
    }
  }
  return { rules, steps };
}

// ==================== Naive Bayes ====================
export type NBResult = {
  classes: string[];
  priors: Record<string, number>;
  conditionals: Record<string, Record<string, Record<string, number>>>; // attr -> value -> class -> P
  prediction?: {
    input: Record<string, string>;
    scores: Record<string, number>;
    posterior: Record<string, number>;
    predicted: string;
    steps: { attr: string; value: string; probs: Record<string, string> }[];
  };
};

export function naiveBayes(
  rows: Row[],
  attrs: string[],
  target: string,
  query?: Record<string, string>,
): NBResult {
  const classes = Array.from(new Set(rows.map((r) => String(r[target]))));
  const priors: Record<string, number> = {};
  const total = rows.length;
  for (const c of classes) {
    priors[c] = rows.filter((r) => String(r[target]) === c).length / total;
  }
  const conditionals: NBResult["conditionals"] = {};
  for (const a of attrs) {
    conditionals[a] = {};
    const values = Array.from(new Set(rows.map((r) => String(r[a]))));
    for (const v of values) {
      conditionals[a][v] = {};
      for (const c of classes) {
        const clsRows = rows.filter((r) => String(r[target]) === c);
        const match = clsRows.filter((r) => String(r[a]) === v).length;
        conditionals[a][v][c] = clsRows.length === 0 ? 0 : match / clsRows.length;
      }
    }
  }

  let prediction: NBResult["prediction"];
  if (query && Object.keys(query).length > 0) {
    const scores: Record<string, number> = {};
    const steps: NonNullable<NBResult["prediction"]>["steps"] = [];
    for (const c of classes) scores[c] = 1;
    for (const a of Object.keys(query)) {
      const v = query[a];
      if (!v || !conditionals[a] || !conditionals[a][v]) continue;
      const probs: Record<string, string> = {};
      for (const c of classes) {
        const p = conditionals[a][v][c] ?? 0;
        scores[c] *= p;
        probs[c] = p.toFixed(4);
      }
      steps.push({ attr: a, value: v, probs });
    }
    const posterior: Record<string, number> = {};
    for (const c of classes) posterior[c] = scores[c] * priors[c];
    const predicted = classes.sort((a, b) => posterior[b] - posterior[a])[0];
    prediction = { input: query, scores, posterior, predicted, steps };
  }

  return { classes, priors, conditionals, prediction };
}

// ==================== Evaluation ====================
export type ConfusionResult = {
  labels: string[];
  matrix: number[][]; // [actual][predicted]
  perClass: {
    label: string;
    TP: number;
    FP: number;
    FN: number;
    TN: number;
    precision: number;
    recall: number;
    f1: number;
  }[];
  accuracy: number;
  errorRate: number;
  standardError: number;
};

export function confusion(actual: string[], predicted: string[]): ConfusionResult {
  const labels = Array.from(new Set([...actual, ...predicted])).sort();
  const idx: Record<string, number> = {};
  labels.forEach((l, i) => (idx[l] = i));
  const matrix = labels.map(() => labels.map(() => 0));
  for (let i = 0; i < actual.length; i++) {
    matrix[idx[actual[i]]][idx[predicted[i]]]++;
  }
  const total = actual.length;
  let correct = 0;
  for (let i = 0; i < labels.length; i++) correct += matrix[i][i];
  const perClass = labels.map((label, i) => {
    const TP = matrix[i][i];
    let FP = 0, FN = 0, TN = 0;
    for (let r = 0; r < labels.length; r++) {
      for (let c = 0; c < labels.length; c++) {
        if (r === i && c === i) continue;
        if (c === i) FP += matrix[r][c];
        else if (r === i) FN += matrix[r][c];
        else TN += matrix[r][c];
      }
    }
    const precision = TP + FP === 0 ? 0 : TP / (TP + FP);
    const recall = TP + FN === 0 ? 0 : TP / (TP + FN);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    return { label, TP, FP, FN, TN, precision, recall, f1 };
  });
  const accuracy = total === 0 ? 0 : correct / total;
  const errorRate = 1 - accuracy;
  const standardError = total === 0 ? 0 : Math.sqrt((accuracy * (1 - accuracy)) / total);
  return { labels, matrix, perClass, accuracy, errorRate, standardError };
}

// Predict with a decision tree (ID3/C4.5)
export function predictWithTree(tree: TreeNode, row: Row): string {
  let node: TreeNode = tree;
  while (!node.isLeaf && node.children) {
    const attr = (node.attribute || "").split(" (")[0];
    const v = String(row[attr]);
    let next: TreeNode | undefined;
    for (const c of node.children) {
      const cv = c.value || "";
      if (cv.startsWith("<=") || cv.startsWith(">")) {
        const num = Number(v);
        const thr = Number(cv.replace(/[<=>]/g, "").trim());
        if ((cv.startsWith("<=") && num <= thr) || (cv.startsWith(">") && num > thr)) {
          next = c;
          break;
        }
      } else if (cv === v) {
        next = c;
        break;
      }
    }
    if (!next) {
      // اختر أكثر الفئات في التوزيع
      if (node.distribution) {
        return Object.entries(node.distribution).sort((a, b) => b[1] - a[1])[0][0];
      }
      return "?";
    }
    node = next;
  }
  return node.label || "?";
}

// Predict with Prism rules
export function predictWithPrism(rules: PrismRule[], row: Row, defaultClass = "?"): string {
  for (const r of rules) {
    if (r.conditions.every((c) => String(row[c.attribute]) === c.value)) {
      return r.conclusion.value;
    }
  }
  return defaultClass;
}

// K-fold split
export function kFoldSplit<T>(items: T[], k: number): { train: T[]; test: T[] }[] {
  const folds: T[][] = Array.from({ length: k }, () => []);
  items.forEach((it, i) => folds[i % k].push(it));
  return folds.map((test, i) => ({
    test,
    train: folds.filter((_, j) => j !== i).flat(),
  }));
}
