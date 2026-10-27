import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = {
  title: "Ziki for humans — agent supervision console",
  description:
    "Command your agents from the browser, watch every step live, and stay the only person who can merge.",
  openGraph: {
    title: "Ziki for humans",
    description:
      "A supervision console for AI agents: approve plans, watch runs stream in, and keep the merge gate.",
    type: "website",
    siteName: "Ziki for humans",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ziki for humans",
    description:
      "A supervision console for AI agents: approve plans, watch runs stream in, and keep the merge gate.",
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
