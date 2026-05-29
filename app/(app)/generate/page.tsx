import { Suspense } from "react";
import { GenerateClient } from "./GenerateClient";

export default function GeneratePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">Create</p>
      <h1 className="mt-2 text-4xl text-navy">Build a campaign</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Add the listing, upload your best photos, and your agents will handle the
        copy and the design.
      </p>
      <Suspense>
        <GenerateClient />
      </Suspense>
    </div>
  );
}
