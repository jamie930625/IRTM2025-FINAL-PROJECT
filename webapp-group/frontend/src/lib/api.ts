// src/lib/api.ts
// Updated: Added support for selection-aware notebook editing
import { 
  UploadResponse, 
  ChatRequest, 
  ChatResponse, 
  SimpleChatRequest, 
  SimpleChatResponse, 
  NotebookGenerateRequest, 
  NotebookGenerateResponse, 
  NotebookEditRequest, 
  NotebookEditResponse,
  SelectionAwareEditRequest,
  SelectionAwareEditResponse
} from "@/types";

/**
 * [已更新] 真實上傳文件至 FastAPI 後端
 * @param file - The file to upload.
 * @returns A promise that resolves to an UploadResponse.
 */
export const uploadDocument = async (file: File): Promise<UploadResponse> => {
  console.log("[INFO] Uploading file to backend:", file.name);
  
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:8000/api/document/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Upload failed: ${errorData.detail || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[ERROR] uploadDocument failed:", error);
    throw error;
  }
};

/**
 * [已更新] 真實獲取索引文件列表
 * @returns A promise that resolves to an array of UploadResponse.
 */
export const getDocuments = async (): Promise<UploadResponse[]> => {
  console.log("[INFO] Fetching document list from backend.");
  
  try {
    // 呼叫你在 backend/api/routes/document.py 實作的 list 接口
    const response = await fetch('http://localhost:8000/api/document/list');
    
    if (!response.ok) {
        throw new Error('Failed to fetch document list');
    }

    // 注意：如果後端 list 接口尚未回傳完整陣列，這裡會根據後端實作回傳
    const data = await response.json();
    
    // 如果後端目前只回傳測試訊息，則保留原本的空陣列邏輯以防當機
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[ERROR] getDocuments failed:", error);
    return []; // 失敗時回傳空陣列，維持 UI 穩定
  }
};

/**
 * [已更新] 真實刪除文件並重建索引
 * @param id - The ID of the document to delete.
 * @returns A promise that resolves when the operation is complete.
 */
export const deleteDocument = async (id: string): Promise<void> => {
  console.log(`[INFO] Deleting document: ${id}`);
  
  try {
    const response = await fetch(`http://localhost:8000/api/document/delete/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Delete failed: ${errorData.detail || response.statusText}`);
    }
  } catch (error) {
    console.error("[ERROR] deleteDocument failed:", error);
    throw error;
  }
};

/**
 * Simulates a chat request (OLD VERSION - DEPRECATED).
 * @param request - The chat request payload.
 * @returns A promise that resolves to a ChatResponse.
 */
export const postChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  console.log("Simulating chat request with query:", request.query);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulate a realistic-looking response
  const rewritten_query = `${request.query} (知識庫查詢優化)`;
  const answer = `這是一個模擬的回應，關於「${request.query}」。文件 **Source1.txt** 中提到了一些相關段落 [1]。此外，在 **Source2.pdf** 也有參考資訊 [2]。RAGify 系統透過重寫查詢為「${rewritten_query}」來寻找最相關的資訊。`;

  return {
    answer,
    citations: [
      { id: 1, text: "這是從 Source1.txt 中擷取的相關段落文字...", source: "Source1.txt" },
      { id: 2, text: "這是從 Source2.pdf 中找到的引用內容...", source: "Source2.pdf", page: 3 },
    ],
    explainability: {
      rewritten_query,
      retrieved_passages: [
        { rank: 1, text: "這是從 Source1.txt 中擷取的相關段落文字...", score: 0.91, source: "Source1.txt" },
        { rank: 2, text: "這是從 Source2.pdf 中找到的引用內容...", score: 0.88, source: "Source2.pdf" },
        { rank: 3, text: "另一個比較不相關的段落，但也被檢索出來了。", score: 0.75, source: "Source3.txt" },
      ],
    },
    conversation_id: request.conversation_id || crypto.randomUUID(),
  };
};

// ========== NotebookLM Chatbot API (NEW) ==========

/**
 * Send a chat message to the NotebookLM-style bot
 * @param request - Simplified chat request with PTKB support
 * @returns Promise resolving to simplified chat response
 */
export const sendChatMessage = async (request: SimpleChatRequest): Promise<SimpleChatResponse> => {
  console.log("[INFO] Sending chat message:", request.query);
  
  try {
    // 改為呼叫 FastAPI 後端
    const response = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} - ${errorData.detail || response.statusText}`);
    }

    const data: SimpleChatResponse = await response.json();
    return data;
  } catch (error) {
    console.error("[ERROR] Failed to send chat message:", error);
    throw error;
  }
};

// ========== Notebook API ==========

/**
 * Generate notebook content from chat history
 * @param request - Notebook generation request with conversation history
 * @returns Promise resolving to generated notebook content
 */
export const generateNotebookFromChat = async (request: NotebookGenerateRequest): Promise<NotebookGenerateResponse> => {
  console.log("[INFO] Generating notebook from chat history");
  
  try {
    const response = await fetch('http://localhost:8000/api/notebook/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} - ${errorData.detail || response.statusText}`);
    }

    const data: NotebookGenerateResponse = await response.json();
    return data;
  } catch (error) {
    console.error("[ERROR] Failed to generate notebook:", error);
    throw error;
  }
};

/**
 * Edit notebook content using LLM
 * @param request - Notebook edit request with current content and user instruction
 * @returns Promise resolving to edited notebook content
 */
export const editNotebookWithLLM = async (request: NotebookEditRequest): Promise<NotebookEditResponse> => {
  console.log("[INFO] Editing notebook with LLM");
  
  try {
    const response = await fetch('http://localhost:8000/api/notebook/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} - ${errorData.detail || response.statusText}`);
    }

    const data: NotebookEditResponse = await response.json();
    return data;
  } catch (error) {
    console.error("[ERROR] Failed to edit notebook:", error);
    throw error;
  }
};
