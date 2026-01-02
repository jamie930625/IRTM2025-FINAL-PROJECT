// src/lib/intent-classifier.ts
// Intent classification for routing messages to chat or notebook editing

import { MessageIntent, IntentClassification } from '@/types';

/**
 * Keywords that indicate notebook editing intent
 */
const NOTE_EDIT_KEYWORDS = [
  // Chinese
  '筆記', '改筆記', '修改筆記', '編輯筆記', '更新筆記',
  '改成', '改為', '重寫', '改寫', '修改', '編輯',
  '加入', '刪除', '移除', '插入', '添加',
  '精簡', '擴展', '縮短', '延長',
  '翻譯', '轉換', '格式化',
  '條列', '條列式', '列點', '項目符號',
  '摘要', '總結', '概括',
  '選取', '選擇的', '選中的', '這段', '那段',
  // English
  'notebook', 'note', 'notes',
  'rewrite', 'rephrase', 'revise', 'edit', 'modify', 'update',
  'summarize', 'expand', 'shorten', 'condense',
  'translate', 'convert', 'format',
  'bullet', 'bullets', 'list',
  'selected', 'selection', 'this part', 'that part',
  'add to note', 'remove from note', 'insert into note',
];

/**
 * Keywords that indicate querying about the note (not editing)
 */
const NOTE_QUERY_KEYWORDS = [
  // Chinese
  '筆記裡有什麼', '筆記內容', '筆記說什麼', '筆記提到',
  '查看筆記', '讀筆記', '看筆記',
  // English
  'what does the note say', 'what is in the note', 'read the note',
  'show note', 'display note',
];

/**
 * Patterns that strongly indicate note editing
 */
const STRONG_NOTE_EDIT_PATTERNS = [
  /把.*(筆記|選取|這段|那段).*改/i,
  /幫我.*(改|修改|編輯|重寫).*(筆記|選取)/i,
  /(改|修改|編輯|重寫|更新).*(筆記|選取的|選中的)/i,
  /筆記.*(加入|添加|刪除|移除)/i,
  /將.*(改成|改為|轉換|翻譯)/i,
  /(rewrite|edit|modify|update).*(note|notebook|selection)/i,
  /(note|notebook).*(rewrite|edit|modify|update)/i,
  /make.*(note|selection).*(shorter|longer|concise|bullet)/i,
  /turn.*(into|to).*(bullet|list|summary)/i,
  /translate.*(to|into)/i,
];

/**
 * Rule-based intent classifier
 * Returns the classified intent with confidence score
 */
export function classifyIntent(
  userMessage: string,
  hasNotebookContent: boolean,
  hasSelection: boolean
): IntentClassification {
  const messageLower = userMessage.toLowerCase();
  
  // Check for strong note edit patterns first
  for (const pattern of STRONG_NOTE_EDIT_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        intent: 'NOTE_EDIT',
        confidence: 0.95,
      };
    }
  }
  
  // Count keyword matches
  let noteEditScore = 0;
  let noteQueryScore = 0;
  
  for (const keyword of NOTE_EDIT_KEYWORDS) {
    if (messageLower.includes(keyword.toLowerCase())) {
      noteEditScore += 1;
    }
  }
  
  for (const keyword of NOTE_QUERY_KEYWORDS) {
    if (messageLower.includes(keyword.toLowerCase())) {
      noteQueryScore += 1;
    }
  }
  
  // If user mentions selection-related words and has selection, boost note edit score
  if (hasSelection) {
    const selectionKeywords = ['選取', '選擇', '選中', 'selected', 'selection', '這段', '那段'];
    for (const keyword of selectionKeywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        noteEditScore += 2;
      }
    }
  }
  
  // Determine intent based on scores
  if (noteEditScore >= 2 && hasNotebookContent) {
    return {
      intent: 'NOTE_EDIT',
      confidence: Math.min(0.7 + noteEditScore * 0.1, 0.95),
    };
  }
  
  if (noteQueryScore >= 1 && hasNotebookContent) {
    return {
      intent: 'NOTE_QUERY',
      confidence: Math.min(0.6 + noteQueryScore * 0.1, 0.9),
    };
  }
  
  // Ambiguous case: mentions notebook keywords but unclear intent
  if (noteEditScore === 1 && hasNotebookContent) {
    return {
      intent: 'CLARIFY',
      confidence: 0.5,
      clarificationQuestion: '您是想要修改筆記內容，還是只是想討論它呢？',
    };
  }
  
  // Default to chat QA
  return {
    intent: 'CHAT_QA',
    confidence: 0.8,
  };
}

/**
 * Check if the message is likely a clarification response
 * Returns 'NOTE_EDIT' or 'CHAT_QA' or null if not a clarification
 */
export function parseUserClarification(userMessage: string): MessageIntent | null {
  const messageLower = userMessage.toLowerCase();
  
  // Check for affirmative responses for note editing
  const editAffirmatives = [
    '是', '對', '改筆記', '修改', '編輯', '更新筆記',
    'yes', 'yeah', 'edit', 'modify', 'update note',
  ];
  
  // Check for negative responses (just discuss)
  const discussNegatives = [
    '不', '只是討論', '只想問', '不用改', '不修改',
    'no', 'just discuss', 'just asking', 'don\'t edit',
  ];
  
  for (const word of editAffirmatives) {
    if (messageLower.includes(word)) {
      return 'NOTE_EDIT';
    }
  }
  
  for (const word of discussNegatives) {
    if (messageLower.includes(word)) {
      return 'CHAT_QA';
    }
  }
  
  return null;
}

/**
 * Extract the actual instruction from a note edit message
 * Removes meta phrases like "幫我把筆記" etc.
 */
export function extractEditInstruction(userMessage: string): string {
  let instruction = userMessage;
  
  // Remove common prefixes
  const prefixPatterns = [
    /^(請|幫我|麻煩|可以)?/,
    /把(筆記|選取的|選中的|這段|那段)(文字|內容)?/,
    /將(筆記|選取的|選中的|這段|那段)(文字|內容)?/,
  ];
  
  for (const pattern of prefixPatterns) {
    instruction = instruction.replace(pattern, '');
  }
  
  return instruction.trim() || userMessage;
}

