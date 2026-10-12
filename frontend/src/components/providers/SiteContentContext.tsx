"use client";

import { createContext, useContext, type ReactNode } from "react";
import { mergeCopy, type ContentKey, type SiteContent } from "@/lib/siteContent";

const Context = createContext<SiteContent>({});
export function SiteContentProvider({ value, children }: { value: SiteContent; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSiteCopy<T>(section: ContentKey, defaults: T): T {
  const content = useContext(Context);
  return mergeCopy(defaults, content[section]);
}
