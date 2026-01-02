from fastapi import APIRouter, UploadFile, File, HTTPException
from services.document import DocumentService

# 建立 Router
router = APIRouter()
document_service = DocumentService()

@router.post("/upload", summary="上傳文件", description="上傳文件以進行索引")
async def upload_document(file: UploadFile = File(...)):
    try:
        result = await document_service.process_upload(file)
        return result
    except Exception as e:
        # 在實際生產環境中，建議使用 logger 紀錄錯誤，而不是直接 print
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", summary="列出已索引文件")
async def list_documents():
    """回傳所有已索引的文件列表"""
    return document_service.list_documents()

@router.delete("/delete/{doc_id}", summary="刪除文件")
async def delete_document(doc_id: str):
    """刪除指定文件及其索引"""
    try:
        document_service.delete_document(doc_id)
        return {"status": "deleted", "id": doc_id}
    except Exception as e:
        print(f"[ERROR] Delete document failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
