import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DeputeSummary {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  photoUrl: string | null;
  groupAbbreviation: string | null;
}

export type Period = "7j" | "30j" | "6mois" | "legislature";
export type ViewMode = "synthese" | "detail" | "thematique";

interface ComparatorState {
  reference: DeputeSummary | null;
  compared: DeputeSummary[];
  period: Period;
  view: ViewMode;
  setReference: (d: DeputeSummary) => void;
  clearReference: () => void;
  addCompared: (d: DeputeSummary) => void;
  removeCompared: (slug: string) => void;
  setPeriod: (p: Period) => void;
  setView: (v: ViewMode) => void;
  clear: () => void;
}

export const useComparatorStore = create<ComparatorState>()(
  persist(
    (set, get) => ({
      reference: null,
      compared: [],
      period: "legislature",
      view: "synthese",
      setReference: (d) => set({ reference: d }),
      clearReference: () => set({ reference: null }),
      addCompared: (d) => {
        const current = get().compared;
        if (current.some((x) => x.slug === d.slug)) return;
        const total = current.length + (get().reference ? 1 : 0);
        if (total >= 5) return;
        set({ compared: [...current, d] });
      },
      removeCompared: (slug) =>
        set({ compared: get().compared.filter((d) => d.slug !== slug) }),
      setPeriod: (p) => set({ period: p }),
      setView: (v) => set({ view: v }),
      clear: () => set({ reference: null, compared: [] }),
    }),
    {
      name: "comparator-state",
      partialize: (state) => ({
        reference: state.reference,
        compared: state.compared,
        period: state.period,
        view: state.view,
      }),
    },
  ),
);
