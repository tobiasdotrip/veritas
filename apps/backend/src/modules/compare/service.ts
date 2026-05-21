import type { CompareRepository } from "./repository.js";
import type { CacheService } from "../common/cache.js";
import { ValidationError } from "../common/errors.js";

const CACHE_NS = "compare";
const DEFAULT_TTL = 300;

export interface CompareResult {
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
      position: "pour" | "contre" | "abstention" | "nonVotant";
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

export function createCompareService(
  repo: CompareRepository,
  cache: CacheService,
) {
  return {
    async compareDeputies(
      deputyIds: string[],
      legislature: string,
      from?: string,
      to?: string,
    ): Promise<CompareResult> {
      if (deputyIds.length < 2 || deputyIds.length > 5) {
        throw new ValidationError(
          "Le comparateur nécessite entre 2 et 5 députés",
        );
      }

      const cacheKey = `compare:${deputyIds.sort().join(",")}:${legislature}:${from ?? ""}:${to ?? ""}`;

      return cache.getOrSet(CACHE_NS, cacheKey, DEFAULT_TTL, async () => {
        const [voteRows, briefs] = await Promise.all([
          repo.getCommonVotes(deputyIds, legislature, from, to),
          repo.getDeputiesBrief(deputyIds),
        ]);

        // Group votes by scrutin
        const scrutinMap = new Map<
          string,
          {
            numero: number;
            dateScrutin: Date;
            titre: string;
            sortCode: "adopté" | "rejeté" | null;
            positions: Map<
              string,
              {
                firstName: string;
                lastName: string;
                slug: string;
                groupAbbreviation: string | null;
                position: "pour" | "contre" | "abstention" | "nonVotant";
              }
            >;
          }
        >();

        for (const row of voteRows) {
          if (!scrutinMap.has(row.scrutinId)) {
            scrutinMap.set(row.scrutinId, {
              numero: row.numero,
              dateScrutin: row.dateScrutin,
              titre: row.titre,
              sortCode: row.sortCode,
              positions: new Map(),
            });
          }
          const s = scrutinMap.get(row.scrutinId)!;
          s.positions.set(row.deputyId, {
            firstName: row.deputyFirstName,
            lastName: row.deputyLastName,
            slug: row.deputySlug,
            groupAbbreviation: row.groupAbbreviation,
            position: row.position,
          });
        }

        const totalCommonVotes = scrutinMap.size;
        let identicalVotes = 0;
        const divergences: CompareResult["divergences"] = [];

        for (const [scrutinId, scrutin] of scrutinMap) {
          const positions = Array.from(scrutin.positions.values());
          const allSame = positions.every(
            (p) => p.position === positions[0]!.position,
          );

          if (allSame) {
            identicalVotes++;
          } else {
            divergences.push({
              scrutinId,
              numero: scrutin.numero,
              dateScrutin: scrutin.dateScrutin.toISOString(),
              titre: scrutin.titre,
              sortCode: scrutin.sortCode,
              positions: Array.from(scrutin.positions.entries()).map(
                ([deputyId, p]) => ({
                  deputyId,
                  ...p,
                }),
              ),
            });
          }
        }

        // Pairwise concordance
        const pairwise: CompareResult["pairwise"] = [];
        for (let i = 0; i < deputyIds.length; i++) {
          for (let j = i + 1; j < deputyIds.length; j++) {
            const idA = deputyIds[i]!;
            const idB = deputyIds[j]!;
            const briefA = briefs.find((b) => b.id === idA);
            const briefB = briefs.find((b) => b.id === idB);

            let pairIdentical = 0;
            for (const [, scrutin] of scrutinMap) {
              const posA = scrutin.positions.get(idA);
              const posB = scrutin.positions.get(idB);
              if (posA && posB && posA.position === posB.position) {
                pairIdentical++;
              }
            }

            pairwise.push({
              deputyAId: idA,
              deputyAName: briefA
                ? `${briefA.firstName} ${briefA.lastName}`
                : idA,
              deputyBId: idB,
              deputyBName: briefB
                ? `${briefB.firstName} ${briefB.lastName}`
                : idB,
              concordanceRate:
                totalCommonVotes > 0
                  ? Number(
                      ((pairIdentical / totalCommonVotes) * 100).toFixed(2),
                    )
                  : 0,
              identicalVotes: pairIdentical,
              totalCommon: totalCommonVotes,
            });
          }
        }

        return {
          deputies: briefs.map((b) => ({
            id: b.id,
            firstName: b.firstName,
            lastName: b.lastName,
            slug: b.slug,
            photoUrl: b.photoUrl,
          })),
          totalCommonVotes,
          identicalVotes,
          concordanceRate:
            totalCommonVotes > 0
              ? Number(((identicalVotes / totalCommonVotes) * 100).toFixed(2))
              : 0,
          divergences,
          pairwise,
        };
      });
    },
  };
}

export type CompareService = ReturnType<typeof createCompareService>;
