// src/components/explain-panel/RetrievedPassages.tsx
"use client";

import { useExplain } from "@/contexts/ExplainContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export function RetrievedPassages() {
  const { explainData } = useExplain();
  const passages = explainData?.retrieved_passages || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md">檢索結果 (Top-K)</CardTitle>
        <CardDescription>RAG 模型找到的最相關段落</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {passages.length > 0 ? (
          passages.map((passage) => (
            <div key={passage.rank} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">排名 #{passage.rank}</Badge>
                <Badge variant="outline">相關性: {passage.score.toFixed(2)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                {`"`}{passage.text}{`"`}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>{passage.source}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">
            尚未有檢索結果
          </p>
        )}
      </CardContent>
    </Card>
  );
}
