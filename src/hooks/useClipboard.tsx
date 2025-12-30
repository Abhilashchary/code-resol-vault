import { useState, useCallback, createContext, useContext, ReactNode } from "react";

interface ClipboardItem {
  type: "file" | "folder";
  id: string;
  name: string;
  data: any;
  operation: "copy" | "cut";
}

interface ClipboardContextType {
  clipboardItem: ClipboardItem | null;
  copy: (item: ClipboardItem) => void;
  cut: (item: ClipboardItem) => void;
  clear: () => void;
  hasItem: boolean;
}

const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);

export const ClipboardProvider = ({ children }: { children: ReactNode }) => {
  const [clipboardItem, setClipboardItem] = useState<ClipboardItem | null>(null);

  const copy = useCallback((item: Omit<ClipboardItem, "operation">) => {
    setClipboardItem({ ...item, operation: "copy" });
  }, []);

  const cut = useCallback((item: Omit<ClipboardItem, "operation">) => {
    setClipboardItem({ ...item, operation: "cut" });
  }, []);

  const clear = useCallback(() => {
    setClipboardItem(null);
  }, []);

  return (
    <ClipboardContext.Provider
      value={{
        clipboardItem,
        copy,
        cut,
        clear,
        hasItem: clipboardItem !== null,
      }}
    >
      {children}
    </ClipboardContext.Provider>
  );
};

export const useClipboard = () => {
  const context = useContext(ClipboardContext);
  if (context === undefined) {
    throw new Error("useClipboard must be used within a ClipboardProvider");
  }
  return context;
};
