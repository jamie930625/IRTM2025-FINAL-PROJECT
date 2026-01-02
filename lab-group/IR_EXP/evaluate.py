import argparse
import json
from ranx import Qrels, Run, evaluate

def main():
    parser = argparse.ArgumentParser(description='Evaluate retrieval results using ranx')
    parser.add_argument('--qrels', type=str, required=True, help='Path to qrels.json')
    parser.add_argument('--run', type=str, required=True, help='Path to run.json')
    # 使用 ranx 的指標格式，例如 ndcg@10, map, recall@100
    parser.add_argument('--metrics', type=str, nargs='+', 
                        default=['map', 'ndcg@10', 'recall@100', 'precision@10'], 
                        help='Metrics to calculate (e.g., map, ndcg@10)')

    args = parser.parse_args()

    # 1. 讀取 Qrels
    print(f"Loading qrels from: {args.qrels}")
    with open(args.qrels, 'r', encoding='utf-8') as f:
        qrels_dict = json.load(f)

    # 確保 key 為字串
    qrels_dict = {str(k): v for k, v in qrels_dict.items()}

    # 2. 讀取 Run 結果
    print(f"Loading run from: {args.run}")
    with open(args.run, 'r', encoding='utf-8') as f:
        run_dict = json.load(f)
    
    run_dict = {str(k): v for k, v in run_dict.items()}

    # 3. 轉換為 ranx 物件
    print("Converting data to ranx format...")
    qrels = Qrels.from_dict(qrels_dict)
    run = Run.from_dict(run_dict)

    # 4. 執行評估
    print(f"Evaluating metrics: {args.metrics} ...")
    results = evaluate(qrels, run, metrics=args.metrics)

    # 5. 輸出結果
    print("-" * 40)
    print(f"{'Metric':<15} | {'Score':<15}")
    print("-" * 40)
    
    for metric, score in results.items():
        print(f"{metric:<15} | {score:.4f}")
    
    print("-" * 40)

if __name__ == '__main__':
    main()