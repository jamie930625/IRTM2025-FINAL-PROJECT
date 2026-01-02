// src/components/explain-panel/RewrittenQuery.tsx
"use client";

import { useExplain } from "@/contexts/ExplainContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RewrittenQuery() {
  const { explainData } = useExplain();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md">重寫後的查詢</CardTitle>
      </CardHeader>
      <CardContent>
        {explainData?.rewritten_query ? (
          <pre className="bg-muted/50 p-3 rounded-md">
            <code className="text-sm font-mono">
              {explainData.rewritten_query}
            </code>
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            尚未有查詢
          </p>
        )}
      </CardContent>
    </Card>
  );
}
