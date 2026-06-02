import { redirect } from "next/navigation";

/** Team management moved into the Company profile hub. */
export default function TeamRedirect() {
  redirect("/company");
}
