import type { FPNode } from "@/lib/fp-growth";
import { useState } from "react";

function FPNodeCard({ node }: { node: FPNode }) {
  const [open, setOpen] = useState(true);
  const childrenArray = Array.from(node.children.values());
  const hasChildren = childrenArray.length > 0;
  
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 100 }}>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={`px-4 py-2 rounded-full border shadow-sm transition-all flex flex-col items-center justify-center ${
          node.item === "root"
            ? "bg-[color:var(--secondary)] border-border/50 text-muted-foreground"
            : "glass hover:shadow-[0_0_20px_-5px_var(--neon)] cursor-pointer border-[color:var(--neon)]/30"
        }`}
      >
        <div className={`font-bold ${node.item === "root" ? "" : "text-[color:var(--neon)]"}`}>
          {node.item}
        </div>
        {node.item !== "root" && (
          <div className="text-xs text-white bg-[color:var(--neon)]/20 px-2 py-0.5 rounded-full mt-1">
            {node.count}
          </div>
        )}
      </button>
      
      {hasChildren && open && (
        <div className="relative pt-6 mt-1">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-[color:var(--neon)]/30" />
          <div className="flex gap-6 items-start relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-[color:var(--neon)]/20" />
            {childrenArray.map((c, i) => (
              <div key={i} className="relative pt-0">
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-[color:var(--neon)]/30" />
                <div className="pt-6">
                  <FPNodeCard node={c} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FPTreeView({ root }: { root: FPNode }) {
  return (
    <div className="w-full overflow-auto p-8 rounded-2xl glass">
      <div className="min-w-max flex justify-center">
        <FPNodeCard node={root} />
      </div>
    </div>
  );
}
