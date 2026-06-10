"use client";

import { useState } from "react";
import { CONTENT_TEMPLATES, type ContentTemplate, type ContentTemplateCampaignType } from "@/lib/templates";

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "",                     label: "All"          },
  { value: "just_sold",            label: "Just Sold"    },
  { value: "new_listing",          label: "New Listing"  },
  { value: "open_house",           label: "Open House"   },
  { value: "market_stat",          label: "Market Stat"  },
  { value: "neighborhood_spotlight", label: "Neighborhood" },
  { value: "educational",          label: "Educational"  },
  { value: "testimonial",          label: "Testimonial"  },
  { value: "before_after",         label: "Before/After" },
  { value: "deal_of_week",         label: "Deal of Week" },
  { value: "custom",               label: "Custom"       },
];

interface TemplatePickerProps {
  onSelect: (t: ContentTemplate) => void;
}

/**
 * Collapsible grid of 25 RE content templates. Selecting one pre-fills the
 * GenerateClient form (type, brief, instructions) without starting generation.
 */
export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState("");
  const [query,  setQuery]  = useState("");

  const visible = CONTENT_TEMPLATES.filter((t) => {
    const matchesType  = !filter || t.type === filter;
    const matchesQuery = !query  || t.title.toLowerCase().includes(query.toLowerCase()) ||
                                    t.description.toLowerCase().includes(query.toLowerCase()) ||
                                    t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
    return matchesType && matchesQuery;
  });

  return (
    <div className="rounded-xl border border-paper-line bg-paper">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <span className="text-sm font-medium text-navy">
            Start from a template
          </span>
          <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs text-ink-muted">
            {CONTENT_TEMPLATES.length}
          </span>
        </div>
        <span className="text-xs text-ink-muted">{open ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {open && (
        <div className="border-t border-paper-line px-4 pb-4 pt-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="flex-1 min-w-[140px] rounded-lg border border-paper-line bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTER_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setFilter(o.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    filter === o.value
                      ? "border-gold bg-gold/10 font-semibold text-gold-deep"
                      : "border-paper-line text-ink-soft hover:border-gold/40"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template grid */}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {visible.length === 0 ? (
              <p className="col-span-2 py-4 text-center text-sm text-ink-muted">
                No templates match — try a different filter.
              </p>
            ) : (
              visible.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onSelect(t); setOpen(false); }}
                  className="group flex flex-col gap-1 rounded-lg border border-paper-line bg-white p-3 text-left transition-all hover:border-gold/60 hover:shadow-sm"
                >
                  <span className="text-sm font-medium text-navy group-hover:text-gold-deep">
                    {t.title}
                  </span>
                  <span className="text-xs text-ink-muted line-clamp-2">
                    {t.description}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-paper px-2 py-0.5 text-[10px] text-ink-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
