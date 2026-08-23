export interface ConfusionMatrix {
  tp: number;
  fn: number;
  fp: number;
  tn: number;
}

export interface ClassificationMetrics {
  tpr: number; // True Positive Rate (Sensitivity / Recall)
  fpr: number; // False Positive Rate
  specificity: number; // True Negative Rate
  precision: number;
  accuracy: number;
  f1: number;
}

export interface ROCPoint {
  threshold: number;
  tp: number;
  fn: number;
  fp: number;
  tn: number;
  tpr: number;
  fpr: number;
  jStatistic: number; // Youden's J: TPR - FPR
}

export interface ROCResult {
  points: ROCPoint[];
  auc: number;
  bestPoint: ROCPoint | null;
}

// Calculate metrics from a confusion matrix
export function calculateMetrics(cm: ConfusionMatrix): ClassificationMetrics {
  const { tp, fn, fp, tn } = cm;
  
  const p = tp + fn; // Actual Positives
  const n = fp + tn; // Actual Negatives
  
  const tpr = p === 0 ? 0 : tp / p;
  const fpr = n === 0 ? 0 : fp / n;
  const specificity = n === 0 ? 0 : tn / n;
  
  const precision = (tp + fp) === 0 ? 0 : tp / (tp + fp);
  const accuracy = (p + n) === 0 ? 0 : (tp + tn) / (p + n);
  
  const f1 = (precision + tpr) === 0 ? 0 : (2 * precision * tpr) / (precision + tpr);
  
  return { tpr, fpr, specificity, precision, accuracy, f1 };
}

// Analyze ROC from raw scores
export function analyzeROC(actuals: any[], scores: number[], positiveClassValue: any): ROCResult {
  if (actuals.length !== scores.length || actuals.length === 0) {
    return { points: [], auc: 0, bestPoint: null };
  }

  // Bind pairs and sort by score descending
  const data = actuals.map((actual, i) => ({
    actual: actual === positiveClassValue ? 1 : 0,
    score: Number(scores[i])
  })).sort((a, b) => b.score - a.score); // Highest score first

  const totalPositive = data.filter(d => d.actual === 1).length;
  const totalNegative = data.filter(d => d.actual === 0).length;

  if (totalPositive === 0 || totalNegative === 0) {
    return { points: [], auc: 0, bestPoint: null };
  }

  // Get unique thresholds (we can test score boundaries)
  // Include Infinity to represent all negative
  const thresholds = [Infinity, ...Array.from(new Set(data.map(d => d.score))), -Infinity];
  
  const points: ROCPoint[] = [];

  for (const threshold of thresholds) {
    let tp = 0;
    let fp = 0;
    
    // In a real optimized system, we would calculate running totals,
    // but computing them directly per threshold is fine for normal datasets.
    for (const d of data) {
      if (d.score >= threshold) {
        if (d.actual === 1) tp++;
        else fp++;
      }
    }

    const fn = totalPositive - tp;
    const tn = totalNegative - fp;
    
    const tpr = tp / totalPositive;
    const fpr = fp / totalNegative;
    const jStatistic = tpr - fpr;
    
    points.push({ threshold, tp, fn, fp, tn, tpr, fpr, jStatistic });
  }

  // Remove duplicate FPR/TPR points to keep the curve clean (but preserve threshold logic if needed)
  // Actually, keeping all points is fine, Recharts handles it.
  
  // Sort points by FPR ascending, then TPR ascending to ensure correct drawing left-to-right
  points.sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);

  // Calculate AUC using the trapezoidal rule
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    
    // Area of trapezoid = (b1 + b2) * h / 2
    // Here base is TPR, height is difference in FPR
    auc += (p2.fpr - p1.fpr) * (p1.tpr + p2.tpr) / 2;
  }

  // Find best threshold (Max Youden's J)
  let bestPoint = points[0];
  for (const p of points) {
    if (p.jStatistic > bestPoint.jStatistic) {
      bestPoint = p;
    }
  }

  return { points, auc, bestPoint };
}
