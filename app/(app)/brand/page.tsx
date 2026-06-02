import { redirect } from "next/navigation";

/** The brand kit moved into the Company profile hub. */
export default function BrandRedirect() {
  redirect("/company/brand");
}
