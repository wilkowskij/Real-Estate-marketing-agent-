import { describe, it, expect } from "vitest";
import { resolveBrand } from "./resolveBrand";
import { DEFAULT_MARKET_AREA } from "./marketArea";
import type { BrandKit, Profile } from "@/lib/supabase/types";

const baseKit = (over: Partial<BrandKit>): BrandKit => ({
  id: "k",
  org_id: "o",
  owner: "org",
  membership_id: null,
  name: "Org",
  logo_light_path: "org/logo.png",
  logo_dark_path: null,
  colors: { primary: "#000", secondary: "#111", accent: "#222" },
  fonts: { heading: "Fraunces", body: "Inter" },
  disclaimer: "Org disclaimer",
  layout_theme: "classic",
  locked_fields: [],
  market_area: DEFAULT_MARKET_AREA,
  is_default: true,
  ...over,
});

const profile: Profile = {
  user_id: "u",
  full_name: "Jane Agent",
  license_number: "NJ-1",
  headshot_path: "u/headshot.png",
  contact_block: { phone: "555" },
};

describe("resolveBrand", () => {
  it("uses org values when there is no member kit", () => {
    const r = resolveBrand({ orgKit: baseKit({}), memberKit: null, profile });
    expect(r.colors.accent).toBe("#222");
    expect(r.agent.fullName).toBe("Jane Agent");
  });

  it("lets a member override unlocked fields", () => {
    const orgKit = baseKit({ locked_fields: [] });
    const memberKit = baseKit({
      owner: "member",
      membership_id: "m",
      colors: { primary: "#fff", secondary: "#eee", accent: "#gold" },
    });
    const r = resolveBrand({ orgKit, memberKit, profile });
    expect(r.colors.primary).toBe("#fff");
  });

  it("enforces org-locked fields over member overrides", () => {
    const orgKit = baseKit({ locked_fields: ["colors", "logo_light_path"] });
    const memberKit = baseKit({
      owner: "member",
      membership_id: "m",
      colors: { primary: "#fff", secondary: "#eee", accent: "#gold" },
      logo_light_path: "member/logo.png",
    });
    const r = resolveBrand({ orgKit, memberKit, profile });
    expect(r.colors.primary).toBe("#000"); // locked → org wins
    expect(r.logoLightPath).toBe("org/logo.png");
  });

  it("always sources agent identity from the profile", () => {
    const r = resolveBrand({ orgKit: baseKit({}), memberKit: null, profile });
    expect(r.agent.headshotPath).toBe("u/headshot.png");
    expect(r.agent.contact.phone).toBe("555");
  });

  it("resolves the market area and respects locking", () => {
    const tx = { state: "TX", county: "Travis", towns: ["Austin"] };
    // member override allowed when unlocked
    const open = resolveBrand({
      orgKit: baseKit({}),
      memberKit: baseKit({ owner: "member", membership_id: "m", market_area: tx }),
      profile,
    });
    expect(open.marketArea.county).toBe("Travis");

    // org-locked market area wins
    const locked = resolveBrand({
      orgKit: baseKit({ locked_fields: ["market_area"] }),
      memberKit: baseKit({ owner: "member", membership_id: "m", market_area: tx }),
      profile,
    });
    expect(locked.marketArea.county).toBe("Monmouth");
  });
});
