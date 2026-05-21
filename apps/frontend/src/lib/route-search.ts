/** Types search TanStack Router (objets complets requis par le routeur 1.170+). */

export type RechercheSearch = {
  q: string | undefined;
  type: "depute" | "scrutin" | "all";
  theme: string | undefined;
};

export const defaultRechercheSearch: RechercheSearch = {
  q: undefined,
  type: "all",
  theme: undefined,
};

export type DeputeSearch = {
  from: string | undefined;
  to: string | undefined;
  type: string | undefined;
  theme: string | undefined;
  position: string | undefined;
};

export const defaultDeputeSearch: DeputeSearch = {
  from: undefined,
  to: undefined,
  type: undefined,
  theme: undefined,
  position: undefined,
};
