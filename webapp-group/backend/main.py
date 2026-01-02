from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# 修改重點 1: 同時匯入 chat、document 和 notebook
from api.routes import chat, document, notebook

app = FastAPI(
    title="NotebookLM Chatbot API",
    description="FastAPI backend for NotebookLM-style chatbot with PTKB support",
    version="1.0.0"
)

# CORS 設定：允許前端 localhost:3000 存取 (保持原樣)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
# 1. Chat 路由 (原有的) -> /api/chat
app.include_router(chat.router, prefix="/api", tags=["chat"])

# 修改重點 2: 新增 Document 路由 -> /api/document/upload
app.include_router(document.router, prefix="/api/document", tags=["document"])

# 修改重點 3: 新增 Notebook 路由 -> /api/notebook/generate, /api/notebook/edit
app.include_router(notebook.router, prefix="/api/notebook", tags=["notebook"])

@app.get("/")
async def root():
    return {"message": "NotebookLM Chatbot API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    # 讓你可以直接用 python main.py 執行
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
