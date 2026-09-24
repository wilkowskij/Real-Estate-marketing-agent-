// Minimal flat config so `next lint` (and any editor/CI integration) runs
// non-interactively. next/core-web-vitals is Next.js's own recommended set;
// nothing project-specific has been layered on top of it yet.
//
// Source: created 2026 during repo standardization; no prior ESLint config
// existed (confirmed by absence of .eslintrc* and eslint.config* before this
// file, and by `next lint` dropping into its first-run setup wizard).
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [...compat.extends("next/core-web-vitals")];

export default eslintConfig;
