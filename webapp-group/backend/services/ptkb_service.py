from typing import List, Optional, Dict
from services.gemini_client import call_gemini
from config.prompts import (
    SYSTEM_PROMPT_NEW_PTKB,
    format_new_ptkb_prompt,
    SYSTEM_PROMPT_RELEVANCE,
    format_relevance_prompt
)

async def extract_new_ptkb(
    context: str,
    utterance: str,
    current_ptkb_list: List[str]
) -> Optional[str]:
    """
    從使用者輸入提取新的 PTKB 事實
    
    Args:
        context: Conversation context string
        utterance: Current user utterance
        current_ptkb_list: List of existing PTKB facts
        
    Returns:
        New PTKB fact string or None if no new fact found
    """
    ptkb_str = "\n".join([f"- {p}" for p in current_ptkb_list]) if current_ptkb_list else "None"
    user_prompt = format_new_ptkb_prompt(
        context or "No history yet.",
        utterance,
        ptkb_str
    )
    
    try:
        response = await call_gemini(
            system_prompt=SYSTEM_PROMPT_NEW_PTKB,
            user_prompt=user_prompt,
            temperature=0.0,
            max_tokens=50
        )
        return parse_new_ptkb_response(response)
    except Exception as e:
        print(f"[ERROR] Failed to extract new PTKB: {e}")
        return None

def parse_new_ptkb_response(response_text: str) -> Optional[str]:
    """
    解析 GPT 回應以提取新的 PTKB
    
    Args:
        response_text: Raw response from Gemini
        
    Returns:
        Extracted PTKB fact or None
    """
    lower_response = response_text.lower()
    
    if "ptkb:" in lower_response:
        parts = response_text.split(":", 1)
        result = parts[1].strip() if len(parts) > 1 else ""
        
        if not result or result.lower() == "nope":
            return None
        
        return result
    
    print(f"[WARNING] GPT response did not follow expected format: {response_text}")
    return None

async def get_relevant_ptkbs(
    context: str,
    utterance: str,
    ptkb_list: List[str]
) -> List[str]:
    """
    判斷哪些 PTKB 與當前查詢相關
    
    Args:
        context: Conversation context string
        utterance: Current user utterance
        ptkb_list: List of all PTKB facts
        
    Returns:
        List of relevant PTKB facts
    """
    if not ptkb_list:
        return []
    
    ptkb_str = "\n".join([f"- {p}" for p in ptkb_list])
    user_prompt = format_relevance_prompt(
        context or "No history yet.",
        utterance,
        ptkb_str
    )
    
    try:
        response = await call_gemini(
            system_prompt=SYSTEM_PROMPT_RELEVANCE,
            user_prompt=user_prompt,
            temperature=0.0,
            max_tokens=200
        )
        return parse_relevance_response(response)
    except Exception as e:
        print(f"[ERROR] Failed to get relevant PTKBs: {e}")
        return []

def parse_relevance_response(response_text: str) -> List[str]:
    """
    解析相關性回應
    
    Args:
        response_text: Raw response from Gemini
        
    Returns:
        List of relevant PTKB facts
    """
    lower_response = response_text.lower()
    
    if "ptkb:" in lower_response:
        parts = response_text.split(":", 1)
        content = parts[1].strip() if len(parts) > 1 else ""
        
        if not content or content.lower() == "nope":
            return []
        
        # Split by newlines and filter out empty lines
        relevant_ptkbs = [
            line.strip() 
            for line in content.split("\n") 
            if line.strip()
        ]
        return relevant_ptkbs
    
    print(f"[WARNING] Relevance response did not follow format: {response_text}")
    return []

def build_conversation_context(history: List[Dict]) -> str:
    """
    建立對話上下文字串
    
    Args:
        history: List of message dicts with 'role' and 'content' keys
        
    Returns:
        Formatted conversation context string
    """
    if not history:
        return "No history yet."
    
    context_parts = []
    for msg in history:
        role = "USER" if msg["role"] == "user" else "SYSTEM"
        content = msg["content"]
        
        # 截斷助手回應至前 25 個字
        if msg["role"] == "assistant":
            words = content.split()[:25]
            content = " ".join(words) + " ..."
        
        context_parts.append(f"{role}: {content}")
    
    return "\n".join(context_parts)


