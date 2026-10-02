import { describe, it, expect } from "vitest";
import { extractTicketCode } from "@/lib/ticket-code";

describe("extractTicketCode", () => {
  it("accepts a bare code", () => expect(extractTicketCode("TKT6AADE8AEA15A2")).toBe("TKT6AADE8AEA15A2"));
  it("uppercases and trims", () => expect(extractTicketCode("  tkt6aade8aea15a2 ")).toBe("TKT6AADE8AEA15A2"));
  it("extracts from URL query", () =>
    expect(extractTicketCode("https://x.example/t?ticket=TKT6AADE8AEA15A2")).toBe("TKT6AADE8AEA15A2"));
  it("extracts from URL path", () =>
    expect(extractTicketCode("https://x.example/tickets/TKT6AADE8AEA15A2")).toBe("TKT6AADE8AEA15A2"));
  it("rejects garbage", () => expect(extractTicketCode("!!! ???")).toBeNull());
  it("rejects empty", () => expect(extractTicketCode("   ")).toBeNull());
});
