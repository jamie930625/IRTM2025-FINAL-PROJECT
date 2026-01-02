from fastapi import APIRouter, HTTPException
from models.schemas import SimpleChatRequest, SimpleChatResponse
from services.chat_service import generate_response

router = APIRouter()

@router.post("/chat", response_model=SimpleChatResponse)
async def chat(request: SimpleChatRequest):
    """
    處理對話請求
    
    Args:
        request: SimpleChatRequest containing query, history, ptkb_list, AND selected_doc_ids
        
    Returns:
        SimpleChatResponse with answer, conversation_id, ptkb_used, new_ptkb, AND sources
        
    Raises:
        HTTPException: 400 if query is invalid, 500 if processing fails
    """
    try:
        # 驗證請求
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        print(f"[INFO] /api/chat: Received query: {request.query}")
        
        # 除錯用：印出使用者勾選了哪些檔案 (方便你確認前端有沒有傳過來)
        if request.selected_doc_ids:
            print(f"[INFO] /api/chat: User selected docs: {request.selected_doc_ids}")
        
        # 轉換 history 格式為 dict list
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in (request.history or [])
        ]
        
        # 生成回應
        # [關鍵修改] 這裡必須把 request.selected_doc_ids 傳進去
        response = await generate_response(
            query=request.query,
            conversation_history=history,
            ptkb_list=request.ptkb_list or [],
            conversation_id=request.conversation_id,
            selected_doc_ids=request.selected_doc_ids or [] # <-- 這一行是讓 NotebookLM 勾選功能生效的關鍵
        )
        
        print("[INFO] /api/chat: Response generated successfully")
        
        return SimpleChatResponse(**response)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /api/chat: Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))
