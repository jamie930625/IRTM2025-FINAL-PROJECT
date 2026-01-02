import os
from typing import List, Dict
from services.gemini_client import call_gemini
from config.prompts import (
    SYSTEM_PROMPT_NOTEBOOK_GENERATION,
    format_notebook_generation_prompt,
    SYSTEM_PROMPT_NOTEBOOK_EDIT,
    format_notebook_edit_prompt
)

async def generate_notebook_from_chat(conversation_history: List[Dict[str, str]]) -> str:
    """
    Generate a structured Markdown notebook from conversation history.
    
    Args:
        conversation_history: List of messages with 'role' and 'content'
        
    Returns:
        Generated Markdown notebook content
    """
    if not conversation_history:
        return "# 筆記\n\n尚無對話內容。\n"
    
    try:
        user_prompt = format_notebook_generation_prompt(conversation_history)
        
        response = await call_gemini(
            system_prompt=SYSTEM_PROMPT_NOTEBOOK_GENERATION,
            user_prompt=user_prompt,
            temperature=0.5,
            max_tokens=2000
        )
        
        # Clean up response (remove any prefix if present)
        notebook_content = response.strip()
        
        # Ensure it starts with a heading if it doesn't
        if not notebook_content.startswith('#'):
            notebook_content = "# 筆記\n\n" + notebook_content
        
        return notebook_content
        
    except Exception as e:
        print(f"[ERROR] Failed to generate notebook: {e}")
        # Return a basic structure on error
        return f"# 筆記\n\n生成筆記時發生錯誤：{str(e)}\n"

async def edit_notebook_with_llm(notebook_content: str, user_instruction: str) -> str:
    """
    Edit notebook content based on user instruction using LLM.
    
    Args:
        notebook_content: Current notebook Markdown content
        user_instruction: User's instruction for editing
        
    Returns:
        Edited Markdown notebook content
    """
    if not user_instruction.strip():
        return notebook_content
    
    try:
        user_prompt = format_notebook_edit_prompt(notebook_content, user_instruction)
        
        response = await call_gemini(
            system_prompt=SYSTEM_PROMPT_NOTEBOOK_EDIT,
            user_prompt=user_prompt,
            temperature=0.5,
            max_tokens=2000
        )
        
        # Clean up response
        edited_content = response.strip()
        
        # Remove any potential prefix or wrapper text
        # Check if response starts with markdown code block
        if edited_content.startswith('```'):
            # Extract content from code block
            lines = edited_content.split('\n')
            if len(lines) > 1:
                # Skip first line (```markdown or ```) and last line (```)
                edited_content = '\n'.join(lines[1:-1]).strip()
        
        # Remove common prefixes that LLM might add
        prefixes_to_remove = [
            'edited content:',
            'edited notebook:',
            'here is the edited content:',
            '以下是編輯後的內容：',
            '編輯後的筆記：',
        ]
        for prefix in prefixes_to_remove:
            if edited_content.lower().startswith(prefix.lower()):
                edited_content = edited_content[len(prefix):].strip()
        
        # Validate that we got meaningful content
        if not edited_content or len(edited_content) < 10:
            print(f"[WARNING] Edited content seems too short or empty. Returning original content.")
            return notebook_content
        
        # If edited content is significantly shorter than original, it might be incomplete
        if len(edited_content) < len(notebook_content) * 0.5:
            print(f"[WARNING] Edited content is much shorter than original. Might be incomplete.")
            # Still return it, but log a warning
        
        print(f"[INFO] Notebook edit successful. Original length: {len(notebook_content)}, Edited length: {len(edited_content)}")
        return edited_content
        
    except Exception as e:
        print(f"[ERROR] Failed to edit notebook: {e}")
        # Return original content on error
        return notebook_content

