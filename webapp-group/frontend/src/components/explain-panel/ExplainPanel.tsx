// src/components/explain-panel/ExplainPanel.tsx
import { RewrittenQuery } from "./RewrittenQuery";
import { RetrievedPassages } from "./RetrievedPassages";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ExplainPanel() {
  return (
    <div className="p-4 h-full flex flex-col gap-4 bg-muted/20 overflow-y-auto">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">RAG 流程細節</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>此面板顯示模型如何處理您的問題</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <RewrittenQuery />
      <RetrievedPassages />
    </div>
  );
}
