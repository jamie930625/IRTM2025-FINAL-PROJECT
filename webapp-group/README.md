# IRTM2025-FINAL-RAGify (webapp-group)

A conversational system that combines Personal Knowledge Base (PTKB) management with RAG (Retrieval-Augmented Generation) capabilities, built with a frontend-backend separated architecture.

## Project Architecture

```
webapp-group/
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/        # Next.js App Router
│   │   ├── components/ # React components
│   │   ├── contexts/   # React Context state management
│   │   ├── lib/        # API client and utilities
│   │   └── types/      # TypeScript definitions
│   └── package.json
├── backend/            # FastAPI Python backend
│   ├── api/routes/     # API endpoints
│   ├── services/       # Business logic
│   ├── models/         # Pydantic schemas
│   ├── config/         # Prompt templates
│   └── main.py
└── requirements.txt    # Root-level dependencies
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Google Gemini API Key ([Get it free](https://aistudio.google.com/apikey))
- Java 21+ (for Pyserini/Lucene indexing)

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# Set up API Key
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY=your_api_key
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Access Application

Open `http://localhost:3000` in your browser.

## Core Features

### Implemented

- **PTKB Management**: Automatic extraction and application of personal knowledge from conversations
- **RAG System**: Document upload, indexing with Pyserini/Lucene, and retrieval-augmented generation
- **Document Management**: Upload PDFs, automatic indexing, and selective document retrieval
- **Notebook Generation**: Generate and edit Markdown notebooks from conversation history
- **Multi-turn Conversations**: Context-aware dialogue with conversation history
- **Citation Tracking**: Source attribution for retrieved passages
- **Dark/Light Theme**: Theme switching with persistent preferences
- **Responsive Design**: Mobile-friendly interface

## Technology Stack

### Frontend
- Next.js 16.0.7 (App Router)
- React 19.2.0
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui components

### Backend
- FastAPI 0.115+
- Python 3.8+
- Google Gemini API (gemini-2.5-flash)
- Pyserini / Apache Lucene (IR search)
- Pydantic (data validation)

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
Upload and index a document (PDF).

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

## Data Flow

```
User Input
    │
    ▼
Frontend (Next.js)
    │
    ├─> SimpleChatContext
    │   └─> api.sendChatMessage()
    │
    ▼
Backend (FastAPI)
    │
    ├─> chat.py (API Route)
    │   └─> chat_service.py
    │       ├─> ptkb_service.py (extract/apply PTKB)
    │       ├─> document.py (RAG retrieval if selected_doc_ids)
    │       └─> gemini_client.py
    │           │
    │           ▼
    │       Gemini API
    │
    ▼
Response with answer, sources, PTKB
```

## Project Structure

### Frontend Components

- **Chat Panel**: Main conversation interface with message history
- **Document Panel**: File upload, document list, and selection for RAG
- **Notebook Panel**: Markdown editor for generated notebooks
- **Explain Panel**: RAG explainability (query rewriting, retrieved passages)

### Backend Services

- **chat_service.py**: Core conversation orchestration with RAG integration
- **ptkb_service.py**: Personal knowledge base extraction and filtering
- **document.py**: Document processing and Lucene indexing
- **notebook_service.py**: Notebook generation and editing
- **gemini_client.py**: Google Gemini API wrapper

## Testing

### Backend Health Check
```bash
curl http://localhost:8000/health
```

### Test Chat API
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Hello",
    "history": [],
    "ptkb_list": [],
    "selected_doc_ids": []
  }'
```

### API Documentation
Visit `http://localhost:8000/docs` for interactive API documentation.

## Common Issues

### Backend not responding
- Verify backend is running: `curl http://localhost:8000/health`
- Check `.env` file exists with `GEMINI_API_KEY`
- Review backend console logs

### Frontend cannot connect
- Ensure backend is running on port 8000
- Check CORS configuration in `backend/main.py`
- Verify API endpoint in `frontend/src/lib/api.ts`

### Pyserini indexing fails
- Ensure Java 21+ is installed: `java -version`
- Check `backend/data/indexes/lucene-index` directory exists
- Review backend logs for indexing errors

### Virtual environment issues
**macOS/Linux:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

## Development

### Hot Reload
- Backend: `uvicorn --reload` (automatic on file changes)
- Frontend: `npm run dev` (HMR enabled)

### Code Structure
- Frontend: Component-based architecture with React Context
- Backend: Layered architecture (Routes → Services → Clients)

## License

Academic project for IRTM 2025 Final.
