// src/components/chat-panel/ChatPanel.tsx
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';

export function ChatPanel() {
  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHistory />
      <ChatInput />
    </div>
  );
}
