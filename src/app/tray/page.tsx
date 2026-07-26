import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TrayClient } from "./tray-client";

export const metadata: Metadata = {
  title: "Tray — Shortlist & Order",
  description:
    "One surface for the styles you're working on. Shortlist without a set count, add sets when you're ready, and see sets, pieces, blended per-piece rate and minimum order in one place.",
};

export default function TrayPage() {
  return (
    <>
      <Navbar />
      <main>
        <TrayClient />
      </main>
      <Footer />
    </>
  );
}
