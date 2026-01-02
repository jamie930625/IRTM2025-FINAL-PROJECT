"use client";

import { useDocuments } from "@/contexts/DocumentContext";
import { useSimpleChat } from "@/contexts/SimpleChatContext"; 
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, FileType, Trash2 } from "lucide-react";

export function FileList() {
  const { documents, deleteDocument, isLoading } = useDocuments();
  const { selectedFileIds, setSelectedFileIds } = useSimpleChat();

  const handleToggle = (docId: string) => {
    if (selectedFileIds.includes(docId)) {
      setSelectedFileIds(selectedFileIds.filter(id => id !== docId));
    } else {
      setSelectedFileIds([...selectedFileIds, docId]);
    }
  };

  if (isLoading && documents.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">已索引文件</p>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">已索引文件</h3>
      {documents.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground py-4">
          尚未上傳任何文件
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => {
            const isSelected = selectedFileIds.includes(doc.id);
            return (
              <li
                key={doc.id}
                className={`flex items-center justify-between p-2 rounded-md transition-all ${
                  isSelected 
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-sm' 
                    : 'bg-muted/50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 truncate flex-1 cursor-pointer" onClick={() => handleToggle(doc.id)}>
                  {/* 使用原生 HTML Checkbox 避免 Module Not Found */}
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(doc.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()} // 防止觸發兩次 toggle
                  />
                  
                  {doc.file_type === 'pdf' ? (
                    <FileType className="w-5 h-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate select-none" title={doc.filename}>
                    {doc.filename}
                  </span>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 hover:text-red-500 hover:bg-red-100/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDocument(doc.id);
                  }}
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
