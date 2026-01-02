// src/components/chat-panel/CitationList.tsx
import { Citation } from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, FileText, Book } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type CitationListProps = {
  citations: Citation[];
};

export function CitationList({ citations }: CitationListProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <Collapsible className="mt-4">
      <CollapsibleTrigger className="flex items-center gap-1 text-sm font-semibold group">
        <ChevronRight className="w-4 h-4 transition-transform duration-200 transform group-data-[state=open]:rotate-90" />
        引用來源 ({citations.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3 pl-5">
        {citations.map((citation) => (
          <div key={citation.id} className="p-3 border rounded-lg bg-muted/50">
             <div className="flex items-center gap-2 mb-2">
                <Badge>{citation.id}</Badge>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {citation.source.endsWith('.pdf') ? <Book className="w-3 h-3"/> : <FileText className="w-3 h-3" />}
                    <span>{citation.source}{citation.page && ` (第 ${citation.page} 頁)`}</span>
                </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {`"`}{citation.text}{`"`}
            </p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
