import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "看護必要度アナリシスソフト",
  description: "DPCデータから看護必要度を集計・分析し、施設基準の充足状況を確認するツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
