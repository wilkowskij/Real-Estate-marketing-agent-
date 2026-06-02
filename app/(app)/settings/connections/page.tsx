import { redirect } from "next/navigation";

/** Connections moved into the user Profile hub. */
export default function ConnectionsRedirect() {
  redirect("/profile/connections");
}
