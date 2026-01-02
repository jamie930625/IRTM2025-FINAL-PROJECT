// src/contexts/ExplainContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { Passage } from '@/types';

type ExplainabilityData = {
  rewritten_query: string;
  retrieved_passages: Passage[];
} | null;

type ExplainContextType = {
  explainData: ExplainabilityData;
  setExplainData: (data: ExplainabilityData) => void;
};

const ExplainContext = createContext<ExplainContextType | undefined>(undefined);

export const ExplainProvider = ({ children }: { children: ReactNode }) => {
  const [explainData, setExplainData] = useState<ExplainabilityData>(null);

  return (
    <ExplainContext.Provider value={{ explainData, setExplainData }}>
      {children}
    </ExplainContext.Provider>
  );
};

export const useExplain = (): ExplainContextType => {
  const context = useContext(ExplainContext);
  if (!context) {
    throw new Error('useExplain must be used within an ExplainProvider');
  }
  return context;
};
