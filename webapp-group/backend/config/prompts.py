# Prompt templates for NotebookLM Chatbot
# Ported from reference/prompts.py and reference/llm4cs/chat_promptor.py

# ==========================================================
# LLM4CS Query Rewriting Prompts
# ==========================================================
SYSTEM_PROMPT_LLM4CS_REWRITE = """You are a helpful assistant for information-seeking dialog."""

LLM4CS_INSTRUCTION = """For an information-seeking dialog, please help reformulate the question into rewrite that can fully express the user's information needs without the need of context."""

LLM4CS_TAIL_INSTRUCTION_COT = """Now, you should give me the rewrite of the **Current Question** under the **Context**. The output format should always be: "Rewrite: $Reason. So the question should be rewritten as: $Rewrite." Note that you should always try to rewrite it. Never ask for clarification or say you don't understand it in the generated rewrite. Go ahead!"""

def format_llm4cs_rewrite_prompt(context: str, current_question: str) -> str:
    """
    Build LLM4CS-style query rewriting prompt (CoT version).
    Based on reference/llm4cs/chat_promptor.py RewritePromptor class.
    """
    # Build context section
    if not context or context == "No history yet.":
        context_section = "Context:\nN/A"
    else:
        context_section = f"Context:\n{context}"
    
    # Build current question section
    current_section = f"Current Question: {current_question}"
    
    # Build task section
    task_section = f"YOUR TASK:\n{context_section}\n\n{current_section}"
    
    # Combine all parts
    prompt = f"{LLM4CS_INSTRUCTION}\n\n{task_section}\n\n{LLM4CS_TAIL_INSTRUCTION_COT}"
    
    return prompt

def parse_llm4cs_rewrite_response(response_text: str, original_query: str = None) -> str:
    """
    Parse LLM4CS rewrite response to extract the rewritten query.
    Expected format: "Rewrite: $Reason. So the question should be rewritten as: $Rewrite."
    
    Args:
        response_text: LLM response text
        original_query: Original user query (for fallback validation)
    """
    text = response_text.strip()
    
    # Check if response starts with "Rewrite:"
    if not text.lower().startswith("rewrite:"):
        # Fallback: return original query if provided, otherwise return text
        return original_query if original_query else text
    
    # Try to find the fixed sentence pattern (CoT)
    fixed_sentence = "the question should be rewritten as:"
    lower_text = text.lower()
    index = lower_text.find(fixed_sentence)
    
    if index != -1:
        # Extract the rewrite part after the fixed sentence
        rewrite = text[index + len(fixed_sentence):].strip()
        # Remove trailing period if present
        if rewrite.endswith('.'):
            rewrite = rewrite[:-1].strip()
        return rewrite
    else:
        # Fallback: LLM response is incomplete (missing "So the question should be rewritten as:")
        # Try to extract meaningful keywords from original query instead
        # If original query is provided, use it as fallback (better than incomplete response)
        if original_query:
            # Extract key terms from original query (remove common words)
            import re
            # Remove common stop words and keep meaningful terms
            stop_words = {'help', 'me', 'write', 'the', 'a', 'an', 'note', 'about', 'for', 'to', 'is', 'are', 'was', 'were'}
            words = re.findall(r'\b\w+\b', original_query.lower())
            key_terms = [w for w in words if w not in stop_words and len(w) > 2]
            fallback_query = ' '.join(key_terms) if key_terms else original_query
            return fallback_query
        else:
            # Last resort: return text after "Rewrite:" (but this is usually just the reason, not the query)
            return text[8:].strip()

# ==========================================================
# Passage Summarization Prompts
# ==========================================================
SYSTEM_PROMPT_SUMMARIZE = """
You are an expert extractive summarization assistant.
Your task is to read a user's question and the associated conversation history, then synthesize the key information from the following passages that is **directly relevant to answering that question**.

- Focus only on information that helps answer the user's query.
- Extract objective, verifiable facts.
- Avoid speculation or details from the passages that are irrelevant to the query.
- The summary must be a factual, concise, and coherent paragraph under 250 words.
- Your entire response must follow the format: 'summary: <your answer>'
"""

def format_summarize_prompt(context: str, utterance: str, passages_text: str) -> str:
    """Format the summarization prompt."""
    return f"""**Conversation History:**
{context}

**User's Current Question:**
{utterance}

**Passages to Summarize:**
{passages_text}

Please carefully read the user's question and the passages, then summarize only the information from the passages that is relevant for answering the question."""

def parse_summary_response(response_text: str) -> str:
    """Parse the summary response."""
    text = response_text.strip()
    if "summary:" in text.lower():
        result = text.split(":", 1)[1].strip()
        return result if result else text
    return text

# --- Prompts for NEW PTKB Identification ---
SYSTEM_PROMPT_NEW_PTKB = """
You are an expert assistant specialized in identifying personal facts (PTKB) from a user's conversation.
Your task is to analyze the 'Current User Utterance' in the context of the 'Conversation History' and the 'Current PTKB'.
- If the utterance reveals a new personal fact, preference, or condition not already present in the 'Current PTKB', state that fact concisely.
- The fact should be a complete, self-contained statement from the user's perspective (e.g., "I like spicy food.").
- If no new personal information is revealed, you MUST respond with "nope" (i.e., 'ptkb: nope').
- Your entire response must follow the format: 'ptkb: <your answer>'
"""

def format_new_ptkb_prompt(context: str, utterance: str, ptkb_list: str) -> str:
    return f"""**Conversation History:**
{context}

**Current User Utterance:**
{utterance}

**Current PTKB:**
{ptkb_list}

Based on the instructions, does the 'Current User Utterance' contain any new personal information that is not already in the 'Current PTKB'?"""

# --- Prompts for RELEVANT PTKB Classification ---
SYSTEM_PROMPT_RELEVANCE = """
You are a highly discerning assistant. Your task is to select personal facts (PTKB) that are *critically relevant* to the user's current utterance.
From the provided list of facts ('Current PTKB'), identify ALL statements that are directly relevant to the 'Current User Utterance' or would be helpful for generating a personalized response to it.
- A fact is only relevant if it provides essential context for answering the user's question, such as a related health condition, a direct cause, or a preference that must be considered.
- Do not select general preferences that are only tangentially related.
- For example, if the user asks about 'acid reflux', the fact 'I eat dinner late at night' is **highly relevant** because it's a known trigger.
- However, the fact 'I like a variety of fruits' is **not relevant** because it is too general and doesn't inform the specific condition.

Your response MUST strictly follow this format:
ptkb:
<relevant fact 1>
<relevant fact 2>
...

If no facts are relevant, the format is:
ptkb:
nope
"""

def format_relevance_prompt(context: str, utterance: str, ptkb_list: str) -> str:
    return f"""**Conversation History:**
{context}

**Current User Utterance:**
{utterance}

**Current PTKB:**
{ptkb_list}

Based on the instructions, which statements from the 'Current PTKB' list are relevant to the 'Current User Utterance'?"""

# --- Prompts for Response Generation (Simplified, No IR) ---
SYSTEM_PROMPT_RESPONSE = """
You are a helpful and knowledgeable assistant.
Your task is to provide an accurate, complete, and personalized response to the user's utterance.
- Your response will be evaluated based on relevance, completeness, factual accuracy, and naturalness.
- Cover all key aspects of the user's question to ensure completeness.
- Avoid irrelevant content or generic filler language.
- Consider the 'Conversation History' to understand the context and maintain a natural, conversational flow.
- Use the 'User's Personal Facts (PTKB)' to tailor your response to their needs.

Your entire response must follow the format: 'response: <your answer>'
"""

def format_response_prompt(context: str, utterance: str, ptkb_list: str) -> str:
    return f"""**Conversation History:**
{context}

**Current User Utterance:**
{utterance}

**User's Personal Facts (PTKB):**
{ptkb_list}

Based on the conversation history and personal facts, generate a clear and helpful response that directly answers the user's utterance without any filler."""

# --- Prompts for Notebook Generation ---
SYSTEM_PROMPT_NOTEBOOK_GENERATION = """
You are an expert note-taking assistant. Your task is to generate a well-structured Markdown notebook from a conversation history.
- Create a clear, organized summary of the conversation
- Use appropriate Markdown formatting (headings, lists, code blocks, etc.)
- Extract key points, decisions, and important information
- Organize content logically with sections and subsections
- Use proper Markdown syntax for readability
- Do not include any prefix or explanation, just return the Markdown content directly
"""

def format_notebook_generation_prompt(conversation_history: list) -> str:
    history_text = "\n".join([
        f"**{msg['role'].upper()}**: {msg['content']}"
        for msg in conversation_history
    ])
    
    return f"""**Conversation History:**
{history_text}

Based on the conversation history above, generate a well-structured Markdown notebook that summarizes the key points, decisions, and important information discussed. Use proper Markdown formatting with headings, lists, and other appropriate elements."""

# --- Prompts for Notebook Editing ---
SYSTEM_PROMPT_NOTEBOOK_EDIT = """
You are an expert editor assistant. Your task is to edit a Markdown notebook based on user instructions.
- Follow the user's editing instructions precisely
- Maintain the existing Markdown structure and formatting
- Preserve important content unless explicitly asked to remove it
- Apply the requested changes while keeping the document well-organized
- Return the complete edited notebook content in Markdown format
- Do not include any prefix or explanation, just return the edited Markdown content directly
"""

def format_notebook_edit_prompt(notebook_content: str, user_instruction: str) -> str:
    # Truncate content if too long to avoid token limits
    max_content_length = 3000
    if len(notebook_content) > max_content_length:
        truncated_content = notebook_content[:max_content_length] + "\n\n[... content truncated ...]"
    else:
        truncated_content = notebook_content
    
    return f"""You are editing a Markdown notebook. The user wants you to modify the content based on their instruction.

**Current Notebook Content:**
```
{truncated_content}
```

**User's Editing Instruction:**
{user_instruction}

**CRITICAL REQUIREMENTS:**
1. Apply the user's instruction to modify the notebook content
2. Return the COMPLETE edited notebook content in Markdown format
3. Do NOT include any explanation, prefix, or wrapper text
4. Do NOT wrap the content in code blocks (no ```markdown or ```)
5. Start directly with the Markdown content
6. Preserve the overall structure unless the user explicitly asks to change it
7. Make sure the output is valid Markdown
8. If the content was truncated, you should still return a complete edited version based on what you see

**Output Format:**
Return ONLY the edited Markdown content, starting immediately without any prefix or explanation.

Edited Markdown content:"""


