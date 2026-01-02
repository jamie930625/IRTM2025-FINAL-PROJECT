# 1. Candidate Generation via CHIQ-AD

input_path="/tmp2/b11902091/CFDA-TREC-iKAT2025/DATA/topics/2022_flatten_test_topics.json"
output_path="/tmp2/b11902091/CFDA-TREC-iKAT2025/DATA/candidates/irtm_1a_cast2022_chiq_llama_cand01.jsonl"

N_candidates=1

python rewrite_chiq.py \
    --data_file_path=$input_path \
    --output_path=$output_path \
    --n_generation=$N_candidates