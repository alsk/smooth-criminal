import { Work_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./_easing/easing.css";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://smooth-criminal.pages.dev"),
  title: "Smooth Criminal - Are Your Animations OK, Annie?",
  description: "Stop murdering your animations. Design, save and export your favorite easing curves. No more ease-in-out by default 😌",
  icons: { icon: "/assets/emoji.png" },
  openGraph: {
    title: "Smooth Criminal - Are Your Animations OK, Annie?",
    description: "Stop murdering your animations. Design, save and export your favorite easing curves. No more ease-in-out by default 😌",
    url: "https://smooth-criminal.pages.dev",
    siteName: "Smooth Criminal",
    images: [{ url: "/og-preview.jpg", width: 1200, height: 630, alt: "Smooth Criminal" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smooth Criminal - Are Your Animations OK, Annie?",
    description: "Stop murdering your animations. Design, save and export your favorite easing curves. No more ease-in-out by default 😌",
    images: ["/og-preview.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${workSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
