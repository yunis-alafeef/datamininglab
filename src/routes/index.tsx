import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import AprioriLab from "@/components/AprioriLab";
import LegacyAlgorithms from "@/components/LegacyAlgorithms";

function Home() {
  const [mode, setMode] = useState<"apriori" | "legacy">("apriori");
  return mode === "legacy"
    ? <LegacyAlgorithms onOpenApriori={() => setMode("apriori")} />
    : <AprioriLab onOpenLegacy={() => setMode("legacy")} />;
}

export const Route = createFileRoute("/")({ component: Home });
