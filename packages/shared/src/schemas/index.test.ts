import { describe, it, expect } from "vitest";
import {
  CursorPaginationQuery,
  OffsetPaginationQuery,
  SearchDeputiesQuery,
  DeputyVotesQuery,
  SearchScrutinsQuery,
  ScrutinVotesQuery,
  CompareQuery,
} from "./index.js";

describe("CursorPaginationQuery", () => {
  it("parses default values", () => {
    const result = CursorPaginationQuery.parse({});
    expect(result.limit).toBe(20);
    expect(result.cursor).toBeUndefined();
  });

  it("accepts valid limit", () => {
    const result = CursorPaginationQuery.parse({ limit: "50" });
    expect(result.limit).toBe(50);
  });

  it("rejects limit above 100", () => {
    expect(() => CursorPaginationQuery.parse({ limit: "150" })).toThrow();
  });

  it("rejects limit below 1", () => {
    expect(() => CursorPaginationQuery.parse({ limit: "0" })).toThrow();
  });
});

describe("OffsetPaginationQuery", () => {
  it("parses default values", () => {
    const result = OffsetPaginationQuery.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("accepts offset", () => {
    const result = OffsetPaginationQuery.parse({ offset: "10" });
    expect(result.offset).toBe(10);
  });
});

describe("SearchDeputiesQuery", () => {
  it("parses minimal query", () => {
    const result = SearchDeputiesQuery.parse({});
    expect(result.legislature).toBe("17");
    expect(result.limit).toBe(20);
  });

  it("accepts department code", () => {
    const result = SearchDeputiesQuery.parse({ department: "75" });
    expect(result.department).toBe("75");
  });

  it("rejects invalid department length", () => {
    expect(() => SearchDeputiesQuery.parse({ department: "750" })).toThrow();
  });

  it("accepts circo number", () => {
    const result = SearchDeputiesQuery.parse({ circo: "3" });
    expect(result.circo).toBe(3);
  });

  it("rejects circo above 21", () => {
    expect(() => SearchDeputiesQuery.parse({ circo: "22" })).toThrow();
  });
});

describe("DeputyVotesQuery", () => {
  it("accepts valid ISO date", () => {
    const result = DeputyVotesQuery.parse({ from: "2024-01-15" });
    expect(result.from).toBe("2024-01-15");
  });

  it("accepts valid vote type", () => {
    const result = DeputyVotesQuery.parse({ type: "solennel" });
    expect(result.type).toBe("solennel");
  });

  it("rejects invalid vote type", () => {
    expect(() => DeputyVotesQuery.parse({ type: "invalid" })).toThrow();
  });

  it("accepts valid position", () => {
    const result = DeputyVotesQuery.parse({ position: "pour" });
    expect(result.position).toBe("pour");
  });

  it("rejects invalid date format", () => {
    expect(() => DeputyVotesQuery.parse({ from: "15-01-2024" })).toThrow();
  });
});

describe("SearchScrutinsQuery", () => {
  it("parses default sort", () => {
    const result = SearchScrutinsQuery.parse({});
    expect(result.sort).toBe("date_desc");
  });

  it("accepts date_asc sort", () => {
    const result = SearchScrutinsQuery.parse({ sort: "date_asc" });
    expect(result.sort).toBe("date_asc");
  });

  it("rejects invalid sort", () => {
    expect(() => SearchScrutinsQuery.parse({ sort: "invalid" })).toThrow();
  });
});

describe("ScrutinVotesQuery", () => {
  it("accepts group filter", () => {
    const result = ScrutinVotesQuery.parse({ group: "LFI" });
    expect(result.group).toBe("LFI");
  });

  it("accepts position filter", () => {
    const result = ScrutinVotesQuery.parse({ position: "abstention" });
    expect(result.position).toBe("abstention");
  });
});

describe("CompareQuery", () => {
  it("accepts 2 deputies", () => {
    const result = CompareQuery.parse({ deputies: "PA123,PA456" });
    expect(result.deputies).toBe("PA123,PA456");
  });

  it("accepts 5 deputies", () => {
    const result = CompareQuery.parse({
      deputies: "PA1,PA2,PA3,PA4,PA5",
    });
    expect(result.deputies).toBe("PA1,PA2,PA3,PA4,PA5");
  });

  it("rejects single deputy", () => {
    expect(() => CompareQuery.parse({ deputies: "PA123" })).toThrow();
  });

  it("rejects 6 deputies", () => {
    expect(() =>
      CompareQuery.parse({ deputies: "PA1,PA2,PA3,PA4,PA5,PA6" }),
    ).toThrow();
  });

  it("rejects invalid deputy ID format", () => {
    expect(() => CompareQuery.parse({ deputies: "PA123,invalid" })).toThrow();
  });

  it("accepts optional date range", () => {
    const result = CompareQuery.parse({
      deputies: "PA123,PA456",
      from: "2024-01-01",
      to: "2024-12-31",
    });
    expect(result.from).toBe("2024-01-01");
    expect(result.to).toBe("2024-12-31");
  });

  it("rejects invalid date in range", () => {
    expect(() =>
      CompareQuery.parse({
        deputies: "PA123,PA456",
        from: "not-a-date",
      }),
    ).toThrow();
  });
});
