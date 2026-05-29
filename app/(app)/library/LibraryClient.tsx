"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";

interface LibraryItem {
  id: string;
  label: string | null;
  previewUrl: string | null;
}

/**
 * Brand image library manager: admins upload reusable company imagery and can
 * remove items. Non-admins see a read-only gallery (the design agent draws on
 * these for non-listing posts).
 */
export function LibraryClient({
  initial,
  canManage,
}: {
  initial: LibraryItem[];
  canManage: boolean;
}) {
  const [items, setItems] = useState<LibraryItem[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/brand/library", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        setItems((prev) => [json, ...prev]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id)); // optimistic
    const res = await fetch(`/api/brand/library/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(prev); // revert
      setError((await res.json()).error || "Delete failed");
    }
  }

  return (
    <div className="mt-8">
      {canManage && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-paper-line py-10 text-center hover:border-gold/60">
          <span className="text-sm text-ink-soft">
            {uploading ? "Uploading…" : "Click to upload company photos, team shots, or backgrounds"}
          </span>
          <span className="mt-1 text-xs text-ink-muted">Up to 15MB each · images only</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files)}
          />
        </label>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <Card className="mt-6">
          <CardBody>
            <p className="text-sm text-ink-muted">
              No library images yet.{" "}
              {canManage
                ? "Upload office photos, team shots, or generic area backgrounds your posts can reuse."
                : "Your org admin hasn’t added any company imagery yet."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-xl2 border border-paper-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl ?? ""}
                alt={item.label ?? "Library image"}
                className="aspect-square w-full object-cover"
              />
              {canManage && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="absolute right-2 top-2 rounded-full bg-navy/80 px-2 py-1 text-xs text-paper opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
