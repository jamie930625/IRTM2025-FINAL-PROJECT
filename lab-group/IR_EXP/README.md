# Passage Retrieval 

This component handles the end-to-end process of document retrieval and performance benchmarking. It supports multiple traditional IR scoring functions to provide a baseline for conversational search tasks.

## Innovations

We investigate the impact of different term-weighting schemes and scoring functions on retrieval performance. By comparing the following methods, we aim to understand how frequency modeling affects the quality of the retrieved candidates for downstream LLM processing:

- **Binary Retrieval**: A simplified matching strategy (frequency agnostic) to test the necessity of term frequency in sparse retrieval.
    
- **TF-IDF**: The classic statistical measure used to evaluate how important a word is to a document.
    
- **BM25**: A robust non-linear term frequency saturation model (Best Match 25).

## Usage

The script `run_exp.sh` is provided to execute both passage retrieval and evaluation. Follow these steps to use it:

1. **Configure Parameters**:
    - `method`: Specify the retrieval algorithm: `binary`, `tfidf`, or `bm25`.
    - `index_path`: Specify the path to the Pre-built Pyserini/Lucene index.
    - `qrel_file_path`: Specify the path to the ground truth labels for evaluation.
    - `query_path`: Specify the path to the .tsv file containing query IDs and rewritten utterances.

2. **Run the Script**: After updating the script and preparing the required data, execute the following command:

    ```bash
    bash run_exp.sh
    ```