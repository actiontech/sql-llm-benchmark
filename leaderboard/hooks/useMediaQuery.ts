import { useState, useEffect } from 'react';

/**
 * 监听媒体查询是否匹配（如断点），用于响应式逻辑。
 * 服务端渲染时返回 false，避免水合不一致。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const listener = () => setMatches(m.matches);
    m.addEventListener('change', listener);
    return () => m.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
