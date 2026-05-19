import type {
  Deputy,
  Scrutin,
  VotePosition,
  DeputyStats,
} from "@veritas/shared";

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface DeputeProfile extends Deputy {
  groupName: string | null;
  groupAbbreviation: string | null;
  mandateStart: Date | null;
  mandateEnd: Date | null;
  stats: DeputyStats | null;
}

export interface DeputeVoteItem {
  scrutinId: string;
  numero: number;
  dateScrutin: Date;
  titre: string;
  codeTypeVote: string | null;
  sortCode: "adopté" | "rejeté" | null;
  position: VotePosition;
  parDelegation: boolean;
  groupPosition: string | null;
  alignment: "aligned" | "opposed" | "neutral";
}

export interface ScrutinDetail extends Scrutin {
  libelleTypeVote: string | null;
  nombreNonVotants: number | null;
  themes: { slug: string; label: string }[];
}

export interface ScrutinGroupVote {
  groupId: string;
  groupName: string;
  groupAbbreviation: string | null;
  positionMajoritaire: string | null;
  nombreMembresGroupe: number | null;
  nombrePour: number | null;
  nombreContre: number | null;
  nombreAbstentions: number | null;
  nombreNonVotants: number | null;
}

export interface ScrutinIndividualVote {
  deputyId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  position: VotePosition;
  parDelegation: boolean;
  causePositionVote: string | null;
  groupAbbreviation: string | null;
}

export interface ComparisonResult {
  reference: { slug: string; firstName: string; lastName: string };
  compared: {
    slug: string;
    firstName: string;
    lastName: string;
    score: number;
    votesCommuns: number;
    votesIdentiques: number;
  }[];
  details: {
    scrutinId: string;
    titre: string;
    date: string;
    positions: Record<string, VotePosition>;
    resultatGlobal: "adopté" | "rejeté" | null;
  }[];
  warning?: string;
}

export interface SearchResultDepute {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  photoUrl: string | null;
  circoLabel: string | null;
  departmentId: string | null;
  groupAbbreviation: string | null;
}

export interface SearchResultScrutin {
  id: string;
  numero: number;
  dateScrutin: Date;
  titre: string;
  sortCode: "adopté" | "rejeté" | null;
  nombrePour: number | null;
  nombreContre: number | null;
  nombreAbstentions: number | null;
}

export interface ThemeItem {
  slug: string;
  label: string;
  description: string | null;
}
