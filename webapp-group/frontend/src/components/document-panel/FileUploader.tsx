// src/components/document-panel/FileUploader.tsx
"use client";

import { useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { UploadCloud, FileText, FileType } from 'lucide-react';
import { useDocuments } from '@/contexts/DocumentContext';
import { cn } from '@/lib/utils';

const acceptedFiles: Accept = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
};

export function FileUploader() {
  const { uploadFiles, isLoading } = useDocuments();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        await uploadFiles(acceptedFiles);
      }
    },
    [uploadFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
    disabled: isLoading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        'border-gray-300 dark:border-gray-600',
        'hover:border-primary/50 dark:hover:border-primary/40',
        { 'bg-primary/10 border-primary': isDragActive },
        { 'cursor-not-allowed opacity-50': isLoading }
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <UploadCloud className="w-12 h-12 text-gray-500" />
        <p className="font-semibold">
          {isDragActive ? '將文件放置於此' : '拖放文件至此處，或點擊上傳'}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileType className="w-4 h-4" />
          <span>支援 PDF 和 TXT 檔案</span>
          <FileText className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
