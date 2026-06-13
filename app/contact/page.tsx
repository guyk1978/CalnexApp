import type { Metadata } from "next";
import { ContactPageShell } from "./ContactPageShell";

export const metadata: Metadata = {
  title: "Contact CalnexApp",
  description: "Contact CalnexApp for support, feedback, and business inquiries.",
  alternates: { canonical: "https://calnexapp.com/contact/" },
};

export default function ContactPage() {
  return <ContactPageShell />;
}
