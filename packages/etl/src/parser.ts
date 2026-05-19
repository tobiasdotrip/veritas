export interface ParsedScrutin {
  id: string;
  legislature: string;
  numero: number;
  dateScrutin: Date;
  titre: string;
  sortCode?: "adopté" | "rejeté";
  votes: ParsedVote[];
}

export interface ParsedVote {
  deputyId: string;
  mandateId: string;
  position: "pour" | "contre" | "abstention" | "nonVotant";
  parDelegation: boolean;
}

export async function* parseScrutinsJson(
  jsonStream: AsyncIterable<string>
): AsyncGenerator<ParsedScrutin> {
  // TODO: Implémenter le parsing streaming des scrutins AN
  yield {
    id: "VTANR5L17V1",
    legislature: "17",
    numero: 1,
    dateScrutin: new Date("2024-07-18"),
    titre: "Motion de confiance",
    sortCode: "adopté",
    votes: [],
  };
}
