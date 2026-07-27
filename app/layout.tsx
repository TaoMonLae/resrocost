import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "RestroCost",
    template: "%s · RestroCost",
  },
  description:
    "Restaurant cost, recipe pricing, inventory, sales, and profit management.",
  applicationName: "RestroCost",
  icons: {
    icon: [{ type: "image/png", url: "/icon.png" }],
    apple: [{ type: "image/png", url: "/apple-icon.png" }],
  },
  openGraph: {
    title: "RestroCost · Know what every plate really costs.",
    description:
      "Restaurant cost, recipe pricing, inventory, sales, and profit management.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1734,
        height: 907,
        alt: "RestroCost restaurant cost-management dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RestroCost · Know what every plate really costs.",
    description:
      "Restaurant cost, recipe pricing, inventory, sales, and profit management.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#111510" },
  ],
};

const themeScript = `
  try {
    const stored = localStorage.getItem("restrocost-theme");
    const dark = stored === "dark" || (!stored && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--hairline)",
            },
          }}
        />
      </body>
    </html>
  );
}
