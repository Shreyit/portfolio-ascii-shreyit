import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { MotionProvider } from "@/lib/motion/MotionProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "lenis/dist/lenis.css";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
  ],
};

// Follows the system color scheme when the user has NOT chosen a theme;
// once localStorage has "theme", system changes are ignored.
const themeInitScript = `(function(){try{var stored=localStorage.getItem("theme");var media=window.matchMedia("(prefers-color-scheme: light)");var apply=function(light){document.documentElement.dataset.theme=light?"light":"dark";};if(stored==="light"||stored==="dark"){document.documentElement.dataset.theme=stored;}else{apply(media.matches);media.addEventListener("change",function(event){try{var current=localStorage.getItem("theme");if(current==="light"||current==="dark"){return;}}catch(ignore){}apply(event.matches);});}}catch(error){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <MotionProvider>
          <header className="site-header">
            <span aria-hidden="true">~/shreyit</span>
            <ThemeToggle />
          </header>
          <main id="main" className="site-main">
            {children}
          </main>
          <footer className="site-footer">
            <span>&copy; Shreyit Sinha</span>
          </footer>
        </MotionProvider>
      </body>
    </html>
  );
}
