import type { Metadata } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "../lib/theme";
import { Navbar } from "../components/Navbar";
import { PageTransition } from "../components/PageTransition";
import { ToastProvider } from "../components/ui/Toast";

export const metadata: Metadata = {
  title: "Interview Prep Agent",
  description:
    "Research a company and role, generate a tailored interview prep guide, and run an adaptive mock interview.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg transition-colors duration-200">
        <ToastProvider>
          <Navbar />
          <PageTransition>{children}</PageTransition>
        </ToastProvider>
      </body>
    </html>
  );
}
