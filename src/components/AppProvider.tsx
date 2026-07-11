"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LogoMark from "@/components/Logo";
import type { Category, Household, Profile } from "@/lib/types";

type AppData = {
  userId: string;
  profile: Profile;
  household: Household;
  members: Profile[];
  partner: Profile | null;
  categories: Category[];
  reload: () => Promise<void>;
};

const Ctx = createContext<AppData | null>(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}

export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [data, setData] = useState<Omit<AppData, "reload"> | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (!profile?.household_id) {
      router.replace("/onboarding");
      return;
    }

    const [householdRes, membersRes, categoriesRes] = await Promise.all([
      supabase
        .from("households")
        .select("*")
        .eq("id", profile.household_id)
        .single<Household>(),
      supabase
        .from("profiles")
        .select("*")
        .eq("household_id", profile.household_id),
      supabase
        .from("categories")
        .select("*")
        .eq("household_id", profile.household_id)
        .order("name"),
    ]);

    if (!householdRes.data) return;

    const members = (membersRes.data ?? []) as Profile[];
    setData({
      userId: user.id,
      profile,
      household: householdRes.data,
      members,
      partner: members.find((m) => m.id !== user.id) ?? null,
      categories: (categoriesRes.data ?? []) as Category[],
    });
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center animate-pulse">
            <LogoMark size={48} />
          </div>
          <p className="text-slate-400 text-sm mt-3">Cargando...</p>
        </div>
      </main>
    );
  }

  return <Ctx.Provider value={{ ...data, reload: load }}>{children}</Ctx.Provider>;
}
