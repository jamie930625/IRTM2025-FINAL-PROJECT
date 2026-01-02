// src/components/chat-panel/CitationBadge.tsx
type CitationBadgeProps = {
  id: number;
};

export function CitationBadge({ id }: CitationBadgeProps) {
  return (
    <button className="mx-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-primary/20 text-primary-foreground transition-colors hover:bg-primary/40">
      {id}
    </button>
  );
}
