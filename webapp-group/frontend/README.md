# Frontend - RAGify Chatbot

Next.js frontend application that communicates with Python FastAPI backend.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will start at `http://localhost:3000`.

> **Note**: Ensure the backend is running at `http://localhost:8000`.

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page (three-panel layout)
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── chat-panel/         # Chat interface
│   │   ├── document-panel/     # Document upload and management
│   │   ├── notebook-panel/     # Markdown notebook editor
│   │   ├── explain-panel/      # RAG explainability
│   │   ├── layout/             # Header and theme toggle
│   │   ├── providers/          # Context providers
│   │   └── ui/                 # shadcn/ui components
│   ├── contexts/               # React Context state
│   │   ├── SimpleChatContext.tsx    # Chat state
│   │   ├── DocumentContext.tsx      # Document state
│   │   ├── NotebookContext.tsx      # Notebook state
│   │   └── ExplainContext.tsx      # Explainability state
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   ├── intent-classifier.ts
│   │   ├── notebook-export.ts
│   │   └── utils.ts            # Utilities
│   └── types/
│       └── index.ts            # TypeScript definitions
├── public/                     # Static assets
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Main Features

### Implemented
- **Chat Interface**: Multi-turn conversations with message history
- **PTKB Integration**: Personal knowledge base extraction and application
- **Document Management**: Upload, list, and select documents for RAG
- **Notebook Generation**: Generate and edit Markdown notebooks
- **Citation Display**: Show source citations from retrieved passages
- **Dark/Light Theme**: Theme switching with persistence
- **Responsive Design**: Mobile-friendly layout
- **Loading States**: Visual feedback during API calls
- **Error Handling**: User-friendly error messages

## API Integration

The frontend communicates with the backend through `src/lib/api.ts`:

### Chat API
```typescript
export const sendChatMessage = async (request: SimpleChatRequest): Promise<SimpleChatResponse>
```

**Request:**
```typescript
{
  query: string;
  conversation_id?: string;
  history?: Array<{role: "user" | "assistant", content: string}>;
  ptkb_list?: string[];
  selected_doc_ids?: string[];  // For RAG retrieval
}
```

**Response:**
```typescript
{
  answer: string;
  conversation_id: string;
  ptkb_used: string[];
  new_ptkb?: string;
  sources?: Array<{text: string, source: string, score: number}>;
}
```

### Document API
```typescript
export const uploadDocument = async (file: File): Promise<UploadResponse>
export const getDocuments = async (): Promise<UploadResponse[]>
export const deleteDocument = async (id: string): Promise<void>
```

### Notebook API
```typescript
export const generateNotebookFromChat = async (request: NotebookGenerateRequest): Promise<NotebookGenerateResponse>
export const editNotebookWithLLM = async (request: NotebookEditRequest): Promise<NotebookEditResponse>
```

## Development

### Start Development Environment

```bash
# Terminal 1 - Backend
cd ../backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
npm run dev
```

### Build Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Technology Stack

- **Framework**: Next.js 16.0.7 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: React Context API
- **HTTP Client**: Fetch API
- **Theme**: next-themes
- **Markdown**: react-markdown with KaTeX support

## Component Architecture

### Three-Panel Layout
- **Left Panel**: Document management (upload, list, select)
- **Center Panel**: Chat interface (main conversation)
- **Right Panel**: Notebook editor (Markdown with editing)

### State Management
- `SimpleChatContext`: Conversation history and PTKB
- `DocumentContext`: Document list and selection
- `NotebookContext`: Notebook content and editing
- `ExplainContext`: RAG explainability data

## Troubleshooting

### Frontend cannot connect to backend
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check CORS configuration in backend
3. Verify API endpoint in `src/lib/api.ts`

### No conversation response
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Review backend console logs

### Styling issues
1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Verify Tailwind compilation: `npm run dev`

### Build fails
- Use `npm run dev` (development mode) instead of build
- Check for TypeScript errors: `npm run lint`
