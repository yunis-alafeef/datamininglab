import type { TreeNode } from "@/lib/dm-algorithms";
import { useState } from "react";

function NodeCard({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = !node.isLeaf && node.children && node.children.length > 0;
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 120 }}>
      {node.value !== undefined && (
        <div className="mb-2 text-[11px] px-2 py-0.5 rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 text-[color:var(--gold)] font-medium">
          {node.value}
        </div>
      )}
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={`px-4 py-2.5 rounded-xl text-sm text-center transition-all ${
          node.isLeaf
            ? "bg-gradient-to-br from-[color:var(--imperial)]/30 to-[color:var(--neon)]/20 border border-[color:var(--neon)]/50 text-white shadow-lg"
            : "glass hover:shadow-[0_0_30px_-5px_var(--gold)] cursor-pointer"
        }`}
      >
        <div className={`font-semibold ${node.isLeaf ? "text-white" : "gold-text text-base"}`}>
          {node.isLeaf ? `→ ${node.label}` : node.attribute}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {node.count} سجل
          {node.entropy !== undefined && ` · H=${node.entropy.toFixed(3)}`}
          {node.gain !== undefined && ` · Gain=${node.gain.toFixed(3)}`}
        </div>
      </button>
      {hasChildren && open && (
        <div className="relative pt-6 mt-1">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-[color:var(--gold)]/50" />
          <div className="flex gap-6 items-start relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-[color:var(--gold)]/40" />
            {node.children!.map((c, i) => (
              <div key={i} className="relative pt-0">
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-[color:var(--gold)]/50" />
                <div className="pt-6">
                  <NodeCard node={c} depth={depth + 1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TreeView({ root }: { root: TreeNode }) {
  return (
    <div className="w-full overflow-auto p-8 rounded-2xl glass">
      <div className="min-w-max flex justify-center">
        <NodeCard node={root} />
      </div>
    </div>
  );
}
