// src/components/chat-panel/MessageBubble.tsx
// Updated: Added LaTeX math formula rendering support
"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';
import { CitationBadge } from './CitationBadge';
import { CitationList } from './CitationList';
// KaTeX CSS for math formula rendering
import 'katex/dist/katex.min.css';

type MessageBubbleProps = {
  message: Message;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const preprocessContent = (content: string) => {
    return content.replace(/\[(\d+)\]/g, '[$&](#citation-$1)');
  };

  return (
    <div
      className={cn('flex items-start gap-4', {
        'justify-end': isUser,
      })}
    >
      {!isUser && (
        <Avatar className="w-8 h-8 border">
          <AvatarFallback>
            <Bot className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn('max-w-[75%] rounded-lg px-4 py-3', {
          'bg-primary text-primary-foreground': isUser,
          'bg-muted': !isUser,
        })}
      >
        <div className="prose prose-sm dark:prose-invert max-w-full break-words">
            {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        a: ({ href, children, ...props }) => {
                            const match = href?.match(/#citation-(\d+)/);
                            if (match) {
                                const id = parseInt(match[1], 10);
                                return <CitationBadge id={id} />;
                            }
                            return <a href={href} {...props}>{children}</a>;
                        }
                    }}
                >
                    {preprocessContent(message.content)}
                </ReactMarkdown>
            )}
        </div>
        {!isUser && message.citations && (
          <CitationList citations={message.citations} />
        )}
      </div>

      {isUser && (
        <Avatar className="w-8 h-8 border">
          <AvatarFallback>
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
