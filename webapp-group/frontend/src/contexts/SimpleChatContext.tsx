// src/contexts/SimpleChatContext.tsx
// NotebookLM-style chat context with PTKB support
// Updated: Integrated intent classification for notebook editing via main chat
"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { Message, MessageIntent, IntentClassification } from '@/types';
import * as api from '@/lib/api';
import { toast } from 'sonner';
import { classifyIntent, parseUserClarification, extractEditInstruction } from '@/lib/intent-classifier';

type SimpleChatContextType = {
  messages: Message[];
  isLoading: boolean;
  conversationId: string | undefined;
  ptkbList: string[];  // Personal Knowledge Base
  selectedFileIds: string[]; // 紀錄目前勾選的檔案 ID
  setSelectedFileIds: (ids: string[]) => void; // 更新勾選狀態
  sendMessage: (query: string) => Promise<void>;
  // Notebook integration
  pendingClarification: IntentClassification | null;  // Pending clarification state
  lastUserQueryForClarification: string | null;  // Store the original query when clarifying
};

// Callback type for notebook editing - will be set by NotebookProvider
type NotebookEditCallback = ((instruction: string) => Promise<{ success: boolean; message: string }>) | null;
type NotebookStateGetter = (() => { hasContent: boolean; hasSelection: boolean }) | null;

// Global refs for cross-context communication
let notebookEditCallback: NotebookEditCallback = null;
let notebookStateGetter: NotebookStateGetter = null;

// Functions to register notebook callbacks (called by NotebookContext)
export function registerNotebookEditCallback(callback: NotebookEditCallback) {
  notebookEditCallback = callback;
}

export function registerNotebookStateGetter(getter: NotebookStateGetter) {
  notebookStateGetter = getter;
}

const SimpleChatContext = createContext<SimpleChatContextType | undefined>(undefined);

export const SimpleChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [ptkbList, setPtkbList] = useState<string[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [pendingClarification, setPendingClarification] = useState<IntentClassification | null>(null);
  const [lastUserQueryForClarification, setLastUserQueryForClarification] = useState<string | null>(null);

  const sendMessage = useCallback(async (query: string) => {
    setIsLoading(true);

    // Add user message immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Check if this is a clarification response
      if (pendingClarification && lastUserQueryForClarification) {
        const clarifiedIntent = parseUserClarification(query);
        
        if (clarifiedIntent === 'NOTE_EDIT') {
          // User confirmed they want to edit the notebook
          setPendingClarification(null);
          const originalQuery = lastUserQueryForClarification;
          setLastUserQueryForClarification(null);
          
          await handleNoteEdit(originalQuery);
          return;
        } else if (clarifiedIntent === 'CHAT_QA') {
          // User wants to just discuss
          setPendingClarification(null);
          const originalQuery = lastUserQueryForClarification;
          setLastUserQueryForClarification(null);
          
          // Continue with normal chat using the original query
          await handleChatQA(originalQuery);
          return;
        }
        // If can't parse clarification, treat current message as new query
        setPendingClarification(null);
        setLastUserQueryForClarification(null);
      }

      // Get notebook state for intent classification
      const notebookState = notebookStateGetter?.() ?? { hasContent: false, hasSelection: false };
      
      // Classify intent
      const classification = classifyIntent(
        query, 
        notebookState.hasContent, 
        notebookState.hasSelection
      );
      
      console.log('[INFO] Intent classification:', classification);

      switch (classification.intent) {
        case 'NOTE_EDIT':
          await handleNoteEdit(query);
          break;
          
        case 'CLARIFY':
          // Ask for clarification
          setPendingClarification(classification);
          setLastUserQueryForClarification(query);
          
          const clarifyMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: classification.clarificationQuestion || '您是想要修改筆記內容，還是只是想討論它呢？',
          };
          setMessages(prev => [...prev, clarifyMessage]);
          break;
          
        case 'NOTE_QUERY':
          // For now, treat as normal chat but could be enhanced
          await handleChatQA(query);
          break;
          
        case 'CHAT_QA':
        default:
          await handleChatQA(query);
          break;
      }

    } catch (error) {
      console.error("[ERROR] Failed to send message:", error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '抱歉，發生錯誤，無法取得回應。請確認 API 金鑰設定正確。',
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error("訊息傳送失敗：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [messages, conversationId, ptkbList, selectedFileIds, pendingClarification, lastUserQueryForClarification]);

  /**
   * Handle notebook editing via the registered callback
   */
  const handleNoteEdit = async (query: string) => {
    if (!notebookEditCallback) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '筆記編輯功能目前無法使用。請確保筆記面板已開啟。',
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const instruction = extractEditInstruction(query);
    console.log('[INFO] Editing notebook with instruction:', instruction);

    const result = await notebookEditCallback(instruction);

    const responseMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.success 
        ? `✏️ ${result.message}`
        : `❌ ${result.message}`,
    };
    setMessages(prev => [...prev, responseMessage]);

    if (result.success) {
      toast.success('筆記已更新');
    } else {
      toast.error(result.message);
    }
  };

  /**
   * Handle normal chat QA
   */
  const handleChatQA = async (query: string) => {
    const requestPayload = {
      query,
      conversation_id: conversationId,
      history: messages.map(m => ({ role: m.role, content: m.content })),
      ptkb_list: ptkbList,
      selected_doc_ids: selectedFileIds,
    };

    console.log('[INFO] Sending chat request with selected docs:', selectedFileIds);

    const response = await api.sendChatMessage(requestPayload);

    if (response.new_ptkb) {
      console.log('[INFO] New PTKB added:', response.new_ptkb);
      setPtkbList(prev => [...prev, response.new_ptkb!]);
    }

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.answer,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setConversationId(response.conversation_id);

    if (response.ptkb_used.length > 0) {
      console.log('[INFO] PTKBs used in response:', response.ptkb_used);
    }
  };

  return (
    <SimpleChatContext.Provider value={{ 
      messages, 
      isLoading, 
      conversationId, 
      ptkbList, 
      selectedFileIds, 
      setSelectedFileIds, 
      sendMessage,
      pendingClarification,
      lastUserQueryForClarification,
    }}>
      {children}
    </SimpleChatContext.Provider>
  );
};

export const useSimpleChat = (): SimpleChatContextType => {
  const context = useContext(SimpleChatContext);
  if (!context) {
    throw new Error('useSimpleChat must be used within a SimpleChatProvider');
  }
  return context;
};
