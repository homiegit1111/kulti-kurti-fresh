import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TrayClient } from "./tray-client";

export const metadata: Metadata = {
  title: "Your order",
  description:
    "The order you're building — saved styles, set counts, sets, pieces, blended per-piece rate and the minimum order, all on one sheet. Send it on WhatsApp when ready.",
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
