import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  id3,
  c45,
  prism,
  naiveBayes,
  confusion,
  computeSplits,
  computeC45Splits,
  predictWithTree,
  predictWithPrism,
  kFoldSplit,
  type Dataset,
  type Row,
  type TreeNode,
} from "@/lib/dm-algorithms";
import { TreeView } from "@/components/TreeView";
import { FPGrowthPanel } from "@/components/FPGrowthPanel";
import { ROCPanel } from "@/components/ROCPanel";

type AlgoKey = "id3" | "c45" | "prism" | "bayes" | "fpgrowth" | "roc" | "eval";

const ALGOS: { key: AlgoKey; name: string; latin: string; desc: string }[] = [
  { key: "id3", name: "خوارزمية ID3", latin: "ID3", desc: "بناء شجرة قرار عبر Entropy و Information Gain" },
  { key: "c45", name: "خوارزمية C4.5", latin: "C4.5", desc: "تطوير ID3 يدعم القيم العددية المستمرة (Thresholds)" },
  { key: "prism", name: "خوارزمية Prism", latin: "Prism", desc: "استنباط قواعد التصنيف IF-THEN من قاعدة البيانات" },
  { key: "bayes", name: "Naïve Bayes", latin: "Bayes", desc: "تصنيف احتمالي يعتمد على نظرية بايز" },
  { key: "fpgrowth", name: "خوارزمية FP-Growth", latin: "FP-Growth", desc: "اكتشاف الأنماط المتكررة بدون توليد مرشحات" },
  { key: "roc", name: "منحنى ROC", latin: "ROC Curve", desc: "تقييم أداء المصنفات وحساب TPR/FPR" },
  { key: "eval", name: "التقييم والمصداقية", latin: "Evaluation", desc: "Confusion Matrix, Precision, Recall, F1, Accuracy" },
];

const SAMPLE_DATA: Dataset = {
  columns: ["Outlook", "Temperature", "Humidity", "Windy", "Play"],
  rows: [
    { Outlook: "sunny", Temperature: "hot", Humidity: "high", Windy: "false", Play: "No" },
    { Outlook: "sunny", Temperature: "hot", Humidity: "high", Windy: "true", Play: "No" },
    { Outlook: "overcast", Temperature: "hot", Humidity: "high", Windy: "false", Play: "Yes" },
    { Outlook: "rain", Temperature: "mild", Humidity: "high", Windy: "false", Play: "Yes" },
    { Outlook: "rain", Temperature: "cool", Humidity: "normal", Windy: "false", Play: "Yes" },
    { Outlook: "rain", Temperature: "cool", Humidity: "normal", Windy: "true", Play: "No" },
    { Outlook: "overcast", Temperature: "cool", Humidity: "normal", Windy: "true", Play: "Yes" },
    { Outlook: "sunny", Temperature: "mild", Humidity: "high", Windy: "false", Play: "No" },
    { Outlook: "sunny", Temperature: "cool", Humidity: "normal", Windy: "false", Play: "Yes" },
    { Outlook: "rain", Temperature: "mild", Humidity: "normal", Windy: "false", Play: "Yes" },
    { Outlook: "sunny", Temperature: "mild", Humidity: "normal", Windy: "true", Play: "Yes" },
    { Outlook: "overcast", Temperature: "mild", Humidity: "high", Windy: "true", Play: "Yes" },
    { Outlook: "overcast", Temperature: "hot", Humidity: "normal", Windy: "false", Play: "Yes" },
    { Outlook: "rain", Temperature: "mild", Humidity: "high", Windy: "true", Play: "No" },
  ],
};

const FP_SAMPLE_DATA: Dataset = {
  columns: ["TID", "Items"],
  rows: [
    { TID: "T100", Items: "I1, I2, I5" },
    { TID: "T200", Items: "I2, I4" },
    { TID: "T300", Items: "I2, I3" },
    { TID: "T400", Items: "I1, I2, I4" },
    { TID: "T500", Items: "I1, I3" },
    { TID: "T600", Items: "I2, I3" },
    { TID: "T700", Items: "I1, I3" },
    { TID: "T800", Items: "I1, I2, I3, I5" },
    { TID: "T900", Items: "I1, I2, I3" },
  ],
};

const ROC_SAMPLE_DATA: Dataset = {
  columns: ["ID", "Actual", "Score"],
  rows: [
    { ID: "1", Actual: "1", Score: 0.95 },
    { ID: "2", Actual: "0", Score: 0.82 },
    { ID: "3", Actual: "1", Score: 0.76 },
    { ID: "4", Actual: "0", Score: 0.60 },
    { ID: "5", Actual: "1", Score: 0.48 },
    { ID: "6", Actual: "0", Score: 0.35 },
    { ID: "7", Actual: "0", Score: 0.20 },
    { ID: "8", Actual: "1", Score: 0.15 },
  ],
};

export default function LegacyAlgorithms({ onOpenApriori }: { onOpenApriori?: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(SAMPLE_DATA);
  const [algo, setAlgo] = useState<AlgoKey>("id3");
  const [target, setTarget] = useState<string>("Play");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("مجموعة بيانات Play Tennis (افتراضية)");

  const attrs = useMemo(() => dataset.columns.filter((c) => c !== target), [dataset, target]);

  function handleFile(f: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (json.length === 0) return;
      const cols = Object.keys(json[0]);
      setDataset({ columns: cols, rows: json });
      setTarget(cols[cols.length - 1]);
      setFileName(f.name);
    };
    reader.readAsArrayBuffer(f);
  }

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden border-b border-[color:var(--gold)]/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_295/0.25),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[color:var(--gold)] to-[color:var(--gold-dim)] shadow-[0_0_30px_-5px_var(--gold)] flex items-center justify-center text-[color:var(--background)] font-bold">DM</div>
            <div className="shimmer-line flex-1" />
            {onOpenApriori && (
              <button type="button" onClick={onOpenApriori} className="btn-ghost-gold text-xs">
                فتح مختبر Apriori
              </button>
            )}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="gold-text">مختبر تنقيب البيانات</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            منصة تفاعلية فخمة لتطبيق خوارزميات التصنيف والتنبؤ على قواعد بياناتك مباشرة —
            ارفع ملف Excel واختر الخوارزمية لتشاهد التحليل خطوة بخطوة.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {ALGOS.map((a) => (
              <span key={a.key} className="px-3 py-1 rounded-full border border-[color:var(--gold)]/30 text-[color:var(--gold)]/90 bg-[color:var(--gold)]/5">
                {a.latin}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <section className="glass rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl gold-text font-semibold">١. قاعدة البيانات</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {fileName} — <span className="text-[color:var(--gold)]">{dataset.rows.length}</span> سجل ·{" "}
                <span className="text-[color:var(--gold)]">{dataset.columns.length}</span> صفة
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
              />
              <button onClick={() => fileRef.current?.click()} className="btn-royal">
                رفع ملف Excel
              </button>
              <button onClick={() => { setDataset(SAMPLE_DATA); setTarget("Play"); setFileName("Play Tennis (افتراضية)"); }} className="btn-ghost-gold text-sm">
                بيانات افتراضية (ID3/C4.5)
              </button>
              <button onClick={() => { setDataset(FP_SAMPLE_DATA); setTarget("Items"); setFileName("FP-Growth Data (افتراضية)"); setAlgo("fpgrowth"); }} className="btn-ghost-gold text-sm border border-[color:var(--gold)]/30">
                بيانات افتراضية (FP-Growth)
              </button>
              <button onClick={() => { setDataset(ROC_SAMPLE_DATA); setFileName("ROC Data (افتراضية)"); setAlgo("roc"); }} className="btn-ghost-gold text-sm border border-[color:var(--neon)]/30 text-[color:var(--neon)]">
                بيانات افتراضية (ROC)
              </button>
              <label className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground">عمود الفئة (Class):</span>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
                >
                  {dataset.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-border max-h-72">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--secondary)] sticky top-0">
                <tr>
                  {dataset.columns.map((c) => (
                    <th key={c} className={`px-3 py-2 text-right font-medium ${c === target ? "text-[color:var(--gold)]" : ""}`}>
                      {c}{c === target && " ★"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-white/[0.02]">
                    {dataset.columns.map((c) => (
                      <td key={c} className={`px-3 py-1.5 ${c === target ? "text-[color:var(--gold)] font-medium" : ""}`}>
                        {String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {dataset.rows.length > 50 && (
              <div className="text-xs text-center text-muted-foreground py-2">
                عرض أول 50 من {dataset.rows.length} سجل
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl gold-text font-semibold mb-4">٢. اختر الخوارزمية</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ALGOS.map((a) => (
              <button
                key={a.key}
                onClick={() => setAlgo(a.key)}
                className={`p-4 rounded-xl text-right transition-all ${
                  algo === a.key
                    ? "bg-gradient-to-br from-[color:var(--gold)]/20 to-[color:var(--imperial)]/20 border-2 border-[color:var(--gold)] shadow-[0_0_30px_-5px_var(--gold)]"
                    : "glass hover:border-[color:var(--gold)]/50"
                }`}
              >
                <div className="text-xs font-mono text-[color:var(--gold-dim)]">{a.latin}</div>
                <div className="font-semibold mt-1">{a.name}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{a.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          {algo === "id3" && <ID3Panel dataset={dataset} target={target} attrs={attrs} />}
          {algo === "c45" && <C45Panel dataset={dataset} target={target} attrs={attrs} />}
          {algo === "prism" && <PrismPanel dataset={dataset} target={target} attrs={attrs} />}
          {algo === "bayes" && <BayesPanel dataset={dataset} target={target} attrs={attrs} />}
          {algo === "fpgrowth" && <FPGrowthPanel dataset={dataset} />}
          {algo === "roc" && <ROCPanel dataset={dataset} />}
          {algo === "eval" && <EvalPanel dataset={dataset} target={target} attrs={attrs} />}
        </section>
      </main>

      <footer className="mt-16 border-t border-[color:var(--gold)]/20 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="shimmer-line mb-6 mx-auto max-w-xs" />
          <p className="text-sm text-muted-foreground">
            هذا الموقع من عمل{" "}
            <span className="gold-text font-bold text-lg">المهندس يونس العفيف</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            © {new Date().getFullYear()} — مختبر تنقيب البيانات · جميع الحسابات تتم محلياً في متصفحك
          </p>
        </div>
      </footer>
    </div>
  );
}

function ID3Panel({ dataset, target, attrs }: { dataset: Dataset; target: string; attrs: string[] }) {
  const { tree, splits, parentEntropy } = useMemo(() => {
    const s = computeSplits(dataset.rows, attrs, target);
    return { tree: id3(dataset.rows, attrs, target), splits: s.splits, parentEntropy: s.parentEntropy };
  }, [dataset, target, attrs]);
  const rules = useMemo(() => extractRules(tree), [tree]);

  return (
    <>
      <SectionCard title="Entropy الأولي وInformation Gain لكل صفة">
        <p className="text-sm text-muted-foreground mb-4">
          Entropy(S) = <span className="text-[color:var(--gold)] font-mono">{parentEntropy.toFixed(4)}</span> bits ·
          الصفة ذات أعلى Gain تُختار كجذر الشجرة.
        </p>
        <SplitsTable splits={splits} />
      </SectionCard>

      <SectionCard title="شجرة القرار الكاملة (Interactive)">
        <TreeView root={tree} />
      </SectionCard>

      <SectionCard title="القواعد المستنبطة من الشجرة">
        <RulesList rules={rules} target={target} />
      </SectionCard>
    </>
  );
}

function C45Panel({ dataset, target, attrs }: { dataset: Dataset; target: string; attrs: string[] }) {
  const { tree, splits, parentEntropy } = useMemo(() => {
    const s = computeC45Splits(dataset.rows, attrs, target);
    return { tree: c45(dataset.rows, attrs, target), splits: s.splits, parentEntropy: s.parentEntropy };
  }, [dataset, target, attrs]);
  const rules = useMemo(() => extractRules(tree), [tree]);

  return (
    <>
      <SectionCard title="C4.5 — يدعم القيم العددية عبر Threshold">
        <p className="text-sm text-muted-foreground mb-4">
          Entropy(S) = <span className="text-[color:var(--gold)] font-mono">{parentEntropy.toFixed(4)}</span> ·
          للصفات الرقمية يتم البحث عن أفضل قيمة عتبة Z تقسم البيانات إلى (Y ≤ Z) و (Y &gt; Z).
        </p>
        <SplitsTable splits={splits} showRatio />
      </SectionCard>

      <SectionCard title="شجرة القرار C4.5"><TreeView root={tree} /></SectionCard>

      <SectionCard title="قواعد التصنيف">
        <RulesList rules={rules} target={target} />
      </SectionCard>
    </>
  );
}

function PrismPanel({ dataset, target, attrs }: { dataset: Dataset; target: string; attrs: string[] }) {
  const { rules, steps } = useMemo(() => prism(dataset.rows, attrs, target), [dataset, target, attrs]);

  return (
    <>
      <SectionCard title="القواعد النهائية المستنبطة بواسطة Prism">
        <div className="space-y-2">
          {rules.map((r, i) => (
            <div key={i} className="p-3 rounded-lg border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 font-mono text-sm">
              <span className="text-[color:var(--gold)] font-bold">R{i + 1}:</span> IF{" "}
              {r.conditions.map((c, j) => (
                <span key={j}>
                  <span className="text-[color:var(--neon)]">{c.attribute}</span>={" "}
                  <span className="text-white">"{c.value}"</span>
                  {j < r.conditions.length - 1 && <span className="text-[color:var(--gold-dim)]"> AND </span>}
                </span>
              ))}{" "}
              <span className="text-[color:var(--gold-dim)]">THEN</span>{" "}
              <span className="text-[color:var(--neon)]">{r.conclusion.attribute}</span> ={" "}
              <span className="text-white font-bold">"{r.conclusion.value}"</span>
              <span className="ms-3 text-xs text-muted-foreground">
                (تغطية: {r.coverage} · دقة: {(r.accuracy * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="خطوات البناء (Iterations)">
        <div className="space-y-4 max-h-[500px] overflow-auto">
          {steps.map((s, i) => (
            <div key={i} className="p-4 rounded-lg border border-border">
              <div className="font-semibold text-[color:var(--gold)] mb-2">
                القاعدة {i + 1} — الفئة: {s.targetClass}
              </div>
              {s.iterations.map((it, j) => (
                <div key={j} className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">التكرار {j + 1} — أفضل الاختيارات:</div>
                  <table className="w-full text-xs">
                    <thead className="text-[color:var(--gold-dim)]">
                      <tr>
                        <th className="text-right px-2 py-1">الصفة</th>
                        <th className="text-right px-2 py-1">القيمة</th>
                        <th className="text-right px-2 py-1">الاحتمالية</th>
                        <th className="text-right px-2 py-1">التغطية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {it.map((o, k) => (
                        <tr key={k} className={k === 0 ? "bg-[color:var(--gold)]/10 text-[color:var(--gold)] font-medium" : ""}>
                          <td className="px-2 py-1">{o.attribute}</td>
                          <td className="px-2 py-1">{o.value}</td>
                          <td className="px-2 py-1 font-mono">{o.probability}</td>
                          <td className="px-2 py-1">{o.covered}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function BayesPanel({ dataset, target, attrs }: { dataset: Dataset; target: string; attrs: string[] }) {
  const [query, setQuery] = useState<Record<string, string>>({});
  const uniqueValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const a of attrs) map[a] = Array.from(new Set(dataset.rows.map((r) => String(r[a]))));
    return map;
  }, [dataset, attrs]);
  const result = useMemo(() => naiveBayes(dataset.rows, attrs, target, query), [dataset, target, attrs, query]);

  return (
    <>
      <SectionCard title="الاحتمالات القبلية Priors P(C)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.classes.map((c) => (
            <div key={c} className="glass rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground">P({target}=</div>
              <div className="font-bold text-[color:var(--gold)]">{c})</div>
              <div className="text-2xl font-mono mt-1">{result.priors[c].toFixed(3)}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="أدخل حالة جديدة للتنبؤ">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {attrs.map((a) => (
            <div key={a}>
              <label className="text-xs text-[color:var(--gold-dim)]">{a}</label>
              <select
                value={query[a] || ""}
                onChange={(e) => setQuery({ ...query, [a]: e.target.value })}
                className="w-full mt-1 bg-input border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {uniqueValues[a].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
        {result.prediction && Object.values(query).some((v) => v) && (
          <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-[color:var(--imperial)]/20 to-[color:var(--neon)]/10 border border-[color:var(--neon)]/40">
            <div className="text-xs text-muted-foreground mb-2">الخطوات:</div>
            {result.prediction.steps.map((s, i) => (
              <div key={i} className="text-sm font-mono mb-1">
                P({s.attr}="{s.value}" | C) ={" "}
                {result.classes.map((c, j) => (
                  <span key={c}>
                    <span className="text-[color:var(--gold)]">{c}</span>=
                    <span className="text-white">{s.probs[c]}</span>
                    {j < result.classes.length - 1 && "، "}
                  </span>
                ))}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-muted-foreground">P(X|C)·P(C):</div>
              {result.classes.map((c) => (
                <div key={c} className="text-sm font-mono">
                  <span className="text-[color:var(--gold)]">{c}</span> ={" "}
                  <span className="text-white">{result.prediction!.posterior[c].toExponential(3)}</span>
                </div>
              ))}
              <div className="mt-3 text-lg">
                التنبؤ:{" "}
                <span className="gold-text font-bold text-2xl">{result.prediction.predicted}</span>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="جدول الاحتمالات الشرطية P(A|C)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[color:var(--secondary)]">
                <th className="text-right px-3 py-2">الصفة</th>
                <th className="text-right px-3 py-2">القيمة</th>
                {result.classes.map((c) => (
                  <th key={c} className="text-right px-3 py-2 text-[color:var(--gold)]">P(·|{c})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attrs.flatMap((a) =>
                Object.keys(result.conditionals[a] || {}).map((v) => (
                  <tr key={`${a}-${v}`} className="border-t border-border/40">
                    <td className="px-3 py-1.5 text-[color:var(--gold-dim)]">{a}</td>
                    <td className="px-3 py-1.5">{v}</td>
                    {result.classes.map((c) => (
                      <td key={c} className="px-3 py-1.5 font-mono">
                        {(result.conditionals[a][v][c] ?? 0).toFixed(3)}
                      </td>
                    ))}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

function EvalPanel({ dataset, target, attrs }: { dataset: Dataset; target: string; attrs: string[] }) {
  const [method, setMethod] = useState<"resub" | "split" | "kfold">("split");
  const [splitPct, setSplitPct] = useState(70);
  const [k, setK] = useState(4);
  const [classifier, setClassifier] = useState<"id3" | "c45" | "prism" | "bayes">("id3");

  const result = useMemo(() => {
    const rows = dataset.rows;
    if (rows.length === 0) return null;
    const runPredict = (train: Row[], test: Row[]) => {
      if (classifier === "id3") {
        const t = id3(train, attrs, target);
        return test.map((r) => predictWithTree(t, r));
      }
      if (classifier === "c45") {
        const t = c45(train, attrs, target);
        return test.map((r) => predictWithTree(t, r));
      }
      if (classifier === "prism") {
        const { rules } = prism(train, attrs, target);
        const majority = Object.entries(train.reduce<Record<string, number>>((acc, r) => {
          const key = String(r[target]); acc[key] = (acc[key] || 0) + 1; return acc;
        }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || "?";
        return test.map((r) => predictWithPrism(rules, r, majority));
      }
      const nb = (row: Row) => {
        const q: Record<string, string> = {};
        for (const a of attrs) q[a] = String(row[a]);
        const res = naiveBayes(train, attrs, target, q);
        return res.prediction?.predicted || "?";
      };
      return test.map(nb);
    };

    let actual: string[] = [];
    let predicted: string[] = [];
    if (method === "resub") {
      actual = rows.map((r) => String(r[target]));
      predicted = runPredict(rows, rows);
    } else if (method === "split") {
      const n = Math.floor((rows.length * splitPct) / 100);
      const train = rows.slice(0, n);
      const test = rows.slice(n);
      actual = test.map((r) => String(r[target]));
      predicted = runPredict(train, test);
    } else {
      const folds = kFoldSplit(rows, k);
      for (const f of folds) {
        actual = actual.concat(f.test.map((r) => String(r[target])));
        predicted = predicted.concat(runPredict(f.train, f.test));
      }
    }
    return confusion(actual, predicted);
  }, [dataset, target, attrs, method, splitPct, k, classifier]);

  return (
    <>
      <SectionCard title="إعدادات التقييم">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-[color:var(--gold-dim)] block mb-1">المصنِّف</label>
            <select value={classifier} onChange={(e) => setClassifier(e.target.value as "id3")} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
              <option value="id3">ID3</option>
              <option value="c45">C4.5</option>
              <option value="prism">Prism</option>
              <option value="bayes">Naive Bayes</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[color:var(--gold-dim)] block mb-1">طريقة التقييم</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as "split")} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm">
              <option value="resub">Resubstitution (كل البيانات للتدريب والاختبار)</option>
              <option value="split">Train/Test Split</option>
              <option value="kfold">K-Fold Cross Validation</option>
            </select>
          </div>
          <div>
            {method === "split" && (
              <>
                <label className="text-xs text-[color:var(--gold-dim)] block mb-1">نسبة التدريب: {splitPct}%</label>
                <input type="range" min={50} max={90} value={splitPct} onChange={(e) => setSplitPct(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
              </>
            )}
            {method === "kfold" && (
              <>
                <label className="text-xs text-[color:var(--gold-dim)] block mb-1">K = {k}</label>
                <input type="range" min={2} max={10} value={k} onChange={(e) => setK(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
              </>
            )}
          </div>
        </div>
      </SectionCard>

      {result && (
        <>
          <SectionCard title="Confusion Matrix">
            <div className="overflow-x-auto">
              <table className="mx-auto text-sm">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    <th colSpan={result.labels.length} className="p-2 text-[color:var(--gold)]">Predicted →</th>
                  </tr>
                  <tr>
                    <th className="p-2 text-[color:var(--gold)]">Actual ↓</th>
                    {result.labels.map((l) => <th key={l} className="p-2 px-4 border border-border">{l}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.matrix.map((row, i) => (
                    <tr key={i}>
                      <th className="p-2 px-4 border border-border text-[color:var(--gold)]">{result.labels[i]}</th>
                      {row.map((v, j) => (
                        <td key={j} className={`p-3 px-6 border border-border text-center font-mono text-lg ${i === j ? "bg-[color:var(--gold)]/20 text-[color:var(--gold)] font-bold" : "text-muted-foreground"}`}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="مقاييس الأداء">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Metric label="Accuracy" value={(result.accuracy * 100).toFixed(2) + "%"} accent />
              <Metric label="Error Rate" value={(result.errorRate * 100).toFixed(2) + "%"} />
              <Metric label="Standard Error" value={result.standardError.toFixed(4)} />
              <Metric label="عدد الفئات" value={String(result.labels.length)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--secondary)]">
                  <tr>
                    <th className="text-right px-3 py-2 text-[color:var(--gold)]">الفئة</th>
                    <th className="text-right px-3 py-2">TP</th>
                    <th className="text-right px-3 py-2">FP</th>
                    <th className="text-right px-3 py-2">FN</th>
                    <th className="text-right px-3 py-2">TN</th>
                    <th className="text-right px-3 py-2">Precision</th>
                    <th className="text-right px-3 py-2">Recall</th>
                    <th className="text-right px-3 py-2">F1</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perClass.map((p) => (
                    <tr key={p.label} className="border-t border-border/40">
                      <td className="px-3 py-1.5 font-medium text-[color:var(--gold)]">{p.label}</td>
                      <td className="px-3 py-1.5 font-mono">{p.TP}</td>
                      <td className="px-3 py-1.5 font-mono">{p.FP}</td>
                      <td className="px-3 py-1.5 font-mono">{p.FN}</td>
                      <td className="px-3 py-1.5 font-mono">{p.TN}</td>
                      <td className="px-3 py-1.5 font-mono">{p.precision.toFixed(3)}</td>
                      <td className="px-3 py-1.5 font-mono">{p.recall.toFixed(3)}</td>
                      <td className="px-3 py-1.5 font-mono text-[color:var(--neon)]">{p.f1.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <h3 className="text-xl gold-text font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${accent ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10" : "border-border bg-card/60"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold font-mono mt-1 ${accent ? "gold-text" : ""}`}>{value}</div>
    </div>
  );
}

function SplitsTable({ splits, showRatio }: { splits: ReturnType<typeof computeC45Splits>["splits"]; showRatio?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--secondary)]">
          <tr>
            <th className="text-right px-3 py-2">الصفة</th>
            <th className="text-right px-3 py-2">Entropy الموزون</th>
            <th className="text-right px-3 py-2 text-[color:var(--gold)]">Information Gain</th>
            {showRatio && <th className="text-right px-3 py-2">Intrinsic Info</th>}
            {showRatio && <th className="text-right px-3 py-2 text-[color:var(--neon)]">Gain Ratio</th>}
          </tr>
        </thead>
        <tbody>
          {splits.map((s, i) => (
            <tr key={s.attribute} className={`border-t border-border/40 ${i === 0 ? "bg-[color:var(--gold)]/10" : ""}`}>
              <td className="px-3 py-2 font-medium">
                {s.attribute}
                {"threshold" in s && s.threshold !== undefined && (
                  <span className="ms-2 text-xs text-[color:var(--neon)]">Z = {String(s.threshold)}</span>
                )}
                {i === 0 && <span className="ms-2 text-[color:var(--gold)] text-xs">★ الأفضل</span>}
              </td>
              <td className="px-3 py-2 font-mono">{s.weightedEntropy.toFixed(4)}</td>
              <td className="px-3 py-2 font-mono text-[color:var(--gold)]">{s.gain.toFixed(4)}</td>
              {showRatio && <td className="px-3 py-2 font-mono">{s.intrinsic.toFixed(4)}</td>}
              {showRatio && <td className="px-3 py-2 font-mono text-[color:var(--neon)]">{s.gainRatio.toFixed(4)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function extractRules(node: TreeNode, path: { attr: string; val: string }[] = []): { conditions: { attr: string; val: string }[]; label: string }[] {
  if (node.isLeaf) return [{ conditions: path, label: node.label || "?" }];
  const out: { conditions: { attr: string; val: string }[]; label: string }[] = [];
  for (const c of node.children || []) {
    out.push(...extractRules(c, [...path, { attr: node.attribute || "?", val: c.value || "?" }]));
  }
  return out;
}

function RulesList({ rules, target }: { rules: { conditions: { attr: string; val: string }[]; label: string }[]; target: string }) {
  return (
    <div className="space-y-2">
      {rules.map((r, i) => (
        <div key={i} className="p-3 rounded-lg border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 font-mono text-sm">
          <span className="text-[color:var(--gold)] font-bold">R{i + 1}:</span>{" "}
          <span className="text-[color:var(--gold-dim)]">IF</span>{" "}
          {r.conditions.length === 0 ? <span className="text-muted-foreground">(دائماً)</span> : r.conditions.map((c, j) => (
            <span key={j}>
              <span className="text-[color:var(--neon)]">{c.attr}</span> ={" "}
              <span className="text-white">"{c.val}"</span>
              {j < r.conditions.length - 1 && <span className="text-[color:var(--gold-dim)]"> AND </span>}
            </span>
          ))}{" "}
          <span className="text-[color:var(--gold-dim)]">THEN</span>{" "}
          <span className="text-[color:var(--neon)]">{target}</span> ={" "}
          <span className="text-white font-bold">"{r.label}"</span>
        </div>
      ))}
    </div>
  );
}
