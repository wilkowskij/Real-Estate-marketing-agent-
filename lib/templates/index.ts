export type ContentTemplateCampaignType =
  | "just_sold"
  | "new_listing"
  | "open_house"
  | "market_stat"
  | "neighborhood_spotlight"
  | "deal_of_week"
  | "before_after"
  | "educational"
  | "testimonial"
  | "custom";

export interface ContentTemplate {
  id: string;
  title: string;
  description: string;
  type: ContentTemplateCampaignType;
  /** Pre-fills the "Describe your post" brief input. */
  brief: string;
  /** Pre-fills the marketing agent instructions field. */
  instructions: string;
  tags: string[];
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  // ── Just Sold ───────────────────────────────────────────────────────────
  {
    id: "just-sold-over-ask",
    title: "Just Sold — Over Asking",
    description: "Celebrate a sale above list price with buyer demand story",
    type: "just_sold",
    brief: "Just sold above asking price — competitive market, multiple offers",
    instructions:
      "Highlight market demand and speed of sale. Include days on market if under 14. Congratulate sellers without using their names.",
    tags: ["listing", "seller", "competitive market"],
  },
  {
    id: "just-sold-record-time",
    title: "Sold in Record Time",
    description: "Showcase a lightning-fast close to signal agent expertise",
    type: "just_sold",
    brief: "Property sold very quickly, well under average days on market",
    instructions:
      "Lead with the speed stat. Compare to local average DOM if known. End with a CTA for sellers thinking of timing the market.",
    tags: ["listing", "seller", "days on market"],
  },
  {
    id: "just-sold-testimonial-close",
    title: "Just Sold — Happy Client",
    description: "Pair the sold announcement with a client sentiment quote",
    type: "just_sold",
    brief: "Just sold and client is thrilled with the outcome",
    instructions:
      "Write as if the agent is sharing the joy of the result. Include a paraphrased client sentiment (no real names). CTA: 'Ready to write your own sold story?'",
    tags: ["listing", "testimonial", "seller"],
  },

  // ── New Listing ──────────────────────────────────────────────────────────
  {
    id: "new-listing-move-in-ready",
    title: "New Listing — Move-In Ready",
    description: "Lead with lifestyle appeal for a turnkey home",
    type: "new_listing",
    brief: "New listing — updated, move-in ready home with modern finishes",
    instructions:
      "Emphasize low friction for buyers (no renovation needed). Use lifestyle language: mornings in the kitchen, evenings on the deck. End with a showing CTA.",
    tags: ["listing", "buyer", "turnkey"],
  },
  {
    id: "new-listing-investment",
    title: "New Listing — Investor Opportunity",
    description: "Angle the listing toward investors with ROI framing",
    type: "new_listing",
    brief: "New listing — strong investment potential, rental income opportunity",
    instructions:
      "Focus on cap rate potential, rental demand in the area, and appreciation trends. Avoid specific return guarantees. CTA: 'Run the numbers with me.'",
    tags: ["listing", "investor", "rental income"],
  },
  {
    id: "new-listing-price-improvement",
    title: "Price Improvement — Now Showing",
    description: "Re-launch interest after a price reduction",
    type: "new_listing",
    brief: "Price reduction on existing listing — fresh opportunity for buyers",
    instructions:
      "Reframe the reduction as a buying opportunity, not a negative. 'The market spoke — and we listened.' Urgency but not desperation. CTA: 'Schedule a tour before this one's gone.'",
    tags: ["listing", "buyer", "price reduction"],
  },
  {
    id: "new-listing-waterfront",
    title: "Featured: Waterfront / Premium Property",
    description: "Luxury framing for premium or waterfront listings",
    type: "new_listing",
    brief: "Exceptional listing — premium location, unique features worth highlighting",
    instructions:
      "Use aspirational language. Focus on scarcity: 'Properties like this rarely come to market.' No price anchoring in the caption — drive to DM/call instead.",
    tags: ["listing", "luxury", "premium"],
  },

  // ── Open House ──────────────────────────────────────────────────────────
  {
    id: "open-house-weekend",
    title: "Open House This Weekend",
    description: "Drive weekend foot traffic with event-style energy",
    type: "open_house",
    brief: "Open house this weekend — come see the home in person",
    instructions:
      "Treat it like an event invitation. Day, time, and vibes. Mention parking, what to expect. Light refreshments mentioned if applicable. End with RSVP or add-to-calendar CTA.",
    tags: ["open house", "buyer", "weekend event"],
  },
  {
    id: "open-house-broker",
    title: "Broker Open — Agent Network",
    description: "Announce a broker caravan for agent-to-agent marketing",
    type: "open_house",
    brief: "Broker open / caravan for real estate agents — come preview the home",
    instructions:
      "Audience is other agents, not buyers. Professional tone. Highlight features buyers will love so agents can pre-sell it. Include compensation note if applicable (check compliance).",
    tags: ["open house", "agent network", "broker"],
  },

  // ── Market Stats ────────────────────────────────────────────────────────
  {
    id: "monthly-market-update",
    title: "Monthly Market Update",
    description: "Data-driven monthly recap to position the agent as a local expert",
    type: "market_stat",
    brief: "Monthly market update — prices, days on market, inventory trends",
    instructions:
      "Include 2-3 specific local numbers: median sale price, avg DOM, list-to-sale ratio. Add one contrarian or surprising insight. End with 'What does this mean for you?'",
    tags: ["market data", "buyer", "seller", "thought leader"],
  },
  {
    id: "spring-market-forecast",
    title: "Spring / Seasonal Market Forecast",
    description: "Seasonal market prediction to drive engagement and lead capture",
    type: "market_stat",
    brief: "Spring real estate market — what to expect this season",
    instructions:
      "Predict the near-term market based on current indicators. Balance optimism with realism. CTA: 'Are you thinking of buying or selling this spring? Let's connect.'",
    tags: ["market data", "seasonal", "forecast"],
  },
  {
    id: "interest-rate-reality",
    title: "Interest Rate Reality Check",
    description: "Cut through rate confusion with a grounded, helpful take",
    type: "market_stat",
    brief: "Current mortgage rates — what buyers need to know right now",
    instructions:
      "Don't predict rates. Focus on what the agent CAN control: payment examples, buying power at current rates vs 6 months ago, why 'date the rate, marry the house' is still valid.",
    tags: ["mortgage", "rates", "buyer education"],
  },

  // ── Neighborhood Spotlights ─────────────────────────────────────────────
  {
    id: "neighborhood-buyers-moving",
    title: "Why Buyers Are Moving Here",
    description: "Showcase local pull factors that attract relocators",
    type: "neighborhood_spotlight",
    brief: "What's drawing buyers to this area — schools, commute, lifestyle",
    instructions:
      "Pick 3 specific pull factors (school district rankings, commute times, local employer, walkability score). Use real place names and landmarks. Avoid generic 'great community' language.",
    tags: ["neighborhood", "relocation", "buyer"],
  },
  {
    id: "neighborhood-hidden-gem",
    title: "Hidden Gem Neighborhood",
    description: "Surface an up-and-coming area before prices catch up",
    type: "neighborhood_spotlight",
    brief: "Under-the-radar neighborhood that buyers are starting to discover",
    instructions:
      "Specific neighborhood or micro-market. 3 things that make it stand out vs. nearby areas. Include one 'insider' detail that most people don't know.",
    tags: ["neighborhood", "up and coming", "buyer"],
  },
  {
    id: "neighborhood-local-spots",
    title: "My Favorite Local Spots",
    description: "Personal brand post showcasing agent's local knowledge",
    type: "neighborhood_spotlight",
    brief: "Local coffee shops, restaurants, or parks worth highlighting in the area",
    instructions:
      "First-person voice. 3 specific spots with what makes each one great. End: 'Ask me for the full local guide when you're ready to explore the area.' Builds trust and local credibility.",
    tags: ["personal brand", "community", "local expert"],
  },

  // ── Educational ─────────────────────────────────────────────────────────
  {
    id: "first-time-buyer-tips",
    title: "5 Tips for First-Time Buyers",
    description: "Foundational buyer guide to attract first-timers into the funnel",
    type: "educational",
    brief: "Top 5 things first-time homebuyers need to know before starting",
    instructions:
      "Use numbered format for easy scanning. Practical, not obvious tips (not 'get pre-approved' without explaining why and how). Avoid financial advice; stay in the lane of process guidance. Save-worthy content.",
    tags: ["first-time buyer", "education", "carousel"],
  },
  {
    id: "how-to-win-bidding-war",
    title: "How to Win a Bidding War",
    description: "Competitive market survival guide for active buyers",
    type: "educational",
    brief: "Strategies for buyers competing in multiple offer situations",
    instructions:
      "3-5 concrete tactics: escalation clauses, appraisal gap coverage, flexible close, personal letter (check Fair Housing). Don't guarantee outcomes. CTA: 'I negotiate these every week — let me guide you.'",
    tags: ["buyer", "competitive market", "negotiation"],
  },
  {
    id: "pre-approval-explainer",
    title: "Pre-Approval vs. Pre-Qualification",
    description: "Clear up a common buyer confusion to build authority",
    type: "educational",
    brief: "Difference between mortgage pre-approval and pre-qualification explained simply",
    instructions:
      "Use a simple before/after or comparison format. One sentence each. End: 'Pre-approved means you can move fast when the right home comes along.' CTA to reach out or get a lender referral.",
    tags: ["buyer", "mortgage", "education"],
  },
  {
    id: "buy-vs-rent",
    title: "Buy vs. Rent — Real Math",
    description: "Challenge the 'renting is throwing money away' myth with honest numbers",
    type: "educational",
    brief: "Buy vs. rent analysis — when buying makes sense and when it doesn't",
    instructions:
      "Be intellectually honest. Renting IS sometimes the right call. Show 2-3 scenarios. Don't use scare tactics. This builds massive trust by NOT just trying to create a buyer. Long-form, save-worthy.",
    tags: ["buyer", "financial literacy", "thought leader"],
  },

  // ── Social Proof ────────────────────────────────────────────────────────
  {
    id: "client-success-story",
    title: "Client Success Story",
    description: "Narrative-driven testimonial post that shows results, not just praise",
    type: "testimonial",
    brief: "Client achieved their real estate goal — showcase the win",
    instructions:
      "Tell a mini-story: challenge they faced → what we did → the outcome. No real names. End with a question that invites audience to see themselves in the story. 'What's YOUR real estate goal this year?'",
    tags: ["testimonial", "social proof", "seller", "buyer"],
  },

  // ── Before/After ────────────────────────────────────────────────────────
  {
    id: "renovation-reveal",
    title: "Renovation Transformation",
    description: "Before/after reveal for staged or renovated listings",
    type: "before_after",
    brief: "Home renovation or staging transformation — dramatic before and after",
    instructions:
      "Describe the transformation vividly (before: dated, cramped; after: bright, open). Include approximate ROI if known. Encourage sellers to ask about staging consultation.",
    tags: ["before after", "staging", "renovation", "seller"],
  },

  // ── Deal of the Week ────────────────────────────────────────────────────
  {
    id: "deal-of-week",
    title: "Deal of the Week",
    description: "Weekly spotlight on a best-value listing in the current inventory",
    type: "deal_of_week",
    brief: "Best value home on the market this week — price-per-square-foot standout",
    instructions:
      "Lead with value metric (price per sqft, features vs price). Compare to what similar homes sold for. Creates urgency. Good for agents with an active inventory. CTA: 'This one won't last.'",
    tags: ["listing", "value", "buyer"],
  },

  // ── Custom / Community ──────────────────────────────────────────────────
  {
    id: "seasonal-market-push",
    title: "Seasonal Call to Action",
    description: "Market the season as a reason to act — spring, fall, year-end",
    type: "custom",
    brief: "Seasonal real estate message — why now is a good time to move",
    instructions:
      "Tie specific season dynamics to buyer/seller opportunity. Spring: inventory coming. Fall: less competition. Year-end: motivated sellers. Practical CTA for each group.",
    tags: ["seasonal", "buyer", "seller"],
  },
  {
    id: "ask-me-anything",
    title: "Ask Me Anything — Real Estate",
    description: "Engagement-driver that surfaces audience questions and creates follow-up content",
    type: "custom",
    brief: "Inviting followers to ask their real estate questions",
    instructions:
      "Conversational, approachable tone. List 3 example questions to prime the pump. Commit to answering every comment. Works best as a recurring series. End: 'Drop your question below 👇'",
    tags: ["engagement", "community", "personal brand"],
  },
];

/**
 * Look up a template by its id. Returns undefined if not found.
 */
export function getTemplate(id: string): ContentTemplate | undefined {
  return CONTENT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Filter templates by campaign type. Returns all templates if type is undefined.
 */
export function templatesByType(type?: string): ContentTemplate[] {
  if (!type) return CONTENT_TEMPLATES;
  return CONTENT_TEMPLATES.filter((t) => t.type === type);
}
