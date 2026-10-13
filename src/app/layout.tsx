import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Хайч, чулуу, даавуу — Гараа ашиглан AI-тай тогло!",
  description:
    "Вэбкамын бодит цагийн гар хяналтаар тоглодог Хайч, чулуу, даавуу тоглоом. MediaPipe гар цэгийн илрүүлэлт ашиглан бүх боловсруулалт хөтөчинд локал явагдна.",
  keywords: [
    "Хайч чулуу даавуу",
    "гар хяналт",
    "hand tracking",
    "MediaPipe",
    "AI тоглоом",
    "webcam game",
  ],
  authors: [{ name: "Z.ai" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
