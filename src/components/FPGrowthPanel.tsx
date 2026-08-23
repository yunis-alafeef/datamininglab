import { useState, useMemo } from "react";
import { type Dataset } from "@/lib/dm-algorithms";
import { parseTransactions, fpGrowth, type FPParsingFormat } from "@/lib/fp-growth";
import { FPTreeView } from "@/components/FPTreeView";

export function FPGrowthPanel({ dataset }: { dataset: Dataset }) {
  const [format, setFormat] = useState<FPParsingFormat>("items-column");
  const [tidColumn, setTidColumn] = useState<string>(dataset.columns[0] || "");
  const [itemsColumn, setItemsColumn] = useState<string>(dataset.columns[1] || "");
  const [itemDelimiter, setItemDelimiter] = useState<string>(",");
  const [minSup, setMinSup] = useState<number>(2);

  const {
    transactions,
    fList,
    orderedTransactions,
    tree,
    conditionalBases,
    conditionalTrees,
    frequentPatterns
  } = useMemo(() => {
    try {
      const txs = parseTransactions(dataset.rows, {
        format,
        tidColumn,
        itemsColumn,
        itemDelimiter
      });
      if (txs.length === 0) return { transactions: [] };
      const res = fpGrowth(txs, minSup);
      return { transactions: txs, ...res };
    } catch (e) {
      console.error(e);
      return { transactions: [] };
    }
  }, [dataset, format, tidColumn, itemsColumn, itemDelimiter, minSup]);

  if (dataset.columns.length === 0) return <div>لا توجد بيانات</div>;

  return (
    <>
      <SectionCard title="إعدادات البيانات للخوارزمية (FP-Growth)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-[color:var(--gold-dim)] block mb-1">شكل البيانات</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as FPParsingFormat)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="items-column">عناصر في عمود واحد (Items in a column)</option>
              <option value="item-per-row">عنصر في كل صف (Item per row)</option>
              <option value="binary">بيانات ثنائية (Binary Matrix)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[color:var(--gold-dim)] block mb-1">عمود الـ Transaction ID</label>
            <select
              value={tidColumn}
              onChange={(e) => setTidColumn(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm"
            >
              {dataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {format !== "binary" && (
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">عمود العناصر (Items)</label>
              <select
                value={itemsColumn}
                onChange={(e) => setItemsColumn(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm"
              >
                {dataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {format === "items-column" && (
            <div>
              <label className="text-xs text-[color:var(--gold-dim)] block mb-1">فاصل العناصر (Delimiter)</label>
              <input
                type="text"
                value={itemDelimiter}
                onChange={(e) => setItemDelimiter(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="مثال: ,"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-[color:var(--gold-dim)] block mb-1">Minimum Support (Count)</label>
            <input
              type="number"
              min={1}
              value={minSup}
              onChange={(e) => setMinSup(parseInt(e.target.value) || 1)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </SectionCard>

      {transactions.length === 0 ? (
        <SectionCard title="تنبيه">
          <p className="text-muted-foreground">لم يتم العثور على Transactions صالحة. يرجى مراجعة إعدادات الأعمدة أو رفع بيانات صحيحة.</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="1. استخراج العناصر المتكررة (Frequent 1-Itemsets & F-List)">
            <div className="text-sm text-muted-foreground mb-4">
              إجمالي الـ Transactions: <span className="text-[color:var(--gold)]">{transactions.length}</span> · 
              Minimum Support: <span className="text-[color:var(--gold)]">{minSup}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--secondary)]">
                  <tr>
                    <th className="text-right px-3 py-2">العنصر (Item)</th>
                    <th className="text-right px-3 py-2">الدعم (Support Count)</th>
                  </tr>
                </thead>
                <tbody>
                  {fList?.map((f, i) => (
                    <tr key={f.item} className="border-t border-border/40">
                      <td className="px-3 py-2 font-medium text-[color:var(--gold)]">{f.item}</td>
                      <td className="px-3 py-2 font-mono">{f.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="2. ترتيب البيانات (Ordered Transactions)">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--secondary)] sticky top-0">
                  <tr>
                    <th className="text-right px-3 py-2 w-1/4">TID</th>
                    <th className="text-right px-3 py-2">Ordered Items</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedTransactions?.map((t) => (
                    <tr key={t.id} className="border-t border-border/40 hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 font-mono text-[color:var(--gold-dim)]">{t.id}</td>
                      <td className="px-3 py-1.5">{t.items.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {tree && (
            <SectionCard title="3. بناء شجرة FP-Tree">
              <FPTreeView root={tree.root} />
            </SectionCard>
          )}

          {conditionalBases && Object.keys(conditionalBases).length > 0 && (
            <SectionCard title="4. قواعد الأنماط الشرطية (Conditional Pattern Bases)">
              <div className="space-y-4">
                {Object.values(conditionalBases).map(base => (
                  <div key={base.item} className="p-4 border border-border/40 rounded-xl bg-black/10">
                    <div className="font-bold text-[color:var(--gold)] mb-2">Item: {base.item}</div>
                    {base.paths.length === 0 ? (
                      <div className="text-xs text-muted-foreground">- No prefix paths</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {base.paths.map((p, idx) => (
                          <span key={idx} className="text-sm px-2 py-1 bg-white/5 border border-white/10 rounded-md font-mono">
                            {'{'}{p.items.join(", ")}{'}'} : {p.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {frequentPatterns && (
            <SectionCard title="5. الأنماط المتكررة النهائية (Frequent Patterns)">
              <div className="flex flex-wrap gap-3 mt-4">
                {frequentPatterns.map((pat, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-[color:var(--neon)]/30 bg-[color:var(--neon)]/5 font-mono text-sm flex items-center gap-3">
                    <span className="text-white">
                      {'{'}<span className="text-[color:var(--neon)] font-bold">{pat.items.join(", ")}</span>{'}'}
                    </span>
                    <span className="text-[color:var(--gold)] font-bold text-lg">
                      {pat.support}
                    </span>
                  </div>
                ))}
                {frequentPatterns.length === 0 && (
                  <p className="text-muted-foreground text-sm">لم يتم العثور على أي أنماط متكررة بناءً على الـ Minimum Support المحدد.</p>
                )}
              </div>
            </SectionCard>
          )}
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
