import { useState, useCallback, useRef, createContext, useContext } from 'react';

export const useUndoToast = () => {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const show = useCallback((message, onUndo) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, onUndo, id: Date.now() });
    timeoutRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  const undo = useCallback(() => {
    if (toast?.onUndo) toast.onUndo();
    dismiss();
  }, [toast, dismiss]);

  return { toast, show, dismiss, undo };
};

export const ToastContext = createContext({
  show: () => {},
  dismiss: () => {},
  deleteTxWithUndo: () => {},
});

export const useToast = () => useContext(ToastContext);
