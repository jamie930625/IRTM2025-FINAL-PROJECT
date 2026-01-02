// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { DocumentPanel } from "@/components/document-panel/DocumentPanel";
import { ChatPanel } from "@/components/chat-panel/ChatPanel";
import { NotebookPanel } from "@/components/notebook-panel/NotebookPanel";
import { Header } from "@/components/layout/Header";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(true);
  const [isExplainPanelOpen, setIsExplainPanelOpen] = useState(true);
  const [notebookWidth, setNotebookWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Handle mouse move and mouse up globally for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 800) {
        setNotebookWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Document Panel */}
        <Collapsible 
          open={isDocumentPanelOpen} 
          onOpenChange={setIsDocumentPanelOpen} 
          className="relative"
        >
          <aside
            className={`flex flex-col border-r transition-all duration-300 ease-in-out 
              ${isDocumentPanelOpen ? "w-[280px] md:flex" : "w-0 md:w-[40px]"} `}
          >
            <CollapsibleContent className="flex-1 flex flex-col">
              <DocumentPanel />
            </CollapsibleContent>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary border">
                  {isDocumentPanelOpen ? (
                    <ChevronLeft className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
          </aside>
        </Collapsible>
        


        {/* Main Content - Chat Panel */}
        <main className="flex-1 flex flex-col">
          <ChatPanel />
        </main>
        


        {/* Right Sidebar - Notebook Panel */}
        <Collapsible 
          open={isExplainPanelOpen} 
          onOpenChange={setIsExplainPanelOpen} 
          className="relative"
        >
          <aside
            className={`flex flex-col border-l transition-all duration-300 ease-in-out relative
              ${isExplainPanelOpen ? "lg:flex" : "w-0 lg:w-[40px]"} `}
            style={isExplainPanelOpen ? { width: `${notebookWidth}px`, minWidth: '280px', maxWidth: '800px', height: '100%' } : {}}
          >
            {/* Resizer handle */}
            {isExplainPanelOpen && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary z-10 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
              />
            )}
            
            <CollapsibleContent className="flex-1 flex flex-col h-full overflow-hidden">
              <NotebookPanel />
            </CollapsibleContent>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary border">
                  {isExplainPanelOpen ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
          </aside>
        </Collapsible>
      </div>
    </div>
  );
}