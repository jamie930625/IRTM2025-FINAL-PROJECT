import os
import time
import re
from google import generativeai as genai
from dotenv import load_dotenv

load_dotenv()

MAX_RETRY = 3

# 初始化 Gemini client
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("[WARNING] GEMINI_API_KEY is not set. Gemini client will not function properly.")
else:
    genai.configure(api_key=api_key)

def is_quota_error(error: Exception) -> bool:
    """檢查是否為配額限制錯誤 (429)"""
    error_str = str(error).lower()
    return "429" in error_str or "quota" in error_str or "rate limit" in error_str

def extract_retry_delay(error: Exception) -> float:
    """從錯誤訊息中提取建議的重試延遲時間（秒）"""
    error_str = str(error)
    
    # 嘗試匹配 "retry in Xs" 或 "retry_delay { seconds: X }"
    patterns = [
        r"retry in ([\d.]+)s",  # "retry in 54.79s"
        r"retry_delay.*?seconds[:\s]+(\d+)",  # "retry_delay { seconds: 54 }"
        r"seconds[:\s]+(\d+)",  # 更通用的匹配
    ]
    
    for pattern in patterns:
        match = re.search(pattern, error_str, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                continue
    
    # 如果找不到，返回 None（表示使用默認退避）
    return None

async def call_gemini(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.0,
    max_tokens: int = 500,
    model: str = "gemini-2.5-flash"
) -> str:
    """
    呼叫 Gemini API 並包含重試機制
    
    Args:
        system_prompt: System instruction
        user_prompt: User message
        temperature: Sampling temperature (0.0-1.0)
        max_tokens: Maximum output tokens
        model: Gemini model name
        
    Returns:
        Generated text response
        
    Raises:
        Exception: If all retry attempts fail
    """
    if not api_key:
        raise Exception("GEMINI_API_KEY is not configured")
    
    # Combine system prompt and user prompt
    # Gemini doesn't have a separate system role, so we prepend it to the user message
    combined_prompt = f"{system_prompt}\n\n{user_prompt}"
    
    last_error = None

    # [修正] 定義安全設定為 BLOCK_NONE，在模型初始化時設定
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]
    
    for attempt in range(MAX_RETRY):
        try:
            # [修正] 在 GenerativeModel 初始化時設定安全設定
            model_instance = genai.GenerativeModel(
                model_name=model,
                safety_settings=safety_settings,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                }
            )
            
            response = model_instance.generate_content(combined_prompt)
            
            # [修正] 正確檢查響應
            if not response.candidates:
                raise ValueError("Response was blocked: no candidates returned")
            
            # 檢查 finish_reason（如果可用）
            candidate = response.candidates[0]
            if hasattr(candidate, 'finish_reason'):
                finish_reason = candidate.finish_reason
                # finish_reason 可能是數字（1=STOP, 2=MAX_TOKENS, 3=SAFETY, 4=RECITATION）
                # 或字符串（"SAFETY", "RECITATION" 等）
                if finish_reason == 3 or (isinstance(finish_reason, str) and "SAFETY" in finish_reason.upper()):
                    raise ValueError("Response was blocked by safety filters.")
                elif finish_reason == 4 or (isinstance(finish_reason, str) and "RECITATION" in finish_reason.upper()):
                    raise ValueError("Response was blocked due to recitation.")
            
            # 嘗試讀取內容
            try:
                content = response.text.strip()
            except (ValueError, AttributeError) as e:
                # 檢查是否為安全過濾器錯誤
                error_str = str(e).lower()
                if any(keyword in error_str for keyword in ["safety", "blocked", "filter", "finish_reason"]):
                    raise ValueError("Response was blocked by safety filters.")
                raise
            
            if not content:
                raise ValueError("Empty response from Gemini API")
            
            return content
            
        except ValueError as e:
            error_str = str(e).lower()
            
            # [新增] 如果是安全過濾器錯誤，不重試（因為相同的輸入會再次被阻擋）
            if "safety" in error_str or "blocked" in error_str or "filter" in error_str:
                last_error = e
                print(f"[ERROR] Response blocked by safety filters (attempt {attempt + 1}/{MAX_RETRY}): {e}")
                print(f"[INFO] Input content likely triggered safety filters. Review your prompts.")
                raise Exception(
                    f"Response was blocked by safety filters. "
                    f"This usually means the input content triggered Gemini's safety filters. "
                    f"Please review your system prompt and user prompt. "
                    f"Original error: {str(e)}"
                )
            
            last_error = e
            print(f"[ERROR] Gemini API call failed (attempt {attempt + 1}/{MAX_RETRY}): {e}")
            
            if attempt < MAX_RETRY - 1:
                wait_time = (2 ** attempt)
                print(f"[INFO] Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                
        except Exception as e:
            last_error = e
            error_str = str(e)
            print(f"[ERROR] Gemini API call failed (attempt {attempt + 1}/{MAX_RETRY}): {error_str}")
            
            # [新增] 檢查是否為配額限制錯誤
            if is_quota_error(e):
                retry_delay = extract_retry_delay(e)
                
                if retry_delay is not None:
                    # 使用 API 建議的延遲時間
                    print(f"[INFO] Quota limit reached. Waiting {retry_delay:.1f} seconds before retry...")
                    if attempt < MAX_RETRY - 1:
                        time.sleep(retry_delay)
                else:
                    # 如果無法提取延遲時間，使用較長的固定等待時間（60秒）
                    print(f"[INFO] Quota limit reached. Waiting 60 seconds before retry...")
                    if attempt < MAX_RETRY - 1:
                        time.sleep(60)
                
                # 如果是配額錯誤且已經是最後一次嘗試，直接拋出更明確的錯誤
                if attempt == MAX_RETRY - 1:
                    raise Exception(
                        f"Gemini API quota exceeded. "
                        f"Free tier limit: 20 requests per day per model. "
                        f"Please wait or upgrade your plan. "
                        f"Original error: {error_str}"
                    )
            else:
                # 非配額錯誤，使用指數退避
                if attempt < MAX_RETRY - 1:
                    wait_time = (2 ** attempt)
                    print(f"[INFO] Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
    
    # If all retries failed, raise the last error
    raise Exception(f"Gemini API call failed after {MAX_RETRY} attempts: {str(last_error)}")

