# FastAPI Backend for RAGify Chatbot

Python FastAPI backend supporting PTKB (Personal Knowledge Base) management and RAG (Retrieval-Augmented Generation) capabilities.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Set Environment Variables

Copy `.env.example` to `.env` and add your Gemini API Key:

```bash
cp .env.example .env
```

Edit `.env`:
```
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Start Backend Service

```bash
uvicorn main:app --reload --port 8000
```

The backend will start at `http://localhost:8000`.

### 4. Test API

Access interactive API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### POST /api/chat
Conversation endpoint with PTKB and RAG support.

**Request:**
```json
{
  "query": "user query",
  "conversation_id": "optional conversation ID",
  "history": [{"role": "user", "content": "..."}],
  "ptkb_list": ["personal fact 1"],
  "selected_doc_ids": ["doc_id_1", "doc_id_2"]
}
```

**Response:**
```json
{
  "answer": "assistant response",
  "conversation_id": "conversation ID",
  "ptkb_used": ["used personal facts"],
  "new_ptkb": "newly extracted fact",
  "sources": [{"text": "...", "source": "doc_name", "score": 0.9}]
}
```

### POST /api/document/upload
Upload and index a PDF document.

**Request:** Multipart form data with `file` field

**Response:**
```json
{
  "id": "doc_id",
  "filename": "document.pdf",
  "status": "indexed"
}
```

### GET /api/document/list
List all indexed documents.

### DELETE /api/document/delete/{doc_id}
Delete a document and its index.

### POST /api/notebook/generate
Generate Markdown notebook from conversation history.

**Request:**
```json
{
  "conversation_history": [{"role": "user", "content": "..."}]
}
```

**Response:**
```json
{
  "notebook_content": "# Generated Notebook\n\n..."
}
```

### POST /api/notebook/edit
Edit notebook content using LLM.

**Request:**
```json
{
  "notebook_content": "# Existing content",
  "user_instruction": "Add a summary section"
}
```

**Response:**
```json
{
  "edited_content": "# Updated content\n\n..."
}
```

### GET /health
Health check endpoint.

## Project Structure

```
backend/
├── main.py                    # FastAPI application entry
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables template
├── api/
│   └── routes/
│       ├── chat.py            # Chat API endpoint
│       ├── document.py         # Document management endpoints
│       └── notebook.py         # Notebook generation endpoints
├── services/
│   ├── chat_service.py        # Conversation orchestration with RAG
│   ├── ptkb_service.py        # PTKB extraction and filtering
│   ├── document.py            # Document processing and indexing
│   ├── notebook_service.py    # Notebook generation and editing
│   └── gemini_client.py       # Gemini API wrapper
├── models/
│   └── schemas.py             # Pydantic data models
└── config/
    └── prompts.py             # Prompt templates
```

## Core Features

### 1. Document Processing and Indexing
- **PDF Parsing**: Extracts text using `pypdf`
- **Lucene Indexing**: Uses Pyserini to create searchable indexes
- **Auto-indexing**: Automatically indexes documents after upload
- **Index Location**: `backend/data/indexes/lucene-index`

### 2. RAG Retrieval System
- **Selective Retrieval**: Filters by `selected_doc_ids` from frontend
- **Query Rewriting**: Optimizes conversational queries for search
- **BM25 Search**: Retrieves top-k relevant passages
- **Context Injection**: Injects retrieved passages into prompts

### 3. PTKB Management
- **Automatic Extraction**: Extracts personal facts from conversations
- **Relevance Filtering**: Selects relevant PTKB for each query
- **Memory Storage**: Currently in-memory (cleared on restart)

### 4. Notebook Generation
- **Markdown Generation**: Creates structured notebooks from chat history
- **LLM Editing**: Edits notebook content based on user instructions

## Technology Stack

- **Framework**: FastAPI
- **Search Engine**: Pyserini / Apache Lucene
- **LLM API**: Google Gemini API (gemini-2.5-flash)
- **Document Processing**: pypdf
- **Data Validation**: Pydantic
- **Environment**: python-dotenv

## Development

### Hot Reload
```bash
uvicorn main:app --reload --port 8000
```

### Testing

```bash
# Health check
curl http://localhost:8000/health

# Test chat
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello", "history": [], "ptkb_list": [], "selected_doc_ids": []}'

# Test document upload
curl -X POST http://localhost:8000/api/document/upload \
  -F "file=@document.pdf"
```

### Debugging

Check console logs:
- `[INFO]` - Normal operations
- `[WARNING]` - Non-critical issues
- `[ERROR]` - Errors requiring attention

## Important Notes

- Ensure `GEMINI_API_KEY` is set in `.env`
- Java 21+ required for Pyserini indexing
- CORS configured for `http://localhost:3000`
- PTKB stored in memory (not persistent)
- Index directory: `backend/data/indexes/lucene-index`
