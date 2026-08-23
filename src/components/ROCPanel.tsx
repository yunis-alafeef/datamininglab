import { useState, useMemo } from "react";
import { type Dataset } from "@/lib/dm-algorithms";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ScatterChart, Scatter
} from "recharts";
import { calculateMetrics, analyzeROC, type ConfusionMatrix } from "@/lib/roc";

type ROCInputMode = "confusion-matrix" | "dataset";

export function ROCPanel({ dataset }: { dataset: Dataset }) {
  const [mode, setMode] = useState<ROCInputMode>("confusion-matrix");
  
  // Confusion Matrix state
  const [tp, setTp] = useState(30);
  const [fn, setFn] = useState(50);
  const [fp, setFp] = useState(70);
  const [tn, setTn] = useState(20);
  
  // Dataset mode state
  const [actualCol, setActualCol] = useState(dataset.columns[0] || "");
  const [scoreCol, setScoreCol] = useState(dataset.columns[1] || "");
  const [positiveClass, setPositiveClass] = useState("1");
  const [selectedThreshold, setSelectedThreshold] = useState<number | null>(null);

  // Compute stats for Manual Confusion Matrix Mode
  const manualMetrics = useMemo(() => {
    return calculateMetrics({ tp, fn, fp, tn });
  }, [tp, fn, fp, tn]);

  const rocResult = useMemo(() => {
    if (mode === "confusion-matrix") return null;
    
    // Extract Actual and Scores
    const actuals = dataset.rows.map(r => r[actualCol]);
    const scores = dataset.rows.map(r => Number(r[scoreCol]) || 0);
    
    return analyzeROC(actuals, scores, positiveClass);
  }, [mode, dataset, actualCol, scoreCol, positiveClass]);

  const activePoint = useMemo(() => {
    if (mode === "confusion-matrix") return null;
    if (!rocResult || rocResult.points.length === 0) return null;
    
    // If threshold is not selected by user, default to bestPoint
    if (selectedThreshold === null) {
      return rocResult.bestPoint;
    }
    
    // Find point closest to the selected threshold
    let closest = rocResult.points[0];
    let minDiff = Infinity;
    for (const p of rocResult.points) {
      // Ignore Infinity for threshold sliding
      if (!isFinite(p.threshold)) continue; 
      const diff = Math.abs(p.threshold - selectedThreshold);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    return closest || rocResult.bestPoint;
  }, [mode, rocResult, selectedThreshold]);

  // To display the random baseline
  const randomLine = [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }];

  return (
    <>
      <SectionCard title="إعدادات ROC Curve">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1">
            <label className="text-xs text-[color:var(--gold-dim)] block mb-2">مصدر البيانات (Data Source)</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("confusion-matrix")}
                className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                  mode === "confusion-matrix" ? "bg-[color:var(--gold)] text-[color:var(--background)] font-bold" : "glass border border-border"
                }`}
              >
                إدخال يدوي (Confusion Matrix)
              </button>
              <button
                onClick={() => setMode("dataset")}
                className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                  mode === "dataset" ? "bg-[color:var(--gold)] text-[color:var(--background)] font-bold" : "glass border border-border"
                }`}
              >
                من قاعدة البيانات (Actual & Scores)
              </button>
            </div>
          </div>
        </div>

        {mode === "confusion-matrix" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">True Positive (TP)</label>
              <input type="number" min={0} value={tp} onChange={(e) => setTp(Number(e.target.value) || 0)} className="w-full bg-input border border-border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">False Negative (FN)</label>
              <input type="number" min={0} value={fn} onChange={(e) => setFn(Number(e.target.value) || 0)} className="w-full bg-input border border-border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">False Positive (FP)</label>
              <input type="number" min={0} value={fp} onChange={(e) => setFp(Number(e.target.value) || 0)} className="w-full bg-input border border-border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">True Negative (TN)</label>
              <input type="number" min={0} value={tn} onChange={(e) => setTn(Number(e.target.value) || 0)} className="w-full bg-input border border-border rounded-lg px-3 py-2" />
            </div>
          </div>
        )}

        {mode === "dataset" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">عمود Actual Label</label>
              <select value={actualCol} onChange={(e) => setActualCol(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
                {dataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">عمود Prediction Score</label>
              <select value={scoreCol} onChange={(e) => setScoreCol(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
                {dataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">قيمة الفئة الإيجابية (Positive Class)</label>
              <input type="text" value={positiveClass} onChange={(e) => setPositiveClass(e.target.value)} placeholder="مثال: 1 أو Yes أو Positive" className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="ROC Curve">
            <div className="h-[400px] w-full text-sm">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="fpr" 
                    type="number" 
                    domain={[0, 1]} 
                    tickFormatter={(v) => v.toFixed(2)}
                    label={{ value: 'False Positive Rate (FPR)', position: 'insideBottom', offset: -10, fill: '#aaa' }}
                    stroke="#aaa"
                  />
                  <YAxis 
                    dataKey="tpr" 
                    type="number" 
                    domain={[0, 1]} 
                    tickFormatter={(v) => v.toFixed(2)}
                    label={{ value: 'True Positive Rate (TPR)', angle: -90, position: 'insideLeft', offset: 10, fill: '#aaa' }}
                    stroke="#aaa"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid var(--gold)', borderRadius: '8px' }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "Classifier") return [value.toFixed(4), "TPR"];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `FPR: ${Number(label).toFixed(4)}`}
                  />
                  
                  {/* Random Baseline */}
                  <Line 
                    data={randomLine} 
                    type="linear" 
                    dataKey="tpr" 
                    stroke="#888" 
                    strokeDasharray="5 5" 
                    name="Random Classifier" 
                    dot={false} 
                    activeDot={false}
                  />

                  {mode === "confusion-matrix" ? (
                    // Single Point Mode
                    <Line 
                      data={[{ fpr: manualMetrics.fpr, tpr: manualMetrics.tpr }]} 
                      type="monotone" 
                      dataKey="tpr" 
                      stroke="var(--gold)" 
                      strokeWidth={3} 
                      name="Classifier" 
                      dot={{ fill: "var(--gold)", r: 6 }} 
                      activeDot={{ r: 8 }}
                    />
                  ) : (
                    // Dataset Curve Mode
                    <Line 
                      data={rocResult?.points || []} 
                      type="stepAfter" // Creates the stair-step look typical of ROC from discrete datasets
                      dataKey="tpr" 
                      stroke="var(--gold)" 
                      strokeWidth={3} 
                      name="Classifier" 
                      dot={false}
                      activeDot={{ r: 8, fill: "var(--neon)", stroke: "var(--gold)" }}
                    />
                  )}
                  
                  {/* Highlight current active point when sliding threshold */}
                  {mode === "dataset" && activePoint && (
                    <Line
                      data={[{ fpr: activePoint.fpr, tpr: activePoint.tpr }]}
                      type="monotone"
                      dataKey="tpr"
                      stroke="var(--neon)"
                      dot={{ fill: "var(--neon)", r: 6 }}
                      activeDot={false}
                      name="Selected Threshold"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {mode === "dataset" && rocResult && rocResult.points.length > 0 && (
              <div className="mt-6 px-4">
                <div className="flex justify-between text-sm text-[color:var(--gold-dim)] mb-2">
                  <span>Classification Threshold</span>
                  <span className="font-mono text-[color:var(--neon)]">
                    {selectedThreshold !== null ? selectedThreshold.toFixed(4) : (activePoint?.threshold !== Infinity && activePoint?.threshold !== -Infinity ? activePoint?.threshold.toFixed(4) : "Auto (Best)")}
                  </span>
                </div>
                {(() => {
                  const finiteThresholds = rocResult.points.filter(p => isFinite(p.threshold)).map(p => p.threshold);
                  if (finiteThresholds.length === 0) return null;
                  const minT = Math.min(...finiteThresholds);
                  const maxT = Math.max(...finiteThresholds);
                  
                  return (
                    <input 
                      type="range" 
                      min={minT} 
                      max={maxT} 
                      step={(maxT - minT) / 100 || 0.01}
                      value={selectedThreshold ?? activePoint?.threshold ?? maxT}
                      onChange={(e) => setSelectedThreshold(Number(e.target.value))}
                      className="w-full accent-[color:var(--gold)] cursor-pointer"
                    />
                  );
                })()}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="ملخص الأداء (Summary)">
            <div className="grid grid-cols-2 gap-4">
              {mode === "dataset" && rocResult && (
                <Metric label="AUC" value={rocResult.auc.toFixed(4)} accent />
              )}
              {mode === "dataset" && activePoint && activePoint.threshold !== Infinity && activePoint.threshold !== -Infinity && (
                <Metric label="Threshold" value={activePoint.threshold.toFixed(3)} />
              )}
              <Metric label="TPR (Sensitivity)" value={(mode === "confusion-matrix" ? manualMetrics.tpr : (activePoint?.tpr ?? 0)).toFixed(3)} />
              <Metric label="FPR" value={(mode === "confusion-matrix" ? manualMetrics.fpr : (activePoint?.fpr ?? 0)).toFixed(3)} />
              <Metric label="Specificity" value={(mode === "confusion-matrix" ? manualMetrics.specificity : (1 - (activePoint?.fpr ?? 0))).toFixed(3)} />
              <Metric label="Precision" value={(mode === "confusion-matrix" ? manualMetrics.precision : ((activePoint?.tp ?? 0) / ((activePoint?.tp ?? 0) + (activePoint?.fp ?? 0)) || 0)).toFixed(3)} />
            </div>
          </SectionCard>

          <SectionCard title="Confusion Matrix">
            <table className="w-full text-center text-sm">
              <thead>
                <tr>
                  <th className="p-2 border-b border-border/50 text-muted-foreground font-normal">N={(mode === "confusion-matrix" ? (tp+fn+fp+tn) : (activePoint ? activePoint.tp + activePoint.fn + activePoint.fp + activePoint.tn : 0))}</th>
                  <th className="p-2 border-b border-border/50 text-[color:var(--gold)]">Predicted +</th>
                  <th className="p-2 border-b border-border/50 text-[color:var(--gold)]">Predicted -</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-r border-border/50 text-[color:var(--gold)] font-medium">Actual +</td>
                  <td className="p-3 border-b border-border/50 bg-[color:var(--neon)]/10 font-bold font-mono text-lg">
                    {mode === "confusion-matrix" ? tp : (activePoint?.tp ?? 0)}
                  </td>
                  <td className="p-3 border-b border-border/50 bg-white/5 font-bold font-mono text-lg">
                    {mode === "confusion-matrix" ? fn : (activePoint?.fn ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-border/50 text-[color:var(--gold)] font-medium">Actual -</td>
                  <td className="p-3 bg-white/5 font-bold font-mono text-lg">
                    {mode === "confusion-matrix" ? fp : (activePoint?.fp ?? 0)}
                  </td>
                  <td className="p-3 bg-[color:var(--neon)]/10 font-bold font-mono text-lg">
                    {mode === "confusion-matrix" ? tn : (activePoint?.tn ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 md:p-8 h-full">
      <h3 className="text-xl gold-text font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${accent ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10" : "border-border bg-card/60"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold font-mono mt-1 ${accent ? "gold-text" : ""}`}>{value}</div>
    </div>
  );
}
