// src/components/layout/Header.tsx
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="border-b w-full">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <h1 className="text-lg font-bold">RAGify - 與您的文件對話</h1>
        <ThemeToggle />
      </div>
    </header>
  );
}
