// src/types/index.ts

/**
 * Represents the response after a document upload.
 */
export interface UploadResponse {
  id: string;
  filename: string;
  file_type: "pdf" | "txt";
  status: "indexed" | "processing" | "error";
  created_at: string;
}

/**
 * Represents the request payload for a chat interaction.
 */
export interface ChatRequest {
  query: string;
  conversation_id?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

/**
 * Represents a citation within an assistant's answer.
 */
export interface Citation {
  id: number;           // Citation number [1], [2], etc.
  text: string;         // Cited passage content
  source: string;       // Source document filename
  page?: number;        // Page number (for PDFs)
}

/**
 * Represents a retrieved passage from the knowledge base.
 */
export interface Passage {
  rank: number;         // Ranking position
  text: string;         // Passage content
  score: number;        // Relevance score (0-1)
  source: string;       // Source document filename
}

/**
 * Represents the full response from the chat API.
 */
export interface ChatResponse {
  answer: string;
  citations: Citation[];
  explainability: {
    rewritten_query: string;
    retrieved_passages: Passage[];
  };
  conversation_id: string;
}

/**
 * Represents a message in the chat history.
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  explainability?: {
    rewritten_query: string;
    retrieved_passages: Passage[];
  }
}

// ========== NotebookLM Chatbot Types (Simplified, No IR) ==========

/**
 * Personal Knowledge Base Item
 * Represents a personal fact or preference extracted from conversation.
 */
export interface PTKBItem {
  fact: string;
  created_at: string;
}

/**
 * Simplified Chat Request (without IR retrieval)
 */
export interface SimpleChatRequest {
  query: string;
  conversation_id?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  ptkb_list?: string[];  // Current PTKB facts
  selected_doc_ids?: string[]; // Selected document IDs for RAG
}

/**
 * Simplified Chat Response (without citations)
 */
export interface SimpleChatResponse {
  answer: string;
  conversation_id: string;
  ptkb_used: string[];      // PTKB facts used in this response
  new_ptkb?: string;        // New PTKB extracted from user query
  sources?: Array<{
    text: string;
    filename: string;
    score: number;
  }>;
}

// ========== Notebook Types ==========

/**
 * Request to generate notebook from chat history
 */
export interface NotebookGenerateRequest {
  conversation_history: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

/**
 * Response from notebook generation
 */
export interface NotebookGenerateResponse {
  notebook_content: string;  // Markdown content
}

/**
 * Request to edit notebook with LLM
 */
export interface NotebookEditRequest {
  notebook_content: string;  // Current notebook content
  user_instruction: string;  // User's instruction for editing
}

/**
 * Response from notebook edit
 */
export interface NotebookEditResponse {
  edited_content: string;    // Edited notebook content
}

// ========== Intent Classification Types ==========

/**
 * Intent types for classifying user messages
 */
export type MessageIntent = 'NOTE_EDIT' | 'CHAT_QA' | 'NOTE_QUERY' | 'CLARIFY';

/**
 * Intent classification result
 */
export interface IntentClassification {
  intent: MessageIntent;
  confidence: number;
  clarificationQuestion?: string;  // If intent is CLARIFY, this contains the question to ask
}

/**
 * Selection state in the notebook
 */
export interface NotebookSelection {
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  hasSelection: boolean;
}

/**
 * Request for selection-aware notebook editing
 */
export interface SelectionAwareEditRequest {
  notebook_content: string;
  user_instruction: string;
  selected_text?: string;
  selection_start?: number;
  selection_end?: number;
}

/**
 * Response from selection-aware notebook editing
 */
export interface SelectionAwareEditResponse {
  edited_content: string;
  edit_applied_to: 'selection' | 'whole_note';
  message_to_user?: string;
}

/**
 * Request for intent classification
 */
export interface IntentClassifyRequest {
  user_message: string;
  has_notebook_content: boolean;
  has_selection: boolean;
}

/**
 * Response from intent classification
 */
export interface IntentClassifyResponse {
  intent: MessageIntent;
  confidence: number;
  clarification_question?: string;
}