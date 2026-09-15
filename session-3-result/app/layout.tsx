import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

/**
 * The brand's one typeface, in the only two weights it uses. Source Sans 3 is
 * the open-source release of the face heise.de serves as "Source Sans VF";
 * there is deliberately no second family and no mono, so nothing in the app
 * should reach for a `font-mono` utility.
 */
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Bartholomew",
  description: "A butler who keeps your to-do list.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
