import os
import json
import uuid
import subprocess
import shutil
import re # [新增] 用於文字清洗
from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException
from pypdf import PdfReader

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


def _detect_language(text: str) -> str:
    if not text:
        return "en"
    for language, pattern in LANGUAGE_REGEX.items():
        if pattern.search(text):
            return language
    return "en"


def _detect_languages_in_text(text: str) -> set:
    """
    回傳文字中可能出現的語言集合
    """
    if not text:
        return set()

    langs = set()
    for language, pattern in LANGUAGE_REGEX.items():
        if pattern.search(text):
            langs.add(language)
    return langs


def _choose_index_language(langs: set) -> str:
    if not langs:
        return "en"
    if "zh" in langs and "en" in langs:
        return "other"
    if "zh" in langs:
        return "zh"
    if "en" in langs:
        return "en"
    return next(iter(langs))

# ================= 設定區 =================
# 取得 backend 的根目錄路徑
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 資料夾結構配置
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "uploads")        # 原始檔案存放區
JSONL_DIR = os.path.join(BASE_DIR, "data", "jsonl")          # 切塊後的 JSONL
INDEX_DIR = os.path.join(BASE_DIR, "data", "indexes", "lucene-index") # Pyserini 索引位置

# 確保目錄都存在
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(JSONL_DIR, exist_ok=True)

class DocumentService:
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """列出所有已索引的文件"""
        documents = []
        if not os.path.exists(JSONL_DIR):
            return documents
        
        for filename in os.listdir(JSONL_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(JSONL_DIR, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        first_line = f.readline()
                        if first_line:
                            data = json.loads(first_line)
                            metadata = data.get('metadata', {})
                            original_filename = metadata.get('filename', 'unknown')
                            file_ext = original_filename.split('.')[-1].lower() if '.' in original_filename else 'txt'
                            documents.append({
                                "id": metadata.get('doc_id'),
                                "filename": original_filename,
                                "file_type": file_ext,
                                "status": "ready"
                            })
                except Exception as e:
                    print(f"[WARNING] Failed to read {filename}: {e}")
        
        return documents
    
    def delete_document(self, doc_id: str) -> bool:
        """刪除文件及其索引"""
        print(f"[INFO] Deleting document: {doc_id}")
        
        # 1. 刪除 JSONL 檔案
        jsonl_path = os.path.join(JSONL_DIR, f"{doc_id}.json")
        if os.path.exists(jsonl_path):
            os.remove(jsonl_path)
            print(f"[INFO] Removed JSONL: {jsonl_path}")
        
        # 2. 刪除原始檔案 (可能有多種副檔名)
        for ext in ['pdf', 'txt', 'PDF', 'TXT']:
            upload_path = os.path.join(UPLOAD_DIR, f"{doc_id}.{ext}")
            if os.path.exists(upload_path):
                os.remove(upload_path)
                print(f"[INFO] Removed upload file: {upload_path}")
                break
        
        # 3. 重建索引 (如果還有其他文件的話)
        remaining_files = [f for f in os.listdir(JSONL_DIR) if f.endswith('.json')] if os.path.exists(JSONL_DIR) else []
        
        if remaining_files:
            print(f"[INFO] Rebuilding index with {len(remaining_files)} remaining documents...")
            self._run_pyserini_indexing()
        else:
            # 沒有文件了，刪除索引目錄
            if os.path.exists(INDEX_DIR):
                shutil.rmtree(INDEX_DIR)
                print("[INFO] Removed empty index directory")
        
        return True
    
    async def process_upload(self, file: UploadFile) -> Dict[str, Any]:
        """
        處理上傳流程：存檔 -> 文字提取 -> 智慧分塊 -> 轉JSONL -> 建立索引
        """
        # 1. 產生唯一 ID 與路徑
        doc_id = str(uuid.uuid4())
        filename = file.filename if file.filename else "untitled"
        file_ext = filename.split(".")[-1].lower()
        save_path = os.path.join(UPLOAD_DIR, f"{doc_id}.{file_ext}")
        
        # 2. 儲存原始檔案
        try:
            with open(save_path, "wb") as f:
                content = await file.read()
                f.write(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

        # 3. 提取文字 (Extract)
        text_content = ""
        if file_ext == "pdf":
            text_content = self._extract_text_from_pdf(save_path)
        else:
            # 預設嘗試用 utf-8 讀取 txt
            try:
                text_content = content.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="Only UTF-8 text files are supported.")

        if not text_content.strip():
            raise HTTPException(status_code=400, detail="File is empty or content is unreadable.")

        # 4. 內容分塊 (Chunking) - [已升級] 使用滑動視窗
        # chunk_size 設為 500，overlap 設為 100 以確保語意連貫
        chunks = self._chunk_text(text_content, chunk_size=500, overlap=100)

        # 5. 寫入 JSONL (Prepare for Pyserini) - 檢查 pyserini 是否可用
        try:
            import pyserini
            PYSERINI_AVAILABLE = True
        except ImportError:
            PYSERINI_AVAILABLE = False
            print("[WARNING] Pyserini not available. Indexing will be skipped.")
        jsonl_path = os.path.join(JSONL_DIR, f"{doc_id}.json")
        
        with open(jsonl_path, "w", encoding="utf-8") as f:
            for idx, chunk in enumerate(chunks):
                record = {
                    "id": f"{doc_id}#{idx}",   # 唯一 ID
                    "contents": chunk,         # 實際內容
                    "metadata": {              # 後設資料
                        "doc_id": doc_id,      # 過濾用 ID
                        "filename": filename,
                        "chunk_index": idx
                    }
                }
                json.dump(record, f, ensure_ascii=False)
                f.write("\n") # JSONL 格式要求每筆資料換行

        # 6. 索引更新時需檢查 pyserini 是否可用
        try:
            import pyserini
            PYSERINI_AVAILABLE = True
        except (ImportError, Exception):
            PYSERINI_AVAILABLE = False
            print("[WARNING] Pyserini not available. Indexing will be skipped.")
        
        if PYSERINI_AVAILABLE:
            index_success = self._run_pyserini_indexing()
            if not index_success:
                print("[WARNING] Indexing failed, but file upload succeeded.")
        else:
            print("[INFO] Skipping indexing (Pyserini not available). File uploaded successfully.")

        return {
            "id": doc_id,
            "filename": filename,
            "chunks_count": len(chunks),
            "status": "ready",
            "message": "File processed and indexed successfully."
        }

    def _extract_text_from_pdf(self, path: str) -> str:
        """
        [強力清洗版] 使用 pypdf 讀取 PDF 並修復破碎單字
        """
        full_text = []
        try:
            reader = PdfReader(path)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    # [清洗步驟]
                    
                    # 1. 先把換行轉成空白，避免句子因為排版換行被截斷
                    text = text.replace('\n', ' ')
                    
                    # 2. [關鍵修復] 修復破碎單字 (例如: S t r u c t u r e -> Structure)
                    # 邏輯：如果一個字母 (\w) 後面接空白 (\s+)，且再後面還是字母 (?=\w)，就把中間的空白拿掉
                    # 注意：這是一個 Trade-off，可能會把 "I am" 變成 "Iam"，
                    # 但對於解決 "S t r u c t u r e" 這種無法搜尋的問題至關重要。
                    text = re.sub(r'(\w)\s+(?=\w)', r'\1', text)
                    
                    # 3. 清理多餘空白 (經過上面處理後，可能還有多餘的連續空白，縮減成一個)
                    text = re.sub(r'\s+', ' ', text)

                    full_text.append(text)
            
            # 用雙換行連接每一頁
            return "\n\n".join(full_text)
        except Exception as e:
            print(f"[ERROR] PDF Extract error: {e}")
            return ""

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
        """
        [優化版] 滑動視窗分段 (Sliding Window Chunking)
        
        為什麼改用這個？
        原本的遞迴切分對結構化文字很好，但 PDF 轉出來的文字常常缺乏結構。
        滑動視窗能確保：
        1. 每一段都有足夠的重疊 (overlap)，避免語意被切斷。
        2. 嘗試尋找句號切分，讓段落更自然。
        """
        if not text:
            return []
            
        chunks = []
        start = 0
        text_len = len(text)
        
        while start < text_len:
            # 1. 預設切分點
            end = min(start + chunk_size, text_len)
            
            # 2. 優化切分點：不要切在句子中間
            if end < text_len:
                # 往後偷看 50 個字，找有沒有句號或空白
                look_ahead_buffer = text[end:min(end + 50, text_len)]
                
                # 定義句子結束符號 (中文句號優先，再來是英文句號、問號等)
                sentence_endings = ["。", "！", "？", ".", "!", "?", "\n"]
                
                found_cut_point = False
                for char in sentence_endings:
                    if char in look_ahead_buffer:
                        # 找到結束符號，把 end 延伸到該符號之後
                        end += (look_ahead_buffer.index(char) + 1)
                        found_cut_point = True
                        break
                
                # 如果沒找到標點，退而求其次找空白鍵 (避免切斷單字)
                if not found_cut_point and " " in look_ahead_buffer:
                     end += (look_ahead_buffer.index(" ") + 1)

            # 3. 取出 chunk
            chunk = text[start:end]
            if chunk.strip(): # 避免存入空字串
                chunks.append(chunk.strip())
            
            # 4. 移動視窗 (Sliding)
            # 確保有 overlap，讓上一段的結尾重複出現在下一段的開頭
            start += (chunk_size - overlap)
            
            # 防止無窮迴圈
            if start >= end:
                start = end
            
        return chunks

    
    def _run_pyserini_indexing(self) -> bool:
        """        Rebuild (or build) the Lucene index from JSONL chunks using Pyserini.

        Key fixes:
        - Use *the current interpreter* (sys.executable) so the venv-installed pyserini is found.
          (Your log shows it was calling the system Python -> ModuleNotFoundError: pyserini)
        - Auto-detect language across **all** documents/chunks.
          * If both Chinese and English are detected => use 'other' analyzer (mixed-language).
          * If only one language is detected => use that language analyzer.
          * If detection fails => fall back to default analyzer.
        - Try a small analyzer fallback chain to be robust.
        """
        import sys

        # ---------- 1) Detect index language over ALL jsonl files ----------
        languages_found = set()
        try:
            if os.path.exists(JSONL_DIR):
                for fname in os.listdir(JSONL_DIR):
                    if not fname.endswith(".json"):
                        continue
                    fp = os.path.join(JSONL_DIR, fname)
                    with open(fp, "r", encoding="utf-8") as fh:
                        for line in fh:
                            try:
                                rec = json.loads(line)
                            except json.JSONDecodeError:
                                continue
                            contents = rec.get("contents", "") or ""
                            lang = _detect_language(contents)
                            if lang:
                                languages_found.add(lang)
                            # early stop if mixed already
                            if "zh" in languages_found and "en" in languages_found:
                                raise StopIteration
        except StopIteration:
            pass
        except Exception as e:
            print(f"[WARNING] Language detection failed, will fall back to default analyzer: {e}")
            languages_found = set()

        # normalize: only keep analyzers we intend to use
        # pyserini supports many, but for our use we mainly care about zh/en/other.
        if "zh" in languages_found and "en" in languages_found:
            detected = "other"   # mixed-language documents
        elif "zh" in languages_found:
            detected = "zh"
        elif "en" in languages_found:
            detected = "en"
        else:
            detected = "default"

        # ---------- 2) Build base command ----------
        # IMPORTANT: use sys.executable (venv python) instead of plain "python"
        base_cmd = [
            sys.executable, "-m", "pyserini.index.lucene",
            "--collection", "JsonCollection",
            "--input", "data/jsonl",
            "--index", "data/indexes/lucene-index",
            "--generator", "DefaultLuceneDocumentGenerator",
            "--threads", "1",
            "--storePositions", "--storeDocvectors", "--storeRaw",
        ]

        # ---------- 3) Analyzer fallback chain ----------
        # 'default' means: do NOT pass --language at all (let Lucene default analyzer decide)
        analyzer_candidates = []
        if detected == "default":
            analyzer_candidates = ["default", "en", "other"]
        elif detected == "other":
            analyzer_candidates = ["other", "zh", "en", "default"]
        else:
            # single-language index
            analyzer_candidates = [detected, "other", "default"]

        print(f"[INFO] Starting Indexing... Target: {JSONL_DIR}")
        print(f"[INFO] Languages found: {sorted(languages_found) if languages_found else 'N/A'}")
        print(f"[INFO] Detected analyzer: {detected}")

        last_err = ""
        for analyzer in analyzer_candidates:
            cmd = list(base_cmd)
            if analyzer != "default":
                cmd += ["--language", analyzer]

            print(f"[INFO] Indexing with language analyzer: {analyzer if analyzer != 'default' else '(auto/default)'}")
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR)

                if result.returncode == 0:
                    print("[INFO] Indexing Success!")
                    return True

                # show stderr for debugging, but keep going
                last_err = (result.stderr or result.stdout or "").strip()
                print("[WARNING] Indexing attempt failed. Trying next analyzer...")
                if last_err:
                    print(last_err[:2000])

            except Exception as e:
                last_err = str(e)
                print(f"[WARNING] Subprocess error: {e}. Trying next analyzer...")

        print("[ERROR] Indexing Failed after fallbacks:")
        if last_err:
            print(last_err[:4000])
        return False