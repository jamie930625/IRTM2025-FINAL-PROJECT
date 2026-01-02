// src/components/chat-panel/ChatHistory.tsx
"use client";

import { useEffect, useRef } from 'react';
import { useSimpleChat } from '@/contexts/SimpleChatContext';
import { MessageBubble } from './MessageBubble';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot } from 'lucide-react';

export function ChatHistory() {
  const { messages, isLoading } = useSimpleChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
          <Bot className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-semibold">開始對話</h3>
          <p className="text-sm">上傳文件後，開始提問吧！</p>
        </div>
      ) : (
        messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
      )}
      {isLoading && (
         <div className="flex items-start gap-4">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
      )}
    </div>
  );
}
