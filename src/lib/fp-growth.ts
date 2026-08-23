export type Row = Record<string, string | number>;

export type FPParsingFormat = "items-column" | "item-per-row" | "binary";

export interface FPParsingConfig {
  format: FPParsingFormat;
  tidColumn: string;
  itemsColumn?: string; // used for items-column and item-per-row
  itemDelimiter?: string; // used for items-column
}

export interface Transaction {
  id: string;
  items: string[];
}

export function parseTransactions(rows: Row[], config: FPParsingConfig): Transaction[] {
  if (rows.length === 0) return [];
  if (!config.tidColumn) return [];

  const map = new Map<string, Set<string>>();

  for (const row of rows) {
    const tid = String(row[config.tidColumn]).trim();
    if (!tid) continue;

    if (!map.has(tid)) {
      map.set(tid, new Set());
    }
    const itemsSet = map.get(tid)!;

    if (config.format === "items-column" && config.itemsColumn) {
      const val = String(row[config.itemsColumn] || "");
      if (val) {
        const parts = val.split(config.itemDelimiter || ",").map(s => s.trim()).filter(Boolean);
        for (const p of parts) itemsSet.add(p);
      }
    } else if (config.format === "item-per-row" && config.itemsColumn) {
      const val = String(row[config.itemsColumn] || "").trim();
      if (val) {
        itemsSet.add(val);
      }
    } else if (config.format === "binary") {
      for (const col of Object.keys(row)) {
        if (col === config.tidColumn) continue;
        const val = String(row[col]).trim().toLowerCase();
        if (val === "1" || val === "true" || val === "yes") {
          itemsSet.add(col.trim());
        }
      }
    }
  }

  const transactions: Transaction[] = [];
  for (const [id, items] of map.entries()) {
    if (items.size > 0) {
      transactions.push({ id, items: Array.from(items) });
    }
  }

  return transactions;
}

export class FPNode {
  item: string;
  count: number;
  parent: FPNode | null;
  children: Map<string, FPNode>;
  nodeLink: FPNode | null;

  constructor(item: string, parent: FPNode | null = null) {
    this.item = item;
    this.count = 0;
    this.parent = parent;
    this.children = new Map();
    this.nodeLink = null;
  }
}

export interface FListEntry {
  item: string;
  support: number;
}

export interface HeaderTableEntry {
  item: string;
  support: number;
  head: FPNode | null;
  tail: FPNode | null;
}

export interface FrequentPattern {
  items: string[];
  support: number;
}

export interface ConditionalPatternBase {
  item: string;
  paths: { items: string[]; count: number }[];
}

export interface FPStepResult {
  fList: FListEntry[];
  orderedTransactions: Transaction[];
  tree: FPTree;
  conditionalBases: Record<string, ConditionalPatternBase>;
  conditionalTrees: Record<string, FPTree>;
  frequentPatterns: FrequentPattern[];
}

export class FPTree {
  root: FPNode;
  headerTable: Map<string, HeaderTableEntry>;

  constructor() {
    this.root = new FPNode("root");
    this.headerTable = new Map();
  }

  addTransaction(items: string[], count = 1) {
    let currentNode = this.root;
    for (const item of items) {
      if (!currentNode.children.has(item)) {
        const newNode = new FPNode(item, currentNode);
        currentNode.children.set(item, newNode);
        
        // Update header table
        if (this.headerTable.has(item)) {
          const entry = this.headerTable.get(item)!;
          if (entry.tail) {
            entry.tail.nodeLink = newNode;
          }
          entry.tail = newNode;
          if (!entry.head) {
            entry.head = newNode;
          }
        }
      }
      currentNode = currentNode.children.get(item)!;
      currentNode.count += count;
    }
  }
}

export function buildFList(transactions: Transaction[], minSupCount: number): FListEntry[] {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    for (const item of t.items) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
  }

  const fList: FListEntry[] = [];
  for (const [item, support] of counts.entries()) {
    if (support >= minSupCount) {
      fList.push({ item, support });
    }
  }

  // Sort descending by support, then alphabetical
  fList.sort((a, b) => b.support - a.support || a.item.localeCompare(b.item));
  return fList;
}

export function buildFPTree(transactions: Transaction[], fList: FListEntry[]): FPTree {
  const tree = new FPTree();
  const fListSet = new Set(fList.map(e => e.item));
  const fListOrder = new Map(fList.map((e, i) => [e.item, i]));

  // Initialize header table
  for (const entry of fList) {
    tree.headerTable.set(entry.item, { item: entry.item, support: entry.support, head: null, tail: null });
  }

  for (const t of transactions) {
    const filteredItems = t.items.filter(item => fListSet.has(item));
    filteredItems.sort((a, b) => fListOrder.get(a)! - fListOrder.get(b)!);
    if (filteredItems.length > 0) {
      tree.addTransaction(filteredItems);
    }
  }
  return tree;
}

function getPrefixPath(node: FPNode): { items: string[]; count: number } {
  let p = node.parent;
  const items: string[] = [];
  while (p && p.item !== "root") {
    items.push(p.item);
    p = p.parent;
  }
  return { items: items.reverse(), count: node.count };
}

export function getConditionalPatternBases(tree: FPTree): Record<string, ConditionalPatternBase> {
  const bases: Record<string, ConditionalPatternBase> = {};
  
  // Iterate items bottom up (reverse f-list order)
  const items = Array.from(tree.headerTable.values()).sort((a, b) => a.support - b.support);
  
  for (const entry of items) {
    const paths: { items: string[]; count: number }[] = [];
    let node = entry.head;
    while (node) {
      const path = getPrefixPath(node);
      if (path.items.length > 0) {
        paths.push(path);
      }
      node = node.nodeLink;
    }
    bases[entry.item] = { item: entry.item, paths };
  }
  return bases;
}

export function fpGrowth(transactions: Transaction[], minSupCount: number): FPStepResult {
  const fList = buildFList(transactions, minSupCount);
  
  const fListSet = new Set(fList.map(e => e.item));
  const fListOrder = new Map(fList.map((e, i) => [e.item, i]));
  
  const orderedTransactions: Transaction[] = transactions.map(t => {
    const filteredItems = t.items.filter(item => fListSet.has(item));
    filteredItems.sort((a, b) => fListOrder.get(a)! - fListOrder.get(b)!);
    return { id: t.id, items: filteredItems };
  }).filter(t => t.items.length > 0);

  const tree = buildFPTree(transactions, fList);
  
  const conditionalBases = getConditionalPatternBases(tree);
  const conditionalTrees: Record<string, FPTree> = {};
  const frequentPatterns: FrequentPattern[] = [];

  function mine(currentTree: FPTree, prefix: string[]) {
    // Process bottom up
    const entries = Array.from(currentTree.headerTable.values()).sort((a, b) => a.support - b.support);
    
    for (const entry of entries) {
      const newPattern = [...prefix, entry.item];
      frequentPatterns.push({ items: newPattern, support: entry.support });

      // Build conditional tree for newPattern
      let node = entry.head;
      const paths: { items: string[]; count: number }[] = [];
      while (node) {
        const path = getPrefixPath(node);
        if (path.items.length > 0) {
          paths.push(path);
        }
        node = node.nodeLink;
      }
      
      // Calculate local fList for conditional tree
      const localCounts = new Map<string, number>();
      for (const p of paths) {
        for (const item of p.items) {
          localCounts.set(item, (localCounts.get(item) || 0) + p.count);
        }
      }
      
      const localFList: FListEntry[] = [];
      for (const [item, support] of localCounts.entries()) {
        if (support >= minSupCount) {
          localFList.push({ item, support });
        }
      }
      localFList.sort((a, b) => b.support - a.support || a.item.localeCompare(b.item));
      
      if (localFList.length > 0) {
        const condTree = new FPTree();
        for (const entry of localFList) {
          condTree.headerTable.set(entry.item, { item: entry.item, support: entry.support, head: null, tail: null });
        }
        
        const localFListSet = new Set(localFList.map(e => e.item));
        const localFListOrder = new Map(localFList.map((e, i) => [e.item, i]));

        for (const p of paths) {
          const filtered = p.items.filter(i => localFListSet.has(i));
          filtered.sort((a, b) => localFListOrder.get(a)! - localFListOrder.get(b)!);
          if (filtered.length > 0) {
            condTree.addTransaction(filtered, p.count);
          }
        }
        
        if (prefix.length === 0) {
          conditionalTrees[entry.item] = condTree;
        }
        
        if (condTree.root.children.size > 0) {
          mine(condTree, newPattern);
        }
      }
    }
  }

  mine(tree, []);

  // Format frequent patterns: internal logic produces patterns in various orders. Sort them.
  frequentPatterns.sort((a, b) => b.support - a.support || a.items.join(',').localeCompare(b.items.join(',')));

  return {
    fList,
    orderedTransactions,
    tree,
    conditionalBases,
    conditionalTrees,
    frequentPatterns
  };
}
