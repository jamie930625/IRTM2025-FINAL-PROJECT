// src/components/notebook-panel/MarkdownEditor.tsx
"use client";

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Eye, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/components/notebook-panel/notebook-markdown.css';

type MarkdownEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
};

export function MarkdownEditor({ content, onChange, placeholder = "開始撰寫您的筆記..." }: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar - Fixed at top (flex: 0 0 auto) */}
      <div className="flex items-center justify-between px-2 py-1 border-b flex-shrink-0">
        <div className="text-xs font-medium text-muted-foreground">筆記編輯器</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPreview(!isPreview)}
          className="h-6 text-xs"
        >
          {isPreview ? (
            <>
              <Edit2 className="w-4 h-4 mr-2" />
              編輯模式
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              預覽模式
            </>
          )}
        </Button>
      </div>

      {/* Content Area - Scrollable (flex: 1 1 auto; min-height: 0; overflow-y: auto) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isPreview ? (
          <div className="p-4 notebook-markdown">
            {content ? (
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 className="notebook-h1" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="notebook-h2" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="notebook-h3" {...props} />,
                  h4: ({ node, ...props }) => <h4 className="notebook-h4" {...props} />,
                  h5: ({ node, ...props }) => <h5 className="notebook-h5" {...props} />,
                  h6: ({ node, ...props }) => <h6 className="notebook-h6" {...props} />,
                  p: ({ node, ...props }) => <p className="notebook-p" {...props} />,
                  ul: ({ node, ...props }) => <ul className="notebook-ul" {...props} />,
                  ol: ({ node, ...props }) => <ol className="notebook-ol" {...props} />,
                  li: ({ node, ...props }) => <li className="notebook-li" {...props} />,
                  code: ({ node, inline, ...props }: any) => {
                    if (inline) {
                      return <code className="notebook-code-inline" {...props} />;
                    }
                    return <code className="notebook-code-block" {...props} />;
                  },
                  pre: ({ node, ...props }) => <pre className="notebook-pre" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="notebook-blockquote" {...props} />,
                  a: ({ node, ...props }) => <a className="notebook-a" {...props} />,
                  table: ({ node, ...props }) => <table className="notebook-table" {...props} />,
                  thead: ({ node, ...props }) => <thead className="notebook-thead" {...props} />,
                  tbody: ({ node, ...props }) => <tbody className="notebook-tbody" {...props} />,
                  tr: ({ node, ...props }) => <tr className="notebook-tr" {...props} />,
                  th: ({ node, ...props }) => <th className="notebook-th" {...props} />,
                  td: ({ node, ...props }) => <td className="notebook-td" {...props} />,
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">{placeholder}</p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "w-full resize-none border-0 rounded-none font-mono text-sm p-4",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "bg-transparent outline-none"
            )}
            style={{ 
              height: '100%',
              minHeight: '100%',
              overflowY: 'auto',
              display: 'block',
              boxSizing: 'border-box'
            }}
          />
        )}
      </div>
    </div>
  );
}

