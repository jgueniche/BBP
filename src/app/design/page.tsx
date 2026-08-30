import type { Metadata } from "next";

import { fr } from "@/i18n/fr";

import { DesignShowcase } from "./showcase";

export const metadata: Metadata = {
  title: `${fr.design.title} — ${fr.app.name}`,
};

export default function DesignPage() {
  return <DesignShowcase />;
}
