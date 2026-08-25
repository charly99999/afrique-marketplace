export type BackendMode = "legacy" | "supabase";

export function resolveBackendMode(value?: string): BackendMode {
  return value?.trim().toLowerCase() === "supabase" ? "supabase" : "legacy";
}

export const backendMode = resolveBackendMode(import.meta.env.VITE_BACKEND_MODE);
export const isSupabaseMode = backendMode === "supabase";
