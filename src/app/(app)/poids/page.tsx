import { redirect } from "next/navigation";

// Weight tracking moved into /progres with the redesign; keep old links alive.
export default function PoidsPage() {
  redirect("/progres");
}
