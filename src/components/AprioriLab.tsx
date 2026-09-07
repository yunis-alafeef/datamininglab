import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  GitBranch,
  Info,
  Layers3,
  LayoutDashboard,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  ScanSearch,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Table2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

type Transaction = { tid: string; items: string[] };
type Candidate = { items: string[]; count: number; support: number; selected: boolean; reason: string };

const defaultTransactions: Transaction[] = [
  { tid: '100', items: ['1', '3', '4'] },
  { tid: '200', items: ['2', '3', '5'] },
  { tid: '300', items: ['1', '2', '3', '5'] },
  { tid: '400', items: ['2', '5'] },
];

const scanLabels = [
  { scan: 1, candidate: 'C₁', frequent: 'L₁', caption: 'العناصر المفردة' },
  { scan: 2, candidate: 'C₂', frequent: 'L₂', caption: 'الأزواج المحتملة' },
  { scan: 3, candidate: 'C₃', frequent: 'L₃', caption: 'الثلاثيات النهائية' },
];

const ruleBlueprint = [
  { id: 'R1', left: ['2', '3'], right: ['5'] },
  { id: 'R2', left: ['2', '5'], right: ['3'] },
  { id: 'R3', left: ['3', '5'], right: ['2'] },
  { id: 'R4', left: ['2'], right: ['3', '5'] },
  { id: 'R5', left: ['3'], right: ['2', '5'] },
  { id: 'R6', left: ['5'], right: ['2', '3'] },
];

const setLabel = (items: string[]) => `{${items.join(', ')}}`;
const pairwise = (items: string[]) =>
  items.flatMap((item, index) => items.slice(index + 1).map((next) => [item, next]));
const combinations = (items: string[], size: number): string[][] => {
  if (size === 1) return items.map((item) => [item]);
  return items.flatMap((item, index) =>
    combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]),
  );
};
const countSet = (transactions: Transaction[], items: string[]) =>
  transactions.filter((transaction) => items.every((item) => transaction.items.includes(item))).length;

function Badge({ children, tone = 'teal' }: { children: ReactNode; tone?: 'teal' | 'coral' | 'muted' | 'amber' }) {
  const tones = {
    teal: 'border-primary/30 bg-primary/10 text-primary',
    coral: 'border-accent/30 bg-accent/10 text-accent',
    muted: 'border-border bg-muted text-muted-foreground',
    amber: 'border-[#c9943b]/30 bg-[#c9943b]/10 text-[#a87424] dark:text-[#e1ad58]',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function SectionHeading({ eyebrow, title, detail, icon }: { eyebrow: string; title: string; detail?: string; icon: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <div className="mono mb-1 text-[10px] font-semibold uppercase tracking-[.16em] text-primary">{eyebrow}</div>
          <h2 className="display text-xl font-semibold text-foreground">{title}</h2>
          {detail && <p className="mt-1 text-xs leading-6 text-muted-foreground">{detail}</p>}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, color = 'teal' }: { value: number; color?: 'teal' | 'coral' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all duration-500 ${color === 'coral' ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function Sidebar({ active, onNavigate, onOpenLegacy }: { active: string; onNavigate: (id: string) => void; onOpenLegacy?: () => void }) {
  const links = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'dataset', label: 'البيانات', icon: Database },
    { id: 'scans', label: 'خطوات Apriori', icon: ScanSearch },
    { id: 'rules', label: 'قواعد الارتباط', icon: GitBranch },
  ];
  return (
    <aside className="lab-sidebar">
      <div className="mb-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_0_5px_hsl(var(--primary)/.12)]">
            <FlaskConical size={22} strokeWidth={1.7} />
            <span className="pulse-dot absolute -right-1 -top-1 size-2 rounded-full bg-accent" />
          </div>
          <div>
            <div className="display text-lg font-bold tracking-tight">مِسبار</div>
            <div className="mono text-[9px] tracking-[.18em] text-primary/80">DATA MINING LAB</div>
          </div>
        </div>
        <Badge tone="teal">v1.0</Badge>
      </div>

      <div className="mono mb-3 px-2 text-[10px] uppercase tracking-[.16em] text-slate-400">مساحة العمل</div>
      <nav className="sidebar-nav space-y-1.5" aria-label="التنقل الرئيسي">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = active === link.id;
          return (
            <button
              key={link.id}
              type="button"
              data-testid={`button-nav-${link.id}`}
              onClick={() => onNavigate(link.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm transition-all ${isActive ? 'bg-primary font-semibold text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/.18)]' : 'text-slate-300 hover:bg-sidebar-accent hover:text-white'}`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} />
              <span>{link.label}</span>
              {isActive && <ArrowLeft className="mr-auto" size={14} />}
            </button>
          );
        })}
      </nav>
      {onOpenLegacy && (
        <button
          type="button"
          onClick={onOpenLegacy}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-slate-700/70 px-3 py-3 text-right text-sm text-slate-300 transition-colors hover:border-primary/50 hover:bg-sidebar-accent hover:text-white"
        >
          <Layers3 size={17} />
          <span>الخوارزميات السابقة</span>
        </button>
      )}

      <div className="sidebar-meta mt-12 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-4">
        <div className="mb-3 flex items-center gap-2 text-primary"><ShieldCheck size={16} /><span className="text-xs font-semibold">وضع المختبر</span></div>
        <p className="text-[11px] leading-6 text-slate-400">كل نتيجة هنا قابلة للتتبع: من عدّ التكرار إلى سبب بقاء القاعدة أو حذفها.</p>
        <div className="mt-4 flex items-center gap-2 border-t border-slate-700/60 pt-3 text-[10px] text-slate-500"><span className="pulse-dot size-1.5 rounded-full bg-primary" />تشغيل محلي · بلا خادم</div>
      </div>
      <div className="sidebar-meta mt-5 px-2 text-[10px] leading-5 text-slate-500">
        <div className="mono mb-1 text-slate-400">APR-001 / TDB</div>
        بيئة تعليمية مفتوحة للطلاب والمدرسين
      </div>
    </aside>
  );
}

function StatCard({ label, value, note, icon, accent = 'teal' }: { label: string; value: string; note: string; icon: ReactNode; accent?: 'teal' | 'coral' }) {
  return (
    <div className="glass-card rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-lg ${accent === 'coral' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>{icon}</span>
      </div>
      <div className="display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{note}</div>
    </div>
  );
}

function CandidateTable({ rows, columns, minSupport, transactionCount, emptyText }: { rows: Candidate[]; columns: string; minSupport: number; transactionCount: number; emptyText: string }) {
  return (
    <div className="table-scroll rounded-xl border border-border">
      {rows.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center">
          <Table2 size={22} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <table className="w-full min-w-[620px] border-collapse text-right text-xs">
          <thead className="bg-muted/50 text-[10px] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">المجموعة المرشحة</th>
              <th className="px-4 py-3 font-semibold">الظهور</th>
              <th className="px-4 py-3 font-semibold">الدعم النسبي</th>
              <th className="px-4 py-3 font-semibold">القرار</th>
              <th className="px-4 py-3 font-semibold">التفسير</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => (
              <tr key={`${columns}-${setLabel(row.items)}`} className={`transition-colors hover:bg-primary/5 ${row.selected ? '' : 'opacity-70'}`} data-testid={`row-candidate-${columns}-${index}`}>
                <td className="px-4 py-3"><span className="mono rounded-md bg-muted px-2 py-1 text-[11px]">{setLabel(row.items)}</span></td>
                <td className="mono px-4 py-3 text-muted-foreground">{row.count} / {transactionCount}</td>
                <td className="px-4 py-3">
                  <div className="flex min-w-28 items-center gap-2"><span className="mono w-10">{row.support.toFixed(1)}%</span><div className="w-16"><ProgressBar value={row.support} color={row.selected ? 'teal' : 'coral'} /></div></div>
                </td>
                <td className="px-4 py-3">{row.selected ? <Badge><Check size={11} />Selected</Badge> : <Badge tone="coral"><X size={11} />Pruned</Badge>}</td>
                <td className="max-w-[220px] px-4 py-3 text-[11px] leading-5 text-muted-foreground">{row.reason}<span className="mono mr-1 text-[10px]">({minSupport.toFixed(1)}%)</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AprioriLab({ onOpenLegacy }: { onOpenLegacy?: () => void }) {
  const [dark, setDark] = useState(true);
  const [activeNav, setActiveNav] = useState('overview');
  const [activeScan, setActiveScan] = useState(1);
  const [minsup, setMinsup] = useState('50');
  const [minconf, setMinconf] = useState('70');
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [newTid, setNewTid] = useState('');
  const [newItems, setNewItems] = useState('');
  const [editingTid, setEditingTid] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploadHeaders, setUploadHeaders] = useState(['TID', 'Items']);
  const [tidColumn, setTidColumn] = useState('TID');
  const [itemsColumn, setItemsColumn] = useState('Items');
  const [uploadedRows, setUploadedRows] = useState<string[][]>([]);
  const [status, setStatus] = useState('جاهز للتحليل');
  const [isRunning, setIsRunning] = useState(false);
  const [showConfidence, setShowConfidence] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const minSupportValue = Math.max(0, Math.min(100, Number(minsup) || 0));
  const minConfidenceValue = Math.max(0, Math.min(100, Number(minconf) || 0));
  const thresholdCount = (minSupportValue / 100) * transactions.length;

  const itemUniverse = useMemo(
    () => Array.from(new Set(transactions.flatMap((transaction) => transaction.items))).sort((a, b) => Number(a) - Number(b)),
    [transactions],
  );
  const candidates = useMemo(() => {
    const makeRows = (sets: string[][], label: string): Candidate[] =>
      sets.map((items) => {
        const count = countSet(transactions, items);
        const support = transactions.length ? (count / transactions.length) * 100 : 0;
        const selected = support >= minSupportValue;
        const reason = selected
          ? label === 'C₁' ? 'يظهر بما يكفي؛ ينتقل إلى المستوى التالي' : 'كل الأجزاء الفرعية المتطلبة اجتازت العتبة'
          : `يظهر ${count} مرة فقط؛ أقل من الحد الأدنى`;
        return { items, count, support, selected, reason };
      });
    const c1 = makeRows(itemUniverse.map((item) => [item]), 'C₁');
    const l1 = c1.filter((row) => row.selected).map((row) => row.items[0]);
    const c2 = makeRows(pairwise(l1), 'C₂');
    const l2 = c2.filter((row) => row.selected).map((row) => row.items);
    const c3Sets = combinations(Array.from(new Set(l2.flat())), 3).filter((set) =>
      pairwise(set).every((pair) => l2.some((frequent) => frequent.join(',') === pair.join(','))),
    );
    const c3 = makeRows(c3Sets, 'C₃');
    return { c1, l1, c2, l2, c3, l3: c3.filter((row) => row.selected).map((row) => row.items) };
  }, [itemUniverse, minSupportValue, transactions]);

  const rules = useMemo(
    () =>
      ruleBlueprint.map((rule) => {
        const leftCount = countSet(transactions, rule.left);
        const union = [...rule.left, ...rule.right];
        const unionCount = countSet(transactions, union);
        const confidence = leftCount ? (unionCount / leftCount) * 100 : 0;
        return { ...rule, leftCount, unionCount, confidence, strong: confidence >= minConfidenceValue };
      }),
    [minConfidenceValue, transactions],
  );
  const strongRules = rules.filter((rule) => rule.strong);
  const frequentCount = candidates.c1.filter((row) => row.selected).length + candidates.l2.length + candidates.l3.length;

  const navigate = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const runAnalysis = () => {
    if (minSupportValue <= 0 || minSupportValue > 100 || minConfidenceValue <= 0 || minConfidenceValue > 100) {
      setStatus('تحقق من القيم: يجب أن تكون النسبة بين 1 و100');
      return;
    }
    setIsRunning(true);
    setStatus('يُعاد عدّ المرشحين...');
    window.setTimeout(() => {
      setIsRunning(false);
      setStatus(`اكتمل التحليل · ${frequentCount} مجموعة متكررة`);
    }, 460);
  };

  const updateItems = (tid: string, value: string) => {
    setTransactions((current) => current.map((transaction) => transaction.tid === tid ? { ...transaction, items: value.split(',').map((item) => item.trim()).filter(Boolean) } : transaction));
  };

  const addTransaction = () => {
    const tid = newTid.trim();
    const items = newItems.split(',').map((item) => item.trim()).filter(Boolean);
    if (!tid || items.length === 0 || transactions.some((transaction) => transaction.tid === tid)) {
      setStatus('أدخل TID جديداً وعناصر مفصولة بفواصل، وتأكد من عدم تكرار المعرّف');
      return;
    }
    setTransactions((current) => [...current, { tid, items }]);
    setNewTid('');
    setNewItems('');
    setStatus(`أُضيفت المعاملة ${tid} إلى TDB المحلي`);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const workbook = isCsv
        ? XLSX.read(await file.text(), { type: 'string' })
        : XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
        header: 1,
        raw: false,
        defval: '',
      }) as unknown[][];
      const headers = (matrix[0] ?? []).map((header) => String(header).trim()).filter(Boolean);
      const rows = matrix.slice(1).map((row) => headers.map((_, index) => String(row[index] ?? '').trim()));
      if (headers.length < 2 || rows.length === 0) {
        setUploadedRows([]);
        setStatus('تعذر قراءة الملف؛ نحتاج صف عناوين وصفاً واحداً على الأقل');
        return;
      }
      setUploadedRows(rows);
      setUploadHeaders(headers);
      setTidColumn(headers.find((header) => /tid|id|transaction/i.test(header)) || headers[0]);
      setItemsColumn(headers.find((header) => /item|product|set/i.test(header)) || headers[1]);
      setStatus(`تمت قراءة ${rows.length} صفاً من ${file.name}؛ راجع اختيار الأعمدة ثم طبّق الاستيراد`);
    } catch {
      setUploadedRows([]);
      setStatus('حدث خطأ أثناء قراءة الملف؛ تأكد أنه CSV أو Excel صالح');
    }
  };

  const importUploadedData = () => {
    if (!fileName || uploadedRows.length === 0) {
      setStatus('اختر ملف CSV أو Excel صالحاً أولاً');
      return;
    }
    const tidIndex = uploadHeaders.indexOf(tidColumn);
    const itemsIndex = uploadHeaders.indexOf(itemsColumn);
    const parsed = uploadedRows.map((cells) => ({
      tid: cells[tidIndex]?.trim() || '',
      items: (cells[itemsIndex] || '')
        .split(/[,;|]+|\s+/)
        .map((item) => item.replace(/[{}[\]]/g, '').trim())
        .filter(Boolean),
    })).filter((transaction) => transaction.tid && transaction.items.length);
    if (parsed.length) {
      setTransactions(parsed);
      setStatus(`استُوردت ${parsed.length} معاملة من ${fileName}`);
    } else setStatus('لم نجد صفوفاً صالحة بعد الأعمدة المختارة');
  };

  const download = (kind: 'csv' | 'xlsx') => {
    const rows = [
      ['العنصر', 'الظهور', 'الدعم', 'القرار'],
      ...candidates.c1.map((row) => [setLabel(row.items), String(row.count), `${row.support.toFixed(1)}%`, row.selected ? 'Selected' : 'Pruned']),
      ...candidates.c2.map((row) => [setLabel(row.items), String(row.count), `${row.support.toFixed(1)}%`, row.selected ? 'Selected' : 'Pruned']),
      ...candidates.c3.map((row) => [setLabel(row.items), String(row.count), `${row.support.toFixed(1)}%`, row.selected ? 'Selected' : 'Pruned']),
    ];
    if (kind === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Apriori report');
      const excel = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'misbar-apriori-report.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus('تم تجهيز تقرير Excel بصيغة XLSX');
      return;
    }
    const content = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'misbar-apriori-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`تم تجهيز تقرير ${kind === 'csv' ? 'CSV' : 'Excel'}`);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div dir="rtl" className={dark ? 'dark min-h-screen' : 'min-h-screen'}>
      <div className="lab-shell">
        <Sidebar active={activeNav} onNavigate={navigate} onOpenLegacy={onOpenLegacy} />
        <main className="lab-content">
          <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-5 py-4 backdrop-blur-xl lg:px-10">
            <div className="flex items-center gap-3">
              <div className="hidden size-2 rounded-full bg-primary md:block" />
              <div>
                <div className="mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">APR / WORKBENCH</div>
                <div className="mt-1 text-xs font-medium text-foreground">{activeNav === 'overview' ? 'مختبر التنقيب عن المعرفة' : activeNav === 'scans' ? 'تتبّع المسح التكراري' : activeNav === 'rules' ? 'تحليل قواعد الارتباط' : 'محرر مجموعة البيانات'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 text-[10px] text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-primary" />محلي وآمن</span>
              <button type="button" data-testid="button-toggle-theme" onClick={() => setDark((value) => !value)} className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary" aria-label="تبديل المظهر">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button type="button" data-testid="button-top-export" onClick={() => download('csv')} className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary sm:flex">
                <Download size={14} />تصدير سريع
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-8 lg:px-10">
            <section id="overview" className="rise-in scroll-mt-24">
              <div className="relative overflow-hidden rounded-[24px] border border-primary/25 bg-[#142d35] p-6 text-[#e9f5f2] shadow-[0_24px_70px_hsl(184_45%_10%/.25)] md:p-9">
                <div className="data-grid absolute inset-0 opacity-[.13]" />
                <div className="absolute -left-20 -top-28 size-72 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative grid gap-9 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div className="max-w-2xl">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      <Badge>LAB NOTE · 01</Badge>
                      <span className="mono text-[10px] text-slate-400">TDB / APRIORI / TRACEABLE</span>
                    </div>
                    <h1 className="display max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight md:text-6xl">اكتشف النمط،<br /><span className="text-primary">وتتبّع السبب.</span></h1>
                    <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">مختبر تفاعلي يشرح خوارزمية Apriori كما تعمل فعلاً — من المعاملة الخام إلى القاعدة القوية، خطوة بعد خطوة.</p>
                    <div className="mt-7 flex flex-wrap gap-3">
                      <button type="button" data-testid="button-run-hero" onClick={runAnalysis} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">
                        {isRunning ? <RefreshCw className="animate-spin" size={15} /> : <Play size={15} fill="currentColor" />}شغّل التجربة
                      </button>
                      <button type="button" data-testid="button-scroll-scans" onClick={() => navigate('scans')} className="flex items-center gap-2 rounded-xl border border-slate-500/60 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-primary hover:text-primary">
                        ابدأ من Scan 1 <ArrowLeft size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 lg:w-64">
                    <div className="rounded-2xl border border-slate-500/40 bg-slate-950/20 p-4"><div className="mono text-[10px] text-slate-400">SUPPORT</div><div className="display mt-2 text-3xl text-primary">{minSupportValue}%</div><div className="mt-1 text-[10px] text-slate-400">الحد الأدنى</div></div>
                    <div className="rounded-2xl border border-slate-500/40 bg-slate-950/20 p-4"><div className="mono text-[10px] text-slate-400">CONFIDENCE</div><div className="display mt-2 text-3xl text-accent">{minConfidenceValue}%</div><div className="mt-1 text-[10px] text-slate-400">الحد الأدنى</div></div>
                    <div className="col-span-2 flex items-center justify-between rounded-2xl border border-slate-500/40 bg-slate-950/20 p-3 text-[10px] text-slate-300"><span className="flex items-center gap-2"><span className="pulse-dot size-1.5 rounded-full bg-primary" />{status}</span><span className="mono text-slate-500">{transactions.length} TID</span></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="المعاملات" value={String(transactions.length).padStart(2, '0')} note="صفوف قابلة للتحرير في TDB" icon={<Database size={16} />} />
              <StatCard label="العناصر الفريدة" value={String(itemUniverse.length).padStart(2, '0')} note="بعد تنظيف مجموعة البيانات" icon={<BarChart3 size={16} />} accent="coral" />
              <StatCard label="المجموعات المتكررة" value={isRunning ? '—' : String(frequentCount).padStart(2, '0')} note="عبر مستويات L₁ → L₃" icon={<Check size={16} />} />
              <StatCard label="قواعد قوية" value={String(strongRules.length).padStart(2, '0')} note={`من أصل ${rules.length} قاعدة لـ I={2,3,5}`} icon={<GitBranch size={16} />} accent="coral" />
            </section>

            <section className="glass-card mt-8 rounded-2xl p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div><div className="mono text-[10px] uppercase tracking-[.16em] text-primary">EXPERIMENT CONTROLS</div><h2 className="mt-1 text-base font-bold">إعدادات التجربة</h2></div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={isRunning ? 'amber' : 'teal'}><span className={`size-1.5 rounded-full ${isRunning ? 'bg-[#c9943b]' : 'bg-primary'}`} />{isRunning ? 'جارٍ الحساب' : status}</Badge>
                  <button type="button" data-testid="button-run-analysis" onClick={runAnalysis} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-105">{isRunning ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}إعادة الحساب</button>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
                <label className="block"><span className="mb-2 block text-[11px] font-semibold text-muted-foreground">Minimum support <span className="mono mr-1 text-primary">minsup</span></span><div className="relative"><input data-testid="input-minsup" type="number" min="1" max="100" value={minsup} onChange={(event) => setMinsup(event.target.value)} className="mono w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" /><span className="absolute left-3 top-3 text-xs text-muted-foreground">%</span></div><input data-testid="slider-minsup" aria-label="Minimum support slider" type="range" min="1" max="100" value={minSupportValue} onChange={(event) => setMinsup(event.target.value)} className="mt-3 w-full accent-primary" /><ProgressBar value={minSupportValue} /></label>
                <label className="block"><span className="mb-2 block text-[11px] font-semibold text-muted-foreground">Minimum confidence <span className="mono mr-1 text-accent">minconf</span></span><div className="relative"><input data-testid="input-minconf" type="number" min="1" max="100" value={minconf} onChange={(event) => setMinconf(event.target.value)} className="mono w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15" /><span className="absolute left-3 top-3 text-xs text-muted-foreground">%</span></div><input data-testid="slider-minconf" aria-label="Minimum confidence slider" type="range" min="1" max="100" value={minConfidenceValue} onChange={(event) => setMinconf(event.target.value)} className="mt-3 w-full accent-accent" /><ProgressBar value={minConfidenceValue} color="coral" /></label>
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs leading-6 text-muted-foreground"><div className="mb-1 flex items-center gap-2 font-semibold text-foreground"><Settings2 size={14} className="text-primary" />لماذا هذه القيم؟</div>مع 4 معاملات، تعني <span className="mono text-primary">{thresholdCount.toFixed(1)}</span> مرات ظهور على الأقل للمرور من مستوى إلى آخر. عدّل العتبة وشاهد القرار يتغير.</div>
              </div>
            </section>

            <section id="dataset" className="mt-12 scroll-mt-24">
              <SectionHeading eyebrow="01 / DATASET" title="مجموعة TDB" detail="نقطة البداية في المثال المشروح. حرّر أي صف واختبر أثره على المسح فوراً." icon={<Database size={17} />} />
              <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                <div className="glass-card overflow-hidden rounded-2xl">
                  <div className="flex items-center justify-between border-b border-border p-4"><div className="flex items-center gap-2 text-sm font-bold"><Table2 size={16} className="text-primary" />جدول المعاملات</div><Badge tone="muted">TDB · {transactions.length} rows</Badge></div>
                  <div className="table-scroll">
                    {transactions.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center gap-2 p-6 text-center"><Database size={24} className="text-muted-foreground" /><p className="text-sm text-muted-foreground">لا توجد معاملات. أضف صفاً جديداً للبدء.</p></div> : <table className="w-full min-w-[510px] text-right text-xs">
                      <thead className="bg-muted/40 text-[10px] text-muted-foreground"><tr><th className="px-4 py-3 font-semibold">TID</th><th className="px-4 py-3 font-semibold">Items</th><th className="px-4 py-3 font-semibold">الحالة</th><th className="px-4 py-3 text-left font-semibold">إجراء</th></tr></thead>
                      <tbody className="divide-y divide-border">{transactions.map((transaction) => <tr key={transaction.tid} className="group hover:bg-primary/5" data-testid={`row-transaction-${transaction.tid}`}><td className="mono px-4 py-3 text-primary">{transaction.tid}</td><td className="px-4 py-3">{editingTid === transaction.tid ? <input autoFocus data-testid={`input-edit-items-${transaction.tid}`} defaultValue={transaction.items.join(', ')} onBlur={(event) => { updateItems(transaction.tid, event.target.value); setEditingTid(null); }} onKeyDown={(event) => { if (event.key === 'Enter') { updateItems(transaction.tid, event.currentTarget.value); setEditingTid(null); } }} className="mono w-full rounded-lg border border-primary bg-background px-2 py-1.5 text-xs outline-none" /> : <div className="flex flex-wrap gap-1.5">{transaction.items.map((item) => <span key={item} className="mono rounded-md bg-muted px-2 py-1 text-[11px]">{item}</span>)}</div>}</td><td className="px-4 py-3"><span className="flex items-center gap-1.5 text-[10px] text-primary"><span className="size-1.5 rounded-full bg-primary" />صالح</span></td><td className="px-4 py-3 text-left"><div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100"><button type="button" data-testid={`button-edit-transaction-${transaction.tid}`} onClick={() => setEditingTid(transaction.tid)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary" aria-label={`تعديل ${transaction.tid}`}><MoreHorizontal size={15} /></button><button type="button" data-testid={`button-delete-transaction-${transaction.tid}`} onClick={() => { setTransactions((current) => current.filter((item) => item.tid !== transaction.tid)); setStatus(`حُذفت المعاملة ${transaction.tid}`); }} className="rounded-lg p-2 text-muted-foreground hover:bg-accent/10 hover:text-accent" aria-label={`حذف ${transaction.tid}`}><Trash2 size={14} /></button></div></td></tr>)}</tbody>
                    </table>}
                  </div>
                  <div className="grid gap-2 border-t border-border bg-muted/20 p-3 md:grid-cols-[110px_1fr_auto]"><input data-testid="input-new-tid" value={newTid} onChange={(event) => setNewTid(event.target.value)} placeholder="TID جديد" className="mono rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary" /><input data-testid="input-new-items" value={newItems} onChange={(event) => setNewItems(event.target.value)} placeholder="العناصر: 1, 3, 4" className="mono rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary" /><button type="button" data-testid="button-add-transaction" onClick={addTransaction} className="flex items-center justify-center gap-1 rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"><Plus size={14} />إضافة</button></div>
                </div>

                <div className="glass-card rounded-2xl p-5">
                  <div className="mb-4 flex items-start justify-between gap-3"><div><div className="mono text-[10px] tracking-[.14em] text-primary">IMPORT / MAP</div><h3 className="mt-1 text-sm font-bold">استيراد بيانات جديدة</h3></div><Upload size={18} className="text-muted-foreground" /></div>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                  <button type="button" data-testid="button-upload-file" onClick={() => fileRef.current?.click()} className="group flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/5 px-4 py-7 text-center transition-colors hover:border-primary hover:bg-primary/10"><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-card text-primary shadow-sm"><Upload size={18} /></div><span className="text-xs font-semibold">{fileName || 'اسحب ملفاً أو اختر من جهازك'}</span><span className="mt-1 text-[10px] text-muted-foreground">CSV · XLSX · XLS</span></button>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-semibold text-muted-foreground">عمود TID<select data-testid="select-tid-column" value={tidColumn} onChange={(event) => setTidColumn(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-2 py-2 text-xs outline-none focus:border-primary">{uploadHeaders.map((header) => <option key={header} value={header}>{header}</option>)}</select></label><label className="text-[10px] font-semibold text-muted-foreground">عمود Items<select data-testid="select-items-column" value={itemsColumn} onChange={(event) => setItemsColumn(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-2 py-2 text-xs outline-none focus:border-primary">{uploadHeaders.map((header) => <option key={header} value={header}>{header}</option>)}</select></label></div>
                  <button type="button" data-testid="button-import-file" onClick={importUploadedData} disabled={!fileName || uploadedRows.length === 0} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"><FileSpreadsheet size={15} />تطبيق الاستيراد</button>
                  <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-muted-foreground"><Info size={13} className="mt-0.5 shrink-0 text-primary" />يفصل CSV العناصر بفاصلة أو مسافة منقوطة. لا تُرفع البيانات إلى أي خادم.</p>
                </div>
              </div>
            </section>

            <section id="scans" className="mt-14 scroll-mt-24">
              <SectionHeading eyebrow="02 / APRIORI TRACE" title="رحلة المرشح" detail="تابع كيف يُولد المرشح، كيف يُحسب دعمه، ولماذا يبقى Selected أو يُحذف Pruned." icon={<ScanSearch size={17} />} />
              <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 p-2">
                {scanLabels.map((label) => <button key={label.scan} type="button" data-testid={`button-scan-${label.scan}`} onClick={() => setActiveScan(label.scan)} className={`flex min-w-[150px] flex-1 items-center gap-3 rounded-xl px-3 py-3 text-right transition-all ${activeScan === label.scan ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'}`}><span className={`mono flex size-8 items-center justify-center rounded-lg text-xs ${activeScan === label.scan ? 'bg-primary-foreground/15' : 'bg-muted text-primary'}`}>0{label.scan}</span><span><span className="block text-xs font-bold">Scan {label.scan}</span><span className={`mono text-[10px] ${activeScan === label.scan ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{label.candidate} → {label.frequent} · {label.caption}</span></span>{activeScan === label.scan && <ChevronDown className="mr-auto" size={15} />}</button>)}
              </div>
              <div className="glass-card rounded-2xl p-5 md:p-6">
                {isRunning ? <div className="space-y-4"><div className="h-5 w-44 animate-pulse rounded bg-muted" /><div className="h-32 animate-pulse rounded-xl bg-muted" /><div className="h-10 animate-pulse rounded-xl bg-muted" /></div> : activeScan === 1 ? <><div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><div className="mono text-xs text-primary">C₁ / L₁</div><h3 className="mt-1 text-base font-bold">المسح الأول: العناصر المفردة</h3></div><div className="flex items-center gap-2"><Badge tone="muted">{candidates.c1.length} مرشحين</Badge><Badge>{candidates.l1.length} ناجح</Badge></div></div><CandidateTable rows={candidates.c1} columns="C1" minSupport={minSupportValue} transactionCount={transactions.length} emptyText="أضف معاملات تحتوي على عناصر للبدء." /><div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-primary"><Check size={14} />L₁ · الناجون</div><div className="flex flex-wrap gap-2">{candidates.l1.map((item) => <span key={item} className="mono rounded-lg border border-primary/20 bg-card px-2.5 py-1.5 text-xs">{setLabel([item])}</span>)}</div></div><div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-xs leading-6"><div className="mb-1 flex items-center gap-2 font-bold text-accent"><CircleHelp size={14} />قاعدة Apriori</div>العنصر 4 لا يظهر مرتين، لذلك لا يمكن لأي مجموعة أكبر تحتويه أن تصبح متكررة.</div></div></> : activeScan === 2 ? <><div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><div className="mono text-xs text-primary">C₂ / L₂</div><h3 className="mt-1 text-base font-bold">المسح الثاني: الأزواج</h3></div><div className="flex items-center gap-2"><Badge tone="muted">{candidates.c2.length} مرشحين</Badge><Badge>{candidates.l2.length} ناجح</Badge></div></div><CandidateTable rows={candidates.c2} columns="C2" minSupport={minSupportValue} transactionCount={transactions.length} emptyText="نحتاج عنصرين متكررين على الأقل من L₁." /><div className="mt-5 rounded-xl border border-border bg-muted/30 p-4 text-xs leading-6 text-muted-foreground"><span className="font-bold text-foreground">التوليد:</span> نصل كل عناصر L₁ معاً، ثم نتحقق من ظهور الزوج في المعاملات. الزوج <span className="mono text-accent">{setLabel(['1', '2'])}</span> يُحذف لأنه ظهر مرة واحدة فقط.</div></> : <><div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><div className="mono text-xs text-primary">C₃ / L₃</div><h3 className="mt-1 text-base font-bold">المسح الثالث: الثلاثيات</h3></div><div className="flex items-center gap-2"><Badge tone="muted">{candidates.c3.length} مرشحين</Badge><Badge>{candidates.l3.length} ناجح</Badge></div></div><CandidateTable rows={candidates.c3} columns="C3" minSupport={minSupportValue} transactionCount={transactions.length} emptyText="يحتاج هذا المستوى إلى أزواج ناجحة في L₂." /><div className="mt-5 flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs leading-6"><div className="flex items-center gap-2 font-bold text-primary"><ArrowUpRight size={15} />النتيجة التي سنبني عليها القواعد</div><p className="text-muted-foreground">المجموعة <span className="mono font-semibold text-foreground">{setLabel(candidates.l3[0] || ['2', '3', '5'])}</span> هي الوحيدة التي اجتازت الدعم في هذا المستوى.</p></div></>}
              </div>
            </section>

            <section id="rules" className="mt-14 scroll-mt-24">
              <SectionHeading eyebrow="03 / RULES" title="من المجموعة إلى القاعدة" detail="I={2,3,5} تولّد ستة اتجاهات. الثقة ليست تخميناً — إنها كسر واضح يمكنك قراءته." icon={<GitBranch size={17} />} />
              <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                <div className="glass-card overflow-hidden rounded-2xl">
                  <div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:flex-row sm:items-center"><div><div className="mono text-[10px] tracking-[.16em] text-primary">RULE MATRIX / I={'{2,3,5}'}</div><h3 className="mt-1 text-sm font-bold">جميع القواعد المحتملة</h3></div><div className="flex items-center gap-2"><Badge tone="coral">{strongRules.length} قوية</Badge><button type="button" data-testid="button-toggle-confidence" onClick={() => setShowConfidence((value) => !value)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${showConfidence ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{showConfidence ? 'إظهار الثقة' : 'إخفاء الثقة'}</button></div></div>
                  <div className="table-scroll"><table className="w-full min-w-[640px] text-right text-xs"><thead className="bg-muted/40 text-[10px] text-muted-foreground"><tr><th className="px-5 py-3">القاعدة</th><th className="px-3 py-3">الحساب الدقيق</th><th className="px-3 py-3">الثقة</th><th className="px-5 py-3">القرار</th></tr></thead><tbody className="divide-y divide-border">{rules.map((rule) => <tr key={rule.id} className={rule.strong ? 'bg-primary/5' : 'hover:bg-muted/30'} data-testid={`row-rule-${rule.id}`}><td className="px-5 py-4"><span className="mono mr-2 text-[10px] text-muted-foreground">{rule.id}</span><span className="mono">{setLabel(rule.left)} → {setLabel(rule.right)}</span></td><td className="mono px-3 py-4 text-[10px] text-muted-foreground">{rule.unionCount} / {rule.leftCount} {showConfidence && <span className="mr-1">= {rule.confidence.toFixed(1)}%</span>}</td><td className="px-3 py-4"><div className="flex items-center gap-2">{showConfidence && <><span className={`mono font-semibold ${rule.strong ? 'text-primary' : 'text-muted-foreground'}`}>{rule.confidence.toFixed(1)}%</span><div className="w-16"><ProgressBar value={rule.confidence} color={rule.strong ? 'teal' : 'coral'} /></div></>}</div></td><td className="px-5 py-4">{rule.strong ? <Badge><Check size={11} />Strong</Badge> : <Badge tone="muted">أقل من {minConfidenceValue}%</Badge>}</td></tr>)}</tbody></table></div>
                </div>

                <div className="glass-card rounded-2xl p-5">
                  <div className="mb-4 flex items-center justify-between"><div><div className="mono text-[10px] tracking-[.16em] text-accent">SIGNAL / STRONG RULES</div><h3 className="mt-1 text-sm font-bold">القواعد التي تستحق الانتباه</h3></div><ShieldCheck size={18} className="text-primary" /></div>
                  <div className="space-y-3">{strongRules.length === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-center"><p className="text-xs text-muted-foreground">لا توجد قاعدة تتجاوز minconf الحالية.</p><button type="button" data-testid="button-reset-minconf" onClick={() => setMinconf('70')} className="mt-3 text-xs font-semibold text-primary hover:underline">العودة إلى 70%</button></div> : strongRules.map((rule) => <div key={rule.id} className="relative overflow-hidden rounded-xl border border-primary/25 bg-primary/5 p-4"><div className="absolute inset-y-0 right-0 w-1 bg-primary" /><div className="flex items-start justify-between gap-2"><div><div className="mono text-[10px] text-primary">{rule.id} · STRONG RULE</div><div className="mono mt-2 text-sm font-semibold">{setLabel(rule.left)} <span className="text-accent">→</span> {setLabel(rule.right)}</div></div><div className="mono text-xl font-semibold text-primary">{rule.confidence.toFixed(0)}%</div></div><div className="mt-3 border-t border-primary/15 pt-3 text-[10px] leading-5 text-muted-foreground">لأن {setLabel(rule.left)} ظهر {rule.leftCount} مرات، وظهر مع {setLabel(rule.right)} في {rule.unionCount} منها.</div></div>)}</div>
                  <div className="mt-4 rounded-xl bg-muted/45 p-3 text-[10px] leading-5 text-muted-foreground"><span className="font-bold text-foreground">قراءة سريعة:</span> الثقة تقيس احتمال رؤية الطرف الأيمن عندما نرى الطرف الأيسر، لا العكس.</div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.05fr]">
              <div className="glass-card rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between"><div><div className="mono text-[10px] tracking-[.16em] text-primary">RELATIONSHIP MAP</div><h3 className="mt-1 text-sm font-bold">خريطة العلاقة</h3></div><button type="button" data-testid="button-toggle-map-values" onClick={() => setShowConfidence((value) => !value)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary" aria-label="تبديل قيم الخريطة"><SlidersHorizontal size={15} /></button></div>
                <div className="relative min-h-[245px] overflow-hidden rounded-xl border border-border bg-[#13242c]">
                  <div className="data-grid absolute inset-0 opacity-20" />
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 245" role="img" aria-label="شبكة العلاقات بين العناصر 2 و3 و5"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#58d3c4" /></marker></defs><path d="M120 76 Q220 32 355 76" stroke="#58d3c4" strokeOpacity=".7" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" /><path d="M355 132 Q250 185 120 132" stroke="#f28c78" strokeOpacity=".7" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" /><path d="M136 103 Q245 104 340 103" stroke="#58d3c4" strokeOpacity=".5" strokeDasharray="4 5" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" /></svg>
                  <div className="absolute right-[12%] top-[22%] flex size-16 flex-col items-center justify-center rounded-full border border-primary/70 bg-primary/15 text-primary shadow-[0_0_0_8px_hsl(var(--primary)/.06)]"><span className="mono text-lg font-semibold">2</span><span className="mono text-[8px]">{showConfidence ? '100%' : 'item'}</span></div>
                  <div className="absolute left-1/2 top-[55%] flex size-16 -translate-x-1/2 flex-col items-center justify-center rounded-full border border-accent/70 bg-accent/15 text-accent"><span className="mono text-lg font-semibold">3</span><span className="mono text-[8px]">{showConfidence ? '100%' : 'item'}</span></div>
                  <div className="absolute left-[12%] top-[22%] flex size-16 flex-col items-center justify-center rounded-full border border-primary/70 bg-primary/15 text-primary"><span className="mono text-lg font-semibold">5</span><span className="mono text-[8px]">{showConfidence ? '100%' : 'item'}</span></div>
                  <div className="absolute bottom-3 right-3 rounded-lg border border-slate-600 bg-slate-950/50 px-2 py-1 text-[9px] text-slate-400"><span className="mr-1 inline-block size-1.5 rounded-full bg-primary" />قواعد قوية فقط</div>
                </div>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <div className="mb-4 flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><FileText size={16} /></div><div><div className="mono text-[10px] tracking-[.16em] text-accent">EXPORT / SHARE</div><h3 className="mt-1 text-sm font-bold">احفظ أثر التجربة</h3></div></div>
                <p className="max-w-lg text-xs leading-6 text-muted-foreground">صدّر جدول المرشحين والقرارات وقواعد I={'{2,3,5}'} لتشاركه في المحاضرة أو تعود إليه في المراجعة.</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-3"><button type="button" data-testid="button-export-pdf" onClick={() => { setStatus('فتح نافذة الطباعة للحفظ كـ PDF'); window.print(); }} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/35 px-3 py-3 text-xs font-semibold hover:border-primary hover:text-primary"><FileText size={15} />PDF</button><button type="button" data-testid="button-export-excel" onClick={() => download('xlsx')} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/35 px-3 py-3 text-xs font-semibold hover:border-primary hover:text-primary"><FileSpreadsheet size={15} />Excel</button><button type="button" data-testid="button-export-csv" onClick={() => download('csv')} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/35 px-3 py-3 text-xs font-semibold hover:border-primary hover:text-primary"><Download size={15} />CSV</button></div>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5 text-[10px] text-muted-foreground"><ShieldCheck size={13} className="text-primary" />التقرير يُنشأ محلياً من الحالة الحالية فقط.</div>
              </div>
            </section>

            <footer className="mt-14 flex flex-col justify-between gap-4 border-t border-border pt-5 text-[10px] text-muted-foreground sm:flex-row sm:items-center"><div className="flex items-center gap-2"><FlaskConical size={14} className="text-primary" /><span>مِسبار · Apriori Learning Lab</span></div><div className="flex items-center gap-4"><span className="mono">TDB / {transactions.length} transactions</span><button type="button" data-testid="button-back-top" onClick={scrollToTop} className="flex items-center gap-1 hover:text-primary">العودة للأعلى <ArrowUpRight size={13} /></button></div></footer>
          </div>
        </main>
      </div>
    </div>
  );
}
