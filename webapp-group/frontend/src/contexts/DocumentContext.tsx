// src/contexts/DocumentContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { UploadResponse } from '@/types';
import * as api from '@/lib/api';
import { toast } from "sonner";

type DocumentContextType = {
  documents: UploadResponse[];
  isLoading: boolean;
  uploadFiles: (files: File[]) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  fetchDocuments: () => Promise<void>;
};

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<UploadResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("無法載入文件列表。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 頁面載入時自動獲取文件列表
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFiles = async (files: File[]) => {
    setIsLoading(true);
    try {
      const uploadPromises = files.map(file => api.uploadDocument(file));
      const results = await Promise.all(uploadPromises);
      setDocuments(prevDocs => [...prevDocs, ...results]);
      toast.success(`${files.length} 個文件已成功上傳並索引。`);
    } catch (error) {
      console.error("Failed to upload files:", error);
      toast.error("文件上傳過程中發生錯誤。");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    setIsLoading(true);
    try {
      await api.deleteDocument(id);
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
      toast.success("文件已從您的知識庫中移除。");
    } catch (error) {
      console.error("Failed to delete document:", error);
       toast.error("無法刪除該文件。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DocumentContext.Provider value={{ documents, isLoading, uploadFiles, deleteDocument, fetchDocuments }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = (): DocumentContextType => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
