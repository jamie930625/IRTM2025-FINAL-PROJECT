# 1. Passage Retrieval

index_path="kilt_marco_index"
qrel_file_path="/tmp2/b11902091/CFDA-TREC-iKAT2025/DATA/topics/2022_test_qrels_binary.json"
query_path="/tmp2/b11902091/CFDA-TREC-iKAT2025/DATA/queries/queries_1a_llm4cs_qwen_2022.tsv"
method="bm25"

python retrieve.py \
  --index $index_path \
  --queries $query_path \
  --output run.json \
  --method $method \
  --threads 30 \
  --k 100

# 2. Evaluation

python evaluate.py \
  --qrels $qrel_file_path \
  --run run.json \
  --metrics map ndcg@10 recall@100 precision@5