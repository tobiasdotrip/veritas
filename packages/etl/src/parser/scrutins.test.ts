import { describe, expect, it } from "vitest";
import { parseScrutin, type RawScrutin } from "./scrutins.js";

describe("parseScrutin", () => {
  it("extracts causePositionVote from non-voting deputies", () => {
    const raw: RawScrutin = {
      uid: "VTANR5L17V999",
      numero: "999",
      legislature: "17",
      dateScrutin: "2024-07-18",
      titre: "Test scrutin",
      ventilationVotes: {
        organe: {
          groupes: {
            groupe: {
              organeRef: "PO800000",
              vote: {
                decompteNominatif: {
                  nonVotants: {
                    votant: {
                      acteurRef: "PA789",
                      mandatRef: "PM012",
                      causePositionVote: "absence",
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const parsed = parseScrutin({ scrutin: raw });
    expect(parsed.votes).toHaveLength(1);
    expect(parsed.votes[0]).toMatchObject({
      deputyId: "PA789",
      mandateId: "PM012",
      position: "nonVotant",
      causePositionVote: "absence",
    });
  });

  it("does not set causePositionVote for active voters", () => {
    const raw: RawScrutin = {
      uid: "VTANR5L17V998",
      numero: "998",
      legislature: "17",
      dateScrutin: "2024-07-18",
      titre: "Vote actif",
      ventilationVotes: {
        organe: {
          groupes: {
            groupe: {
              organeRef: "PO800000",
              vote: {
                decompteNominatif: {
                  pours: {
                    votant: {
                      acteurRef: "PA123",
                      mandatRef: "PM456",
                      parDelegation: "false",
                      causePositionVote: "absence",
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const parsed = parseScrutin({ scrutin: raw });
    expect(parsed.votes[0]?.causePositionVote).toBeUndefined();
  });
});
