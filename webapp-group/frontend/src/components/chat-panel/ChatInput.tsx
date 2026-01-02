// src/components/chat-panel/ChatInput.tsx
// Updated: Shows notebook editing hints and clarification state
"use client";

import { useState, useRef, KeyboardEvent } from 'react';
import { useSimpleChat } from '@/contexts/SimpleChatContext';
import { useNotebook } from '@/contexts/NotebookContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Edit2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatInput() {
  const [query, setQuery] = useState('');
  const { sendMessage, isLoading, pendingClarification } = useSimpleChat();
  const { selection, isEditing: isNotebookEditing } = useNotebook();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery && !isLoading && !isNotebookEditing) {
      await sendMessage(trimmedQuery);
      setQuery('');
      textareaRef.current?.style.setProperty('height', 'auto');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.setProperty('height', 'auto');
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.setProperty('height', `${scrollHeight}px`);
    }
  };

  // Dynamic placeholder based on context
  const getPlaceholder = () => {
    if (pendingClarification) {
      return '請回答：您是想要修改筆記，還是只是想討論？（輸入「是」修改筆記，或「不」繼續對話）';
    }
    if (selection.hasSelection) {
      return `已選取筆記文字 — 輸入指令編輯（如「改成條列式」、「翻譯成英文」）或輸入一般問題...`;
    }
    return '輸入您的問題，或輸入指令編輯筆記（如「幫我改筆記第一段」）...';
  };

  const isDisabled = isLoading || isNotebookEditing;

  return (
    <div className="relative p-4 border-t">
      {/* Context indicator bar */}
      {(selection.hasSelection || pendingClarification) && (
        <div className={cn(
          "flex items-center gap-2 text-xs mb-2 px-2 py-1.5 rounded-md",
          pendingClarification 
            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
        )}>
          {pendingClarification ? (
            <>
              <HelpCircle className="h-3 w-3" />
              <span>需要確認：您是想要修改筆記內容嗎？</span>
            </>
          ) : (
            <>
              <Edit2 className="h-3 w-3" />
              <span>
                筆記編輯模式 — 已選取 {selection.selectedText.length} 個字元
              </span>
            </>
          )}
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={getPlaceholder()}
          rows={1}
          className={cn(
            "w-full pr-20 resize-none max-h-48",
            selection.hasSelection && "border-blue-300 focus:border-blue-500",
            pendingClarification && "border-amber-300 focus:border-amber-500"
          )}
          disabled={isDisabled}
        />
        <Button
          type="submit"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={handleSend}
          disabled={!query.trim() || isDisabled}
        >
          {isLoading || isNotebookEditing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">發送</span>
        </Button>
      </div>
    </div>
  );
}
