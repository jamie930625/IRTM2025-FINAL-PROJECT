# RAGify: Chatting with Your Documents via Retrieval-Augmented Generation

**IRTM 2025 Final Project - Group 1**

RAGify is a NotebookLM-lite system that enables conversational interactions with documents through Retrieval-Augmented Generation (RAG). This project consists of two main components: experimental analysis and system implementation.

[Check out the DEMO](https://drive.google.com/drive/folders/1U5GHvozSkr7AK2dsbWbvqYyJm4xLe4Oz?usp=sharing)

## Project Overview

RAGify combines document retrieval with large language models to provide accurate, source-grounded answers. Instead of generating answers purely from a model's memory, RAG retrieves relevant documents first, then generates answers based on those documents, reducing hallucination and improving reliability.

## Repository Structure

```
IRTM2025-FINAL-RAGify/
├── lab-group/          # Experimental analysis and evaluation
├── webapp-group/       # RAGify system implementation
└── IRTM2025 Group1 final project slides.pdf
```

### lab-group

Experimental pipeline for analyzing RAG components and retrieval performance.

**Responsibilities:**
- Query rewriting methods (CHIQ-AD, LLM4CS)
- Retrieval methods comparison (Binary Retrieval, TF-IDF, BM25)
- LLM evaluation (Llama-3.1-8B-Instruct, Qwen3-4B-Thinking-2507)
- Performance evaluation on TREC CAsT 2022 dataset

**Key Findings:**
- BM25 > TF-IDF >> Binary Retrieval
- LLM4CS outperforms CHIQ-AD for query rewriting
- "Thinking" models (Qwen3-4B-Thinking) achieve better query rewriting quality

See [lab-group/README.md](lab-group/README.md) for detailed documentation.

### webapp-group

Full-stack implementation of the RAGify system with a NotebookLM-style interface.

**Features:**
- Document upload and automatic indexing (Pyserini/Lucene)
- RAG-based conversational interface
- Personal Knowledge Base (PTKB) management
- Notebook generation from conversations
- Citation tracking and source attribution

**Technology Stack:**
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, Google Gemini API, Pyserini

See [webapp-group/README.md](webapp-group/README.md) for detailed documentation.

## Contributors

### lab-group
- **YEO GUAN WEI** (B11902091) - Dept. of CSIE, NTU

### webapp-group
- **CHEN, PIN-HSIANG** (B12705037) - Dept. of IM, NTU
- **YU-WEN CHIANG** (R14722040) - Dept. of Accounting, NTU
- **LIN, LI-CHIEH** (B11103049) - Dept. of History, NTU
- **LUO, LI-CHEN** (B11705061) - Dept. of IM, NTU

## Project Goals

1. **Understand RAG Pipeline**: Analyze how each component (indexing, retrieval, query rewriting, generation) affects overall performance
2. **Systematic Evaluation**: Compare different retrieval methods and query rewriting strategies
3. **System Implementation**: Build a functional NotebookLM-lite system (RAGify)

## Key Results

Based on experiments on TREC CAsT 2022 dataset:

- **Best Configuration:**
  - Retrieval: BM25
  - Query Rewriting: LLM4CS
  - Answer Generation: Qwen/Qwen3-4B-Thinking-2507

- **Performance Highlights:**
  - BM25 with LLM4CS (Qwen) achieves MAP: 0.0759, nDCG@10: 0.0872

## References

- [TREC CAsT 2022 Dataset](https://github.com/daltonj/treccastweb)
- [LLM4CS](https://arxiv.org/abs/2303.06573v2)
- [CHIQ-AD](https://arxiv.org/abs/2406.05013v2)
- [CFDA Framework](https://arxiv.org/abs/2509.15588v1)

---

For detailed documentation, please refer to the README files in each subdirectory.
