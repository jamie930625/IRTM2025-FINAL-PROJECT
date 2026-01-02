// src/components/document-panel/DocumentPanel.tsx
import { FileUploader } from "./FileUploader";
import { FileList } from "./FileList";
import { Separator } from "@/components/ui/separator";

export function DocumentPanel() {
  return (
    <div className="p-4 h-full flex flex-col gap-4 bg-muted/20">
      <FileUploader />
      <Separator />
      <div className="flex-1 overflow-y-auto">
        <FileList />
      </div>
    </div>
  );
}
