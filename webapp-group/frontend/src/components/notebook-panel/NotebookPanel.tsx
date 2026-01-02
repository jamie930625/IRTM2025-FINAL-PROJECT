// src/components/notebook-panel/NotebookPanel.tsx
// Updated: Removed NotebookChat UI, editing is now driven from main chat input
// Added: Selection tracking for selection-aware editing
// Added: LaTeX math formula rendering support with remark-math and rehype-katex
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useNotebook } from '@/contexts/NotebookContext';
import { useSimpleChat } from '@/contexts/SimpleChatContext';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileText, 
  Sparkles, 
  Trash2,
  Loader2,
  Eye,
  Edit2,
  MousePointer2
} from 'lucide-react';
import { exportToMarkdown, exportToPDF } from '@/lib/notebook-export';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';
import '@/components/notebook-panel/notebook-markdown.css';
// KaTeX CSS for math formula rendering
import 'katex/dist/katex.min.css';

/**
 * NotebookPanel - Right sidebar notebook panel with Obsidian-style markdown editing
 * 
 * Layout structure:
 * - Header (fixed, non-scrollable): Title + buttons + mode toggle
 * - Content Area (flexible, scrollable): Editor or Preview
 * - Selection indicator (shows when text is selected)
 * 
 * Note: AI editing is now driven from the main chat input.
 * Users can select text and type commands like "改成條列式" in the main chat.
 */
export function NotebookPanel() {
  const { 
    content, 
    updateContent, 
    generateFromChat, 
    isGenerating, 
    isEditing,
    clearNotebook,
    selection,
    updateSelection,
    textareaRef 
  } = useNotebook();
  const { messages } = useSimpleChat();
  const [isPreview, setIsPreview] = useState(false);

  /**
   * Handle text selection in the textarea
   * Updates the selection state in NotebookContext for selection-aware editing
   */
  const handleSelectionChange = useCallback(() => {
    if (textareaRef.current && !isPreview) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        updateSelection({
          selectedText: content.substring(start, end),
          selectionStart: start,
          selectionEnd: end,
          hasSelection: true,
        });
      } else {
        updateSelection({
          selectedText: '',
          selectionStart: 0,
          selectionEnd: 0,
          hasSelection: false,
        });
      }
    }
  }, [content, isPreview, textareaRef, updateSelection]);

  // Handler: Generate notebook from chat history
  const handleGenerateFromChat = async () => {
    if (messages.length === 0) {
      toast.error('對話歷史為空，無法生成筆記');
      return;
    }

    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    await generateFromChat(conversationHistory);
  };

  // Handler: Export to Markdown
  const handleExportMarkdown = () => {
    if (!content.trim()) {
      toast.error('筆記內容為空，無法匯出');
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    exportToMarkdown(content, `notebook-${timestamp}.md`);
    toast.success('Markdown 檔案已下載');
  };

  // Handler: Export to PDF
  const handleExportPDF = async () => {
    if (!content.trim()) {
      toast.error('筆記內容為空，無法匯出');
      return;
    }
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      await exportToPDF(content, `notebook-${timestamp}.pdf`);
      toast.success('PDF 檔案已準備列印');
    } catch (error) {
      console.error('[ERROR] Failed to export PDF:', error);
      toast.error('匯出 PDF 失敗');
    }
  };

  // Handler: Clear notebook
  const handleClear = () => {
    if (confirm('確定要清除所有筆記內容嗎？此操作無法復原。')) {
      clearNotebook();
    }
  };

  // Handler: Toggle preview mode
  const handleTogglePreview = () => {
    setIsPreview(!isPreview);
  };

  return (
    <div 
      className="flex flex-col h-full bg-background overflow-hidden"
      style={{ height: '100%' }}
    >
      {/* ============================================
          HEADER - Fixed at top (flex: 0 0 auto)
          ============================================ */}
      <header className="flex-shrink-0 border-b bg-background">
        {/* Title row with action buttons */}
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">筆記本</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground">(Obsidian-style)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>支援 Markdown 格式，類似 Obsidian 的編輯體驗</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Generate from chat button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateFromChat}
                    disabled={isGenerating || messages.length === 0}
                    className="h-7 px-2 text-xs"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    生成
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>從當前對話歷史自動生成筆記</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Export Markdown button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportMarkdown}
                    disabled={!content.trim()}
                    className="h-7 px-2 text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    MD
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>匯出為 Markdown 檔案</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Export PDF button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={!content.trim()}
                    className="h-7 px-2 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>匯出為 PDF 檔案</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Clear button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    disabled={!content.trim()}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>清除所有筆記內容</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Mode toggle row */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="text-xs font-medium text-muted-foreground">筆記編輯器</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTogglePreview}
            className="h-6 text-xs"
          >
            {isPreview ? (
              <>
                <Edit2 className="w-4 h-4 mr-2" />
                編輯模式
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                預覽模式
              </>
            )}
          </Button>
        </div>
      </header>

      {/* ============================================
          CONTENT AREA - Flexible, scrollable
          (flex: 1 1 auto; min-height: 0; overflow-y: auto)
          ============================================ */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ 
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto'
        }}
      >
        {isPreview ? (
          /* Preview Mode: Rendered Markdown with LaTeX math support */
          <div className="p-4 notebook-markdown">
            {content ? (
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="notebook-h1" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="notebook-h2" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="notebook-h3" {...props} />,
                  h4: ({ node, ...props }) => <h4 className="notebook-h4" {...props} />,
                  h5: ({ node, ...props }) => <h5 className="notebook-h5" {...props} />,
                  h6: ({ node, ...props }) => <h6 className="notebook-h6" {...props} />,
                  p: ({ node, ...props }) => <p className="notebook-p" {...props} />,
                  ul: ({ node, ...props }) => <ul className="notebook-ul" {...props} />,
                  ol: ({ node, ...props }) => <ol className="notebook-ol" {...props} />,
                  li: ({ node, ...props }) => <li className="notebook-li" {...props} />,
                  code: ({ node, inline, ...props }: any) => {
                    if (inline) {
                      return <code className="notebook-code-inline" {...props} />;
                    }
                    return <code className="notebook-code-block" {...props} />;
                  },
                  pre: ({ node, ...props }) => <pre className="notebook-pre" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="notebook-blockquote" {...props} />,
                  a: ({ node, ...props }) => <a className="notebook-a" {...props} />,
                  table: ({ node, ...props }) => <table className="notebook-table" {...props} />,
                  thead: ({ node, ...props }) => <thead className="notebook-thead" {...props} />,
                  tbody: ({ node, ...props }) => <tbody className="notebook-tbody" {...props} />,
                  tr: ({ node, ...props }) => <tr className="notebook-tr" {...props} />,
                  th: ({ node, ...props }) => <th className="notebook-th" {...props} />,
                  td: ({ node, ...props }) => <td className="notebook-td" {...props} />,
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">開始撰寫您的筆記...</p>
            )}
          </div>
        ) : (
          /* Edit Mode: Markdown Editor with selection tracking */
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            onSelect={handleSelectionChange}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            placeholder="開始撰寫您的筆記...\n\n提示：\n• 使用 Markdown 語法\n• 點擊「生成」從對話自動生成筆記\n• 選取文字後，在主聊天輸入框輸入指令（如「改成條列式」）即可編輯"
            className={cn(
              "w-full h-full resize-none border-0 rounded-none font-mono text-sm p-4",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "bg-transparent outline-none",
              isEditing && "opacity-50 cursor-wait"
            )}
            style={{
              minHeight: '100%',
              display: 'block',
              boxSizing: 'border-box',
              overflowY: 'auto'
            }}
            disabled={isEditing}
          />
        )}
      </div>

      {/* ============================================
          SELECTION INDICATOR FOOTER - Shows when text is selected
          Provides guidance for using main chat to edit
          ============================================ */}
      {selection.hasSelection && !isPreview && (
        <footer className="flex-shrink-0 border-t bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MousePointer2 className="w-3 h-3" />
            <span>
              已選取 {selection.selectedText.length} 個字元 — 
              在主聊天輸入框輸入指令（如「改成條列式」、「翻譯成英文」）即可編輯選取的文字
            </span>
          </div>
        </footer>
      )}

      {/* Loading indicator when editing */}
      {isEditing && (
        <footer className="flex-shrink-0 border-t bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>正在編輯筆記...</span>
          </div>
        </footer>
      )}
    </div>
  );
}
