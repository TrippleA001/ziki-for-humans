import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = {
  title: "Ziki for humans — agent supervision console",
  description:
    "Brief an autonomous agent, watch every step stream in, and audit — or undo — anything it did.",
  openGraph: {
    title: "Ziki for humans",
    description:
      "A supervision console for autonomous AI agents: watch runs stream in, audit every call, and release what they park.",
    type: "website",
    siteName: "Ziki for humans",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ziki for humans",
    description:
      "A supervision console for autonomous AI agents: watch runs stream in, audit every call, and release what they park.",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F7FC",
};

const themeScript = `
try {
  var stored = localStorage.getItem('ziki-theme');
  if (stored === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-app">
        <Providers>
          <TopBar />
          <main className="mx-auto w-full max-w-shell px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
