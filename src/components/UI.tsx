import { useEffect } from "react";
import type { ReactNode } from "react";

export function PageMeta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} | Knowledge Lab`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [title, description]);
  return null;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow"><span />{children}</span>;
}
