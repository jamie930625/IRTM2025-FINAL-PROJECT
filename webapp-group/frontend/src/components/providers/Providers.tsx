// src/components/providers/Providers.tsx
// Updated: SimpleChatProvider wraps NotebookProvider for cross-context communication
// NotebookProvider registers callbacks with SimpleChatContext for note editing from main chat
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { DocumentProvider } from "@/contexts/DocumentContext";
import { ExplainProvider } from "@/contexts/ExplainContext";
import { SimpleChatProvider } from "@/contexts/SimpleChatContext";
import { NotebookProvider } from "@/contexts/NotebookContext";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ExplainProvider>
        <DocumentProvider>
          {/* SimpleChatProvider must wrap NotebookProvider 
              so NotebookProvider can register callbacks */}
          <SimpleChatProvider>
            <NotebookProvider>
              {children}
              <Toaster richColors />
            </NotebookProvider>
          </SimpleChatProvider>
        </DocumentProvider>
      </ExplainProvider>
    </NextThemesProvider>
  );
}
