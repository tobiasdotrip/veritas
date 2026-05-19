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
  deputies: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    photoUrl: string | null;
  }[];
  totalCommonVotes: number;
  identicalVotes: number;
  concordanceRate: number;
  divergences: {
    scrutinId: string;
    numero: number;
    dateScrutin: string;
    titre: string;
    sortCode: "adopté" | "rejeté" | null;
    positions: {
      deputyId: string;
      firstName: string;
      lastName: string;
      slug: string;
      groupAbbreviation: string | null;
      position: VotePosition;
    }[];
  }[];
  pairwise: {
    deputyAId: string;
    deputyAName: string;
    deputyBId: string;
    deputyBName: string;
    concordanceRate: number;
    identicalVotes: number;
    totalCommon: number;
  }[];
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
