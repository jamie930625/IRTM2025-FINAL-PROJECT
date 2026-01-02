from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class HistoryMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str

class SimpleChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    history: Optional[List[HistoryMessage]] = []
    ptkb_list: Optional[List[str]] = []
    # [新增] 接收前端傳來的：使用者勾選的檔案 ID 列表
    selected_doc_ids: Optional[List[str]] = [] 

class SimpleChatResponse(BaseModel):
    answer: str
    conversation_id: str
    ptkb_used: List[str]
    new_ptkb: Optional[str] = None
    # [新增] 回傳引用來源 (讓前端知道我們參考了哪些檔案內容)
    sources: Optional[List[Dict[str, Any]]] = []

# --- 以下保留給未來擴充使用 (可以不用動) ---
class Citation(BaseModel):
    id: int
    text: str
    source: str
    page: Optional[int] = None

class Passage(BaseModel):
    rank: int
    text: str
    score: float
    source: str

class Explainability(BaseModel):
    rewritten_query: str
    retrieved_passages: List[Passage]

class ChatResponse(BaseModel):
    """完整版回應（包含 IR 功能）- 未來使用"""
    answer: str
    citations: List[Citation]
    explainability: Explainability
    conversation_id: str

# --- Notebook Schemas ---
class NotebookGenerateRequest(BaseModel):
    conversation_history: List[HistoryMessage]

class NotebookGenerateResponse(BaseModel):
    notebook_content: str

class NotebookEditRequest(BaseModel):
    notebook_content: str
    user_instruction: str

class NotebookEditResponse(BaseModel):
    edited_content: str