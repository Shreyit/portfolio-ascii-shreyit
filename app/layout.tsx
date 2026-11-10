import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Pixelify_Sans } from "next/font/google";
import { MotionProvider } from "@/lib/motion/MotionProvider";
import { SectionNav } from "@/components/SectionNav";
import { EffectsIsland } from "@/lib/motion/EffectsIsland";
import { ContactLinks } from "@/components/ContactLinks";
import { AmbientIsland } from "@/components/ambient/AmbientIsland";
import styles from "@/components/SectionNav.module.css";
import "lenis/dist/lenis.css";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Section headings only; swapped in without blocking text.
const pixelify = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  display: "swap",
});

const title = "Shreyit Sinha";
const description = "Personal portfolio of Shreyit Sinha.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050507",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${pixelify.variable}`}
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body>
        {/* Behind everything, outside <main>: it must never paint over content. */}
        <AmbientIsland />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <MotionProvider>
          <header className={`site-header ${styles.header}`}>
            <a className={styles.home} href="#main">
              ~/shreyit
            </a>
            <SectionNav />
          </header>
          <EffectsIsland />
          <main id="main" className="site-main">
            {children}
          </main>
          <footer className="site-footer site-footer--stacked">
            <ContactLinks />
            <span>&copy; Shreyit Sinha</span>
          </footer>
        </MotionProvider>
      </body>
    </html>
  );
}
