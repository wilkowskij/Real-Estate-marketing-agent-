import { redirect } from "next/navigation";

/** Billing moved into the Company profile hub. */
export default function BillingRedirect() {
  redirect("/company/subscription");
}
