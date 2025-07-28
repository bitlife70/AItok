import { useEffect, useRef, useCallback } from 'react';

export function useScrollToBottom<T extends HTMLElement = HTMLDivElement>(deps: any[] = []) {
  const ref = useRef<T>(null);

  const scrollToBottom = useCallback(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, deps);

  return { ref, scrollToBottom };
}