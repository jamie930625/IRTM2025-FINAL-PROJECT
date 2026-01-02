import argparse
import json
import os
from pyserini.search.lucene import LuceneSearcher

def main():
    parser = argparse.ArgumentParser(description='Integrated Retrieval Script (BM25, TF-IDF, Binary)')
    
    # 共同參數
    parser.add_argument('--index', type=str, required=True, help='Path to the pyserini index')
    parser.add_argument('--queries', type=str, required=True, help='Path to queries.tsv (format: id \t query)')
    parser.add_argument('--output', type=str, required=True, help='Output path for run.json')
    parser.add_argument('--k', type=int, default=100, help='Top-k documents to retrieve')
    parser.add_argument('--threads', type=int, default=10, help='Number of threads for batch retrieval')
    
    # 方法選擇 Flag
    parser.add_argument('--method', type=str, required=True, choices=['bm25', 'tfidf', 'binary'], 
                        help='Retrieval method: bm25, tfidf, or binary')

    # BM25 專屬參數 (如果選 binary 會自動被覆蓋為 0)
    parser.add_argument('--k1', type=float, default=1.2, help='BM25 k1 parameter (default: 1.2)')
    parser.add_argument('--b', type=float, default=0.75, help='BM25 b parameter (default: 0.75)')

    args = parser.parse_args()

    # 1. 初始化 Searcher
    print(f"Loading index from: {args.index}")
    searcher = LuceneSearcher(args.index)

    # 2. 根據 Method 設定演算法邏輯
    if args.method == 'bm25':
        print(f">>> Method: BM25 (k1={args.k1}, b={args.b})")
        searcher.set_bm25(args.k1, args.b)
        
    elif args.method == 'binary':
        print(">>> Method: Binary Retrieval (Simulated via BM25 k1=0, b=0)")
        searcher.set_bm25(k1=0.0, b=0.0)
        
    elif args.method == 'tfidf':
        print(">>> Method: TF-IDF (ClassicSimilarity)")
        try:
            from jnius import autoclass
            ClassicSimilarity = autoclass('org.apache.lucene.search.similarities.ClassicSimilarity')
            searcher.object.setSimilarity(ClassicSimilarity())
        except Exception as e:
            print(f"Error setting TF-IDF similarity: {e}")
            print("Please ensure 'jnius' is installed and Pyjnius environment is correct.")
            return

    # 3. 讀取 Queries
    print(f"Reading queries from: {args.queries}")
    qids = []
    texts = []
    
    if not os.path.exists(args.queries):
        print(f"Error: Query file not found at {args.queries}")
        return

    with open(args.queries, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                parts = line.split('\t', 1)
                if len(parts) == 2:
                    qids.append(parts[0])
                    texts.append(parts[1])
            except ValueError:
                print(f"Skipping invalid line: {line}")

    print(f"Total queries loaded: {len(qids)}")

    # 4. 執行批量檢索
    print(f"Starting retrieval with {args.threads} threads (Top-{args.k})...")
    hits_dict = searcher.batch_search(texts, qids, k=args.k, threads=args.threads)

    # 5. 整理並儲存結果
    run_results = {}
    for qid in qids:
        if qid in hits_dict:
            hits = hits_dict[qid]
            # 建立 docid -> score 的映射
            run_results[qid] = {hit.docid: float(hit.score) for hit in hits}
        else:
            run_results[qid] = {}

    print(f"Saving results to: {args.output}")
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(run_results, f, indent=2)

    print(f"Done. Method '{args.method}' execution complete.")

if __name__ == '__main__':
    main()