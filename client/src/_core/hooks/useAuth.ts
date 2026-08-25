import { startLogin } from "@/const";
import { isSupabaseMode } from "@/lib/backendMode";
import { requireSupabaseClient } from "@/lib/supabaseClient";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type PortableAuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
};

function toPortableAuthUser(user: SupabaseUser): PortableAuthUser {
  const metadata = user.user_metadata ?? {};
  const name = [metadata.first_name, metadata.last_name]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ") || user.phone || "Membre";

  return {
    id: user.id,
    name,
    email: user.email ?? user.phone ?? "",
    phone: user.phone,
    role: metadata.role === "admin" ? "admin" : "user",
  };
}

function useSupabaseAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const [user, setUser] = useState<PortableAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: sessionError } = await requireSupabaseClient().auth.getSession();
      if (sessionError) throw sessionError;
      setUser(data.session?.user ? toPortableAuthUser(data.session.user) : null);
      setError(null);
    } catch (caught: unknown) {
      setUser(null);
      setError(caught instanceof Error ? caught : new Error("Session Supabase indisponible."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const { data: { subscription } } = requireSupabaseClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toPortableAuthUser(session.user) : null);
      setLoading(false);
      setError(null);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const logout = useCallback(async () => {
    setError(null);
    try {
      const { error: signOutError } = await requireSupabaseClient().auth.signOut();
      if (signOutError) throw signOutError;
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || user || typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;
    if (redirectPath) window.location.href = redirectPath;
    else startLogin();
  }, [loading, redirectOnUnauthenticated, redirectPath, user]);

  return {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    refresh,
    logout,
  };
}

function useLegacyAuth(options?: UseAuthOptions) {
  // L’accès au compte est déclenché uniquement au moment de la navigation afin
  // d’ouvrir l’écran interne /compte, jamais une page d’authentification externe.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (caught: unknown) {
      if (caught instanceof TRPCClientError && caught.data?.code === "UNAUTHORIZED") return;
      throw caught;
    } finally {
      try {
        sessionStorage.removeItem("manus-cookie");
      } catch {}
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem("manus-runtime-user-info", JSON.stringify(meQuery.data));
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || meQuery.isLoading || logoutMutation.isPending || state.user || typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;
    if (redirectPath) window.location.href = redirectPath;
    else startLogin();
  }, [redirectOnUnauthenticated, redirectPath, logoutMutation.isPending, meQuery.isLoading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}

export function useAuth(options?: UseAuthOptions) {
  // La variable VITE_BACKEND_MODE est figée à la compilation : le même chemin
  // de hooks reste donc stable pendant toute la durée de vie de l’application.
  return isSupabaseMode ? useSupabaseAuth(options) : useLegacyAuth(options);
}
