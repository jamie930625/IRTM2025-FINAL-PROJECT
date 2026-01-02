# 1. Candidate Generation via LLM4CS

qrel_file_path="/tmp2/b11902091/CFDA-TREC-iKAT2025/DATA/topics/2022_test_qrels_binary.json"
input_path="/tmp2/b11902091/CFDA-TREC-iKAT2025/DATA/topics/2022_flatten_test_topics.json"
output_path="/tmp2/b11902091/CFDA-TREC-iKAT2025/DATA/candidates/irtm_1b_cast2022_llm4cs_qwen_cand01.jsonl"
model_family="qwen"

N_candidates=1

python chat_prompt_RAR_CoT.py \
--qrel_file_path=$qrel_file_path \
--test_file_path=$input_path \
--demo_file_path="./demonstrations.json" \
--output_path=$output_path \
--n_generation=$N_candidates \
--model=$model_family \
--omit_pr