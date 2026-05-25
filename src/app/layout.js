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
  title: "Smooth Criminal - Are Your Animations OK, Annie?",
  description: "Stop murdering your animations. Design, save and export your favorite easing curves. No more ease-in-out by default.",
  icons: { icon: "/assets/emoji.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${workSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
