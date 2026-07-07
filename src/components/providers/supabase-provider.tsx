"use client";

import { initSupabaseConfig } from "@/lib/supabase/client";

interface SupabaseProviderProps {
  url: string;
  anonKey: string;
  children: React.ReactNode;
}

export function SupabaseProvider({ url, anonKey, children }: SupabaseProviderProps) {
  initSupabaseConfig(url, anonKey);
  return children;
}
