/** ISO 8601 date or datetime string as returned by the JSON API */
export type IsoDateString = string;

export interface Deputy {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  civility: string | null;
  dateOfBirth: IsoDateString | null;
  placeOfBirth: string | null;
  departmentId: string | null;
  circoNumber: number | null;
  circoLabel: string | null;
  photoUrl: string | null;
  profession: string | null;
}

export interface Scrutin {
  id: string;
  legislature: string;
  numero: number;
  dateScrutin: IsoDateString;
  titre: string;
  sortCode: "adopté" | "rejeté" | null;
  nombrePour: number | null;
  nombreContre: number | null;
  nombreAbstentions: number | null;
}

export type VotePosition = "pour" | "contre" | "abstention" | "nonVotant";

export interface DeputyStats {
  deputyId?: string;
  totalScrutins: number;
  votesCast: number;
  participationRate: number;
  loyaltyRate: number;
  votesAgainstGroup: number;
}
