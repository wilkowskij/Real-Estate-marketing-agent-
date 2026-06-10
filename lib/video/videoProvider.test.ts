import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ENV = process.env;
beforeEach(() => {
  process.env = { ...ENV };
  vi.resetModules(); // clear the provider singleton between cases
});
afterEach(() => {
  process.env = ENV;
});

describe("video provider selection", () => {
  it("isVideoConfigured is false without a provider + key", async () => {
    delete process.env.VIDEO_PROVIDER;
    delete process.env.SHOTSTACK_API_KEY;
    const { isVideoConfigured } = await import("./videoProvider");
    expect(isVideoConfigured()).toBe(false);
  });

  it("isVideoConfigured needs BOTH the provider and the key", async () => {
    process.env.VIDEO_PROVIDER = "shotstack";
    delete process.env.SHOTSTACK_API_KEY;
    const a = await import("./videoProvider");
    expect(a.isVideoConfigured()).toBe(false);

    vi.resetModules();
    process.env.SHOTSTACK_API_KEY = "key";
    const b = await import("./videoProvider");
    expect(b.isVideoConfigured()).toBe(true);
  });

  it("defaults to the stub provider, which throws a helpful message", async () => {
    delete process.env.VIDEO_PROVIDER;
    const { getVideoProvider } = await import("./videoProvider");
    const provider = getVideoProvider();
    await expect(
      provider.render({ storyboard: { scenes: [], totalSec: 0, aspect: "9:16", headline: "", caption: "", cta: "" } })
    ).rejects.toThrow(/stub/i);
  });
});
