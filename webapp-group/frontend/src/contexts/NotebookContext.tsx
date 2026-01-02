// src/contexts/NotebookContext.tsx
// Updated: Removed separate AI assistant UI, now driven from main chat input
// Added: Selection tracking for selection-aware editing
"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import * as api from '@/lib/api';
import { toast } from 'sonner';
import { NotebookSelection } from '@/types';
import { registerNotebookEditCallback, registerNotebookStateGetter } from './SimpleChatContext';

const NOTEBOOK_STORAGE_KEY = 'notebook-content';

type NotebookContextType = {
  content: string;
  isLoading: boolean;
  isGenerating: boolean;
  isEditing: boolean;
  // Selection tracking
  selection: NotebookSelection;
  updateSelection: (selection: NotebookSelection) => void;
  clearSelection: () => void;
  // Content operations
  updateContent: (newContent: string) => void;
  generateFromChat: (conversationHistory: Array<{ role: "user" | "assistant"; content: string }>) => Promise<void>;
  loadFromStorage: () => void;
  clearNotebook: () => void;
  // Selection-aware editing (called from main chat)
  editNotebook: (instruction: string) => Promise<{ success: boolean; message: string }>;
  // Textarea ref for programmatic selection access
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const NotebookContext = createContext<NotebookContextType | undefined>(undefined);

// Default empty selection
const EMPTY_SELECTION: NotebookSelection = {
  selectedText: '',
  selectionStart: 0,
  selectionEnd: 0,
  hasSelection: false,
};

export const NotebookProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selection, setSelection] = useState<NotebookSelection>(EMPTY_SELECTION);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Auto-save to localStorage when content changes
  useEffect(() => {
    if (content !== '') {
      try {
        localStorage.setItem(NOTEBOOK_STORAGE_KEY, content);
      } catch (error) {
        console.error('[ERROR] Failed to save notebook to localStorage:', error);
      }
    }
  }, [content]);

  // Register callbacks with SimpleChatContext for cross-context communication
  useEffect(() => {
    // Register the state getter so chat can check notebook state
    registerNotebookStateGetter(() => ({
      hasContent: content.trim().length > 0,
      hasSelection: selection.hasSelection,
    }));
  }, [content, selection.hasSelection]);

  const loadFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
      if (saved) {
        setContent(saved);
      }
    } catch (error) {
      console.error('[ERROR] Failed to load notebook from localStorage:', error);
    }
  }, []);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const generateFromChat = useCallback(async (
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
  ) => {
    if (conversationHistory.length === 0) {
      toast.error('對話歷史為空，無法生成筆記');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.generateNotebookFromChat({ conversation_history: conversationHistory });
      setContent(response.notebook_content);
      toast.success('筆記已從對話歷史生成');
    } catch (error) {
      console.error('[ERROR] Failed to generate notebook:', error);
      
      // [新增] 檢查是否為配額限制錯誤
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('配額')) {
        toast.error(
          'API 配額已用盡：免費層級每天限制 20 次請求。請稍後再試或升級您的計劃。',
          { duration: 5000 }
        );
      } else if (errorMessage.includes('safety') || errorMessage.includes('blocked') || errorMessage.includes('安全過濾')) {
        toast.error(
          '內容被安全過濾器阻擋：請檢查輸入內容是否包含敏感或不當內容。',
          { duration: 5000 }
        );
      } else {
        toast.error('生成筆記失敗：' + errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearNotebook = useCallback(() => {
    setContent('');
    setSelection(EMPTY_SELECTION);
    try {
      localStorage.removeItem(NOTEBOOK_STORAGE_KEY);
    } catch (error) {
      console.error('[ERROR] Failed to clear notebook from localStorage:', error);
    }
    toast.success('筆記已清除');
  }, []);

  // Selection tracking functions
  const updateSelection = useCallback((newSelection: NotebookSelection) => {
    setSelection(newSelection);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION);
  }, []);

  /**
   * Edit notebook content using LLM - called from main chat
   * Supports selection-aware editing: if text is selected, only that part is edited
   */
  const editNotebook = useCallback(async (instruction: string): Promise<{ success: boolean; message: string }> => {
    if (!content.trim()) {
      return { success: false, message: '筆記內容為空，無法進行編輯' };
    }

    setIsEditing(true);
    try {
      // Get current selection from textarea if available
      let currentSelection = selection;
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        if (start !== end) {
          currentSelection = {
            selectedText: content.substring(start, end),
            selectionStart: start,
            selectionEnd: end,
            hasSelection: true,
          };
        }
      }

      // Build instruction with selection context
      let fullInstruction = instruction;
      if (currentSelection.hasSelection && currentSelection.selectedText) {
        fullInstruction = `[Selection-based edit] The user has selected the following text:\n"${currentSelection.selectedText}"\n\nUser instruction: ${instruction}\n\nPlease apply the instruction ONLY to the selected text while keeping the rest of the note unchanged.`;
      }

      const response = await api.editNotebookWithLLM({
        notebook_content: content,
        user_instruction: fullInstruction,
      });

      updateContent(response.edited_content);
      clearSelection();

      const editScope = currentSelection.hasSelection ? '選取的文字' : '整篇筆記';
      return { 
        success: true, 
        message: `已套用變更至${editScope}。` 
      };
    } catch (error) {
      console.error('[ERROR] Failed to edit notebook:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        return { 
          success: false, 
          message: 'API 配額已用盡：免費層級每天限制 20 次請求。請稍後再試。' 
        };
      } else if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
        return { 
          success: false, 
          message: '內容被安全過濾器阻擋：請檢查編輯指令或筆記內容。' 
        };
      }
      return { success: false, message: '編輯筆記失敗：' + errorMessage };
    } finally {
      setIsEditing(false);
    }
  }, [content, selection, updateContent, clearSelection]);

  // Register edit callback with SimpleChatContext
  useEffect(() => {
    registerNotebookEditCallback(editNotebook);
    return () => {
      registerNotebookEditCallback(null);
    };
  }, [editNotebook]);

  return (
    <NotebookContext.Provider value={{
      content,
      isLoading,
      isGenerating,
      isEditing,
      selection,
      updateSelection,
      clearSelection,
      updateContent,
      generateFromChat,
      loadFromStorage,
      clearNotebook,
      editNotebook,
      textareaRef,
    }}>
      {children}
    </NotebookContext.Provider>
  );
};

export const useNotebook = (): NotebookContextType => {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error('useNotebook must be used within a NotebookProvider');
  }
  return context;
};

