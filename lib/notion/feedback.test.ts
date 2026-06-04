import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFeedbackPage, notionConfigured } from "./feedback";

const ENV = process.env;

beforeEach(() => {
  process.env = { ...ENV };
});
afterEach(() => {
  process.env = ENV;
  vi.restoreAllMocks();
});

describe("notionConfigured", () => {
  it("is false unless both key and db id are set", () => {
    delete process.env.NOTION_API_KEY;
    delete process.env.NOTION_FEEDBACK_DB_ID;
    expect(notionConfigured()).toBe(false);
    process.env.NOTION_API_KEY = "secret";
    expect(notionConfigured()).toBe(false);
    process.env.NOTION_FEEDBACK_DB_ID = "db123";
    expect(notionConfigured()).toBe(true);
  });
});

describe("createFeedbackPage", () => {
  it("returns null when Notion is unconfigured (no network call)", async () => {
    delete process.env.NOTION_API_KEY;
    const fetchSpy = vi.spyOn(global, "fetch");
    const res = await createFeedbackPage({
      type: "bug",
      subject: "x",
      message: "y",
      orgId: "o",
      userId: "u",
    });
    expect(res).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("discovers the title property and maps type/status/email onto the page", async () => {
    process.env.NOTION_API_KEY = "secret";
    process.env.NOTION_FEEDBACK_DB_ID = "db123";

    // First call: describe database. Second call: create page.
    const createBody = vi.fn();
    vi.spyOn(global, "fetch").mockImplementation((async (url: string, init?: RequestInit) => {
      if (url.includes("/databases/")) {
        return new Response(
          JSON.stringify({
            properties: {
              Ticket: { type: "title" },
              Type: { type: "select" },
              Status: { type: "select" },
              "Reply Email": { type: "email" },
            },
          }),
          { status: 200 }
        );
      }
      // pages create
      createBody(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ id: "page_1", url: "https://notion.so/page_1" }), {
        status: 200,
      });
    }) as unknown as typeof fetch);

    const res = await createFeedbackPage({
      type: "feature",
      subject: "Add dark mode",
      message: "Please add a dark theme.",
      contactEmail: "agent@example.com",
      pageUrl: "https://app/x",
      orgId: "org_1",
      userId: "user_1",
    });

    expect(res).toEqual({ pageId: "page_1", url: "https://notion.so/page_1" });
    const sent = createBody.mock.calls[0][0];
    // Title goes onto the discovered title property name, not a hardcoded "Name".
    expect(sent.properties.Ticket.title[0].text.content).toBe("Add dark mode");
    expect(sent.properties.Type.select.name).toBe("Feature request");
    expect(sent.properties.Status.select.name).toBe("New");
    expect(sent.properties["Reply Email"].email).toBe("agent@example.com");
  });

  it("omits optional props the database doesn't define", async () => {
    process.env.NOTION_API_KEY = "secret";
    process.env.NOTION_FEEDBACK_DB_ID = "db123";

    const createBody = vi.fn();
    vi.spyOn(global, "fetch").mockImplementation((async (url: string, init?: RequestInit) => {
      if (url.includes("/databases/")) {
        return new Response(JSON.stringify({ properties: { Name: { type: "title" } } }), {
          status: 200,
        });
      }
      createBody(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ id: "page_2" }), { status: 200 });
    }) as unknown as typeof fetch);

    const res = await createFeedbackPage({
      type: "bug",
      subject: "Broken button",
      message: "It does nothing.",
      orgId: "o",
      userId: "u",
    });

    expect(res).toEqual({ pageId: "page_2", url: null });
    const sent = createBody.mock.calls[0][0];
    expect(Object.keys(sent.properties)).toEqual(["Name"]);
  });

  it("returns null (caller keeps the row) when Notion responds with an error", async () => {
    process.env.NOTION_API_KEY = "secret";
    process.env.NOTION_FEEDBACK_DB_ID = "db123";
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("nope", { status: 401 }));
    const res = await createFeedbackPage({
      type: "feedback",
      subject: "s",
      message: "m",
      orgId: "o",
      userId: "u",
    });
    expect(res).toBeNull();
  });
});
