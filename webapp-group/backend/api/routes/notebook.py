from fastapi import APIRouter, HTTPException
from models.schemas import (
    NotebookGenerateRequest,
    NotebookGenerateResponse,
    NotebookEditRequest,
    NotebookEditResponse
)
from services.notebook_service import (
    generate_notebook_from_chat,
    edit_notebook_with_llm
)

router = APIRouter()

@router.post("/generate", response_model=NotebookGenerateResponse)
async def generate_notebook(request: NotebookGenerateRequest):
    """
    從對話歷史生成筆記本內容
    
    Args:
        request: NotebookGenerateRequest containing conversation_history
        
    Returns:
        NotebookGenerateResponse with generated Markdown notebook content
        
    Raises:
        HTTPException: 400 if request is invalid, 500 if processing fails
    """
    try:
        # 驗證請求
        if not request.conversation_history:
            raise HTTPException(status_code=400, detail="Conversation history cannot be empty")
        
        print(f"[INFO] /api/notebook/generate: Generating notebook from {len(request.conversation_history)} messages")
        
        # 轉換 history 格式為 dict list
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]
        
        # 生成筆記
        notebook_content = await generate_notebook_from_chat(history)
        
        print("[INFO] /api/notebook/generate: Notebook generated successfully")
        
        return NotebookGenerateResponse(notebook_content=notebook_content)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /api/notebook/generate: Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/edit", response_model=NotebookEditResponse)
async def edit_notebook(request: NotebookEditRequest):
    """
    使用 LLM 修改筆記本內容
    
    Args:
        request: NotebookEditRequest containing notebook_content and user_instruction
        
    Returns:
        NotebookEditResponse with edited Markdown notebook content
        
    Raises:
        HTTPException: 400 if request is invalid, 500 if processing fails
    """
    try:
        # 驗證請求
        if not request.user_instruction or not request.user_instruction.strip():
            raise HTTPException(status_code=400, detail="User instruction cannot be empty")
        
        print(f"[INFO] /api/notebook/edit: Editing notebook with instruction: {request.user_instruction[:50]}...")
        
        # 編輯筆記
        edited_content = await edit_notebook_with_llm(
            notebook_content=request.notebook_content,
            user_instruction=request.user_instruction
        )
        
        print("[INFO] /api/notebook/edit: Notebook edited successfully")
        
        return NotebookEditResponse(edited_content=edited_content)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /api/notebook/edit: Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

