import uuid
import os
import json
import re
from typing import Dict, List, Optional
from services.gemini_client import call_gemini
from services.ptkb_service import (
    extract_new_ptkb,
    get_relevant_ptkbs,
    build_conversation_context
)
from config.prompts import (
    SYSTEM_PROMPT_RESPONSE,
    format_response_prompt,
    # LLM4CS Query Rewriting
    SYSTEM_PROMPT_LLM4CS_REWRITE,
    format_llm4cs_rewrite_prompt,
    parse_llm4cs_rewrite_response,
    # Passage Summarization
    SYSTEM_PROMPT_SUMMARIZE,
    format_summarize_prompt,
    parse_summary_response
)
# [可選] 匯入 Pyserini - 如果未安裝或配置不正確，將使用備用方案
try:
    from pyserini.search.lucene import LuceneSearcher
    PYSERINI_AVAILABLE = True
except (ImportError, Exception) as e:
    print(f"[WARNING] Pyserini not available: {e}")
    print("[INFO] RAG search functionality will be disabled. Install Java and configure pyserini to enable it.")
    PYSERINI_AVAILABLE = False
    LuceneSearcher = None

# ==========================================================
# RAG 參數設定（與 reference 實作同步）
# ==========================================================
RESPONSE_LIMIT = 1000      # Maximum words in response (increased from 250 to allow longer responses)
NUM_PASSAGES = 13          # BM25 檢索後使用的 passage 總數
NUM_DIRECT_PASSAGES = 4    # 直接注入 prompt 的 passage 數量
SUMMARY_CHUNK_SIZE = 5     # 剩餘 passage 分塊摘要的大小
SCORE_THRESHOLD = 0        # 分數門檻（0 = 不過濾）

# ==========================================================
# Query Normalization (查詢正規化)
# ==========================================================
def normalize_search_query(query: str) -> str:
    """
    清理並正規化使用者查詢，移除不相關字元，提高搜尋匹配率。
    
    處理內容：
    1. 移除多餘空格和換行
    2. 保留字母、數字、底線、連字號和空格
    3. 標準化底線和連字號周圍的空格
    4. 移除過短的單詞（< 2 字元，除了常見縮寫）
    5. 轉換為小寫（BM25 通常大小寫不敏感）
    
    Args:
        query: 原始查詢字串
        
    Returns:
        清理後的查詢字串
    """
    if not query or not query.strip():
        return query
    
    # 1. 轉換為小寫
    query = query.lower()
    
    # 2. 移除換行和製表符，轉換為空格
    query = re.sub(r'[\n\r\t]+', ' ', query)
    
    # 3. 保留字母、數字、底線、連字號和空格，其他標點符號移除
    # 但保留一些常見的分隔符（如斜線 /）用於技術術語
    query = re.sub(r'[^\w\s\-_/]+', ' ', query)
    
    # 4. 標準化底線和連字號周圍的空格
    # 將 "16 _ flat _ clustering" 轉換為 "16_flat_clustering"
    # 將 "16 - flat - clustering" 轉換為 "16-flat-clustering"
    query = re.sub(r'\s*_\s*', '_', query)
    query = re.sub(r'\s*-\s*', '-', query)
    # 處理斜線周圍的空格（但保留斜線本身）
    query = re.sub(r'\s*/\s*', '/', query)
    
    # 5. 標準化多餘空格
    query = re.sub(r'\s+', ' ', query)
    query = query.strip()
    
    # 6. 移除過短的單詞（但保留常見的技術縮寫和數字）
    # 中文查詢可能會有空白或單字長度為 1 的情況，避免過度過濾
    if re.search(r'[\u4e00-\u9fff]', query):
        return query
    
    words = query.split()
    filtered_words = []
    for word in words:
        # 保留：長度 >= 2 的單詞，或包含數字/底線/連字號的單詞
        if len(word) >= 2 or re.search(r'[\d_\-]', word):
            filtered_words.append(word)
    
    normalized_query = ' '.join(filtered_words)
    
    return normalized_query if normalized_query else query

# 設定索引路徑
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_PATH = os.path.join(BASE_DIR, "data", "indexes", "lucene-index")
LANGUAGE_REGEX = {
    "zh": re.compile(r"[\u4e00-\u9fff]"),
    "ja": re.compile(r"[\u3040-\u30ff]"),
    "ko": re.compile(r"[\uac00-\ud7a3]"),
    "ru": re.compile(r"[\u0400-\u04ff]"),
    "ar": re.compile(r"[\u0600-\u06ff]"),
    "hi": re.compile(r"[\u0900-\u097f]"),
    "el": re.compile(r"[\u0370-\u03ff]"),
    "he": re.compile(r"[\u0590-\u05ff]"),
    "th": re.compile(r"[\u0e00-\u0e7f]"),
    "en": re.compile(r"[a-zA-Z]"),
}

def _detect_query_language(query: str) -> str:
    for language, pattern in LANGUAGE_REGEX.items():
        if pattern.search(query or ""):
            return language
    return "en"

# ==========================================================
# [LLM4CS] Query Rewriting（來自 reference/llm4cs/chat_promptor.py）
# ==========================================================
async def llm4cs_rewrite_query(context: str, current_question: str) -> str:
    """
    使用 LLM4CS 風格的 prompt 將對話查詢改寫為獨立的檢索查詢。
    
    Args:
        context: 對話歷史上下文
        current_question: 當前使用者問題
        
    Returns:
        改寫後的查詢字串
    """
    prompt = format_llm4cs_rewrite_prompt(context, current_question)
    
    try:
        response = await call_gemini(
            system_prompt=SYSTEM_PROMPT_LLM4CS_REWRITE,
            user_prompt=prompt,
            temperature=0.7,  # LLM4CS 使用較高 temperature
            max_tokens=256
        )
        
        # 解析回應
        rewritten_query = parse_llm4cs_rewrite_response(response, original_query=current_question)
        print(f"[INFO] LLM4CS Rewrite: '{current_question}' -> '{rewritten_query}'")
        return rewritten_query
        
    except Exception as e:
        print(f"[ERROR] LLM4CS rewrite failed: {e}")
        return current_question  # 失敗時使用原始查詢


# ==========================================================
# [Passage Summarization] 摘要分塊邏輯（來自 reference/put_response.py）
# ==========================================================
async def summarize_passages(passages: List[str], context: str, utterance: str) -> str:
    """
    將多個 passages 摘要為一段文字。
    
    Args:
        passages: 待摘要的 passage 列表
        context: 對話歷史上下文
        utterance: 當前使用者問題
        
    Returns:
        摘要後的文字
    """
    if not passages:
        return ""
    
    # 格式化 passages
    formatted_passages = "\n\n".join(
        f"Passage {i+1}:\n{text}" for i, text in enumerate(passages)
    )
    
    prompt = format_summarize_prompt(context, utterance, formatted_passages)
    
    try:
        response = await call_gemini(
            system_prompt=SYSTEM_PROMPT_SUMMARIZE,
            user_prompt=prompt,
            temperature=0.1,
            max_tokens=350
        )
        
        summary = parse_summary_response(response)
        print(f"[INFO] Summarized {len(passages)} passages into {len(summary.split())} words")
        return summary
        
    except Exception as e:
        print(f"[ERROR] Passage summarization failed: {e}")
        # 失敗時返回原始 passages 的連接
        return " ".join(passages[:2])  # 只取前兩個作為 fallback


async def process_passages_with_summary(
    passages: List[Dict], 
    context: str, 
    utterance: str
) -> List[str]:
    """
    處理 passages：前 NUM_DIRECT_PASSAGES 個直接使用，
    剩餘的按 SUMMARY_CHUNK_SIZE 分塊摘要。
    
    Args:
        passages: 檢索到的 passage 列表 [{"text": ..., "filename": ...}, ...]
        context: 對話歷史上下文
        utterance: 當前使用者問題
        
    Returns:
        處理後的 passage 文字列表
    """
    if not passages:
        return []
    
    # 提取文字
    passage_texts = [p.get("text", "") for p in passages]
    
    # 前 NUM_DIRECT_PASSAGES 個直接使用
    direct_passages = passage_texts[:NUM_DIRECT_PASSAGES]
    
    # 剩餘的需要摘要
    passages_to_summarize = passage_texts[NUM_DIRECT_PASSAGES:]
    
    if not passages_to_summarize:
        return direct_passages
    
    # 分塊摘要
    summaries = []
    i = len(passages_to_summarize)
    chunks = []
    
    # 從後往前分塊（與 reference/put_response.py 一致）
    while i > 0:
        start_index = max(0, i - SUMMARY_CHUNK_SIZE)
        chunks.insert(0, passages_to_summarize[start_index:i])
        i = start_index
    
    # 對每個 chunk 進行摘要
    for chunk in chunks:
        try:
            summary = await summarize_passages(chunk, context, utterance)
            if summary:
                summaries.append(summary)
        except Exception as e:
            print(f"[WARNING] Chunk summarization failed: {e}")
            # 失敗時跳過此 chunk
    
    # 組合：直接 passages + 摘要
    return direct_passages + summaries

# ==========================================================
# 主邏輯
# ==========================================================
async def generate_response(
    query: str,
    conversation_history: List[Dict],
    ptkb_list: List[str],
    conversation_id: str = None,
    selected_doc_ids: List[str] = None 
) -> Dict:
    """
    生成整合回應 (RAG + PTKB)
    """
    
    # Step 1: 建立對話上下文 (PTKB)
    context = build_conversation_context(conversation_history)
    
    # Step 2: 提取新的 PTKB (PTKB)
    new_ptkb = None
    # [應急修改] 暫時關閉提取，避免觸發安全性過濾與 Quota 限制
    # try:
    #     new_ptkb = await extract_new_ptkb(context, query, ptkb_list)
    # except Exception as e:
    #     print(f"[ERROR] Extract PTKB failed: {e}")
    
    # Step 3: 更新 PTKB 列表 (PTKB)
    updated_ptkb_list = ptkb_list + ([new_ptkb] if new_ptkb else [])
    
    # Step 4: 取得相關的 PTKB (PTKB)
    relevant_ptkbs = []
    try:
        relevant_ptkbs = await get_relevant_ptkbs(context, query, updated_ptkb_list)
    except Exception as e:
        print(f"[ERROR] Get relevant PTKBs failed: {e}")

    # ============================================================
    # Step 4.5: 執行 RAG 文件搜尋 (LLM4CS + 摘要分塊)
    # 參數：NUM_PASSAGES=13, NUM_DIRECT_PASSAGES=4, SUMMARY_CHUNK_SIZE=5
    # ============================================================
    retrieved_docs_text = ""
    retrieved_sources = []
    
    # [關鍵修改] 每次請求時才載入 Searcher，解決「上傳後要重啟才搜得到」的問題
    searcher = None
    if PYSERINI_AVAILABLE:
        try:
            if os.path.exists(INDEX_PATH) and os.listdir(INDEX_PATH):
                searcher = LuceneSearcher(INDEX_PATH)
        except Exception as e:
            print(f"[WARNING] Failed to load index dynamically: {e}")
    else:
        if selected_doc_ids:
            print("[WARNING] Pyserini not available. RAG search is disabled.")

    # 只有當 Searcher 活著 且 使用者有勾選檔案時 才搜尋
    if searcher and selected_doc_ids:
        
        # Step 4.5.1: LLM4CS Query Rewriting
        try:
            search_query = await llm4cs_rewrite_query(context, query)
        except Exception as e:
            print(f"[WARNING] LLM4CS rewrite failed, using original query: {e}")
            search_query = query
        
        # Step 4.5.1.5: Normalize search query (清理使用者輸入的不相關字元)
        original_search_query = search_query
        search_query = normalize_search_query(search_query)
        if original_search_query != search_query:
            print(f"[INFO] Query normalized: '{original_search_query}' -> '{search_query}'")
        
        print(f"[INFO] Performing RAG search with query: '{search_query}' on docs: {selected_doc_ids}")
        
        try:
            # -----------------------------
            # Analyzer selection (auto + fallback)
            # -----------------------------
            q_has_zh = bool(re.search(r"[\u4e00-\u9fff]", search_query))
            q_has_en = bool(re.search(r"[a-zA-Z]", search_query))

            if q_has_zh and q_has_en:
                analyzer_order = ["other", "zh", "en", "default"]
            else:
                primary = _detect_query_language(search_query)
                if primary == "zh":
                    analyzer_order = ["zh", "other", "en", "default"]
                elif primary == "en":
                    analyzer_order = ["en", "other", "default"]
                else:
                    analyzer_order = [primary, "other", "default"]

            # Query variants (handle underscore mismatch like "16_flat_clustering" vs "16 flat clustering")
            query_variants = [search_query]
            if "_" in search_query:
                query_variants.append(search_query.replace("_", " "))

            def _run_search(q: str):
                return searcher.search(q, k=NUM_PASSAGES * 3)

            hits = []
            analyzer_used = None
            query_used = None

            for analyzer in analyzer_order:
                if analyzer != "default" and hasattr(searcher, "set_language"):
                    try:
                        searcher.set_language(analyzer)
                    except Exception as e:
                        print(f"[WARNING] set_language('{analyzer}') failed: {e}")

                for qv in query_variants:
                    hits = _run_search(qv)
                    if hits:
                        analyzer_used = analyzer
                        query_used = qv
                        break
                if hits:
                    break

            if not hits and hasattr(searcher, "set_language"):
                try:
                    searcher.set_language("other")
                    hits = _run_search(search_query)
                    if hits:
                        analyzer_used = "other"
                        query_used = search_query
                except Exception:
                    pass

            print(f"[INFO] Search analyzer used: {analyzer_used}, query used: {query_used}, hits: {len(hits)}")
            valid_chunks = []
            
            for hit in hits:
                # 讀取完整內容
                doc = searcher.doc(hit.docid)
                if not doc: 
                    continue
                
                doc_json = json.loads(doc.raw())
                metadata = doc_json.get('metadata', {})
                doc_id_from_metadata = metadata.get('doc_id')
                hit_score = hit.score
                
                # 過濾：只保留勾選的 doc_id (白名單機制)
                if doc_id_from_metadata in selected_doc_ids:
                    # SCORE_THRESHOLD 過濾（目前設為 0，即不過濾）
                    if hit_score >= SCORE_THRESHOLD:
                        valid_chunks.append({
                            "text": doc_json.get('contents', ''),
                            "filename": metadata.get('filename', 'unknown'),
                            "score": hit_score
                        })
                        # 取 NUM_PASSAGES 筆
                        if len(valid_chunks) >= NUM_PASSAGES:
                            break
            
            # Step 4.5.3: 處理 passages（前 4 個直接用，剩餘摘要）
            if valid_chunks:
                print(f"[INFO] Found {len(valid_chunks)} relevant chunks. Processing with summarization...")
                
                # 使用摘要分塊邏輯
                processed_passages = await process_passages_with_summary(
                    valid_chunks, context, query
                )
                
                # 整理結果
                retrieved_docs_text = "【Reference Documents】:\n"
                for i, passage_text in enumerate(processed_passages):
                    if i < NUM_DIRECT_PASSAGES:
                        # 直接 passage，標註來源
                        source_info = valid_chunks[i].get('filename', 'unknown') if i < len(valid_chunks) else 'summary'
                        retrieved_docs_text += f"[Source: {source_info}]: {passage_text}\n\n"
                    else:
                        # 摘要 passage
                        retrieved_docs_text += f"[Summary]: {passage_text}\n\n"
                
                retrieved_sources = valid_chunks[:NUM_DIRECT_PASSAGES]  # 只回傳直接使用的來源
                print(f"[INFO] Processed into {len(processed_passages)} final passages.")
            else:
                print("[INFO] No chunks found after filtering.")
                
        except Exception as e:
            print(f"[ERROR] RAG Search failed: {e}")

    # Step 5: 生成最終回應
    ptkb_str = "\n".join([f"- {p}" for p in relevant_ptkbs]) if relevant_ptkbs else "None provided."
    base_user_prompt = format_response_prompt(context, query, ptkb_str)
    
    # 組合 Prompt
    final_user_prompt = base_user_prompt
    if retrieved_docs_text:
        # 指示 AI：參考文件，但用使用者的語言回答
        final_user_prompt = (
            f"{retrieved_docs_text}\n"
            f"---------------------\n"
            f"User Question: {query}\n"
            f"Instruction: Answer the user's question using the Reference Documents above. "
            f"If the documents are in English but the question is in Chinese, please answer in Chinese."
        )
    
    final_response = ""
    try:
        gemini_response = await call_gemini(
            system_prompt=SYSTEM_PROMPT_RESPONSE,
            user_prompt=final_user_prompt,
            temperature=0.5,
            max_tokens=2000  # Increased from 500 to 2000 to allow longer responses
        )
        final_response = parse_final_response(gemini_response)
        # Only truncate if response is extremely long
        word_count = len(final_response.split())
        if word_count > RESPONSE_LIMIT:
            print(f"[WARNING] Response truncated from {word_count} to {RESPONSE_LIMIT} words")
            final_response = truncate_response(final_response, RESPONSE_LIMIT)
    except Exception as e:
        print(f"[ERROR] Gemini call failed: {e}")
        final_response = "Sorry, error generating response."
    
    # Step 6: 回傳
    return {
        "answer": final_response,
        "conversation_id": conversation_id or str(uuid.uuid4()),
        "ptkb_used": relevant_ptkbs,
        "new_ptkb": new_ptkb,
        "sources": retrieved_sources
    }

# Helper functions
def parse_final_response(text: str) -> str:
    lower = text.lower()
    if "response:" in lower:
        return text.split(":", 1)[1].strip()
    return text

def truncate_response(text: str, limit: int) -> str:
    if not text: return ""
    words = text.split()
    if len(words) <= limit: return text
    return " ".join(words[:limit]) + "..."
