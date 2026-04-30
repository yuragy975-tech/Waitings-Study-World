import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { zhCN } from "@clerk/localizations";
import { AppSidebar } from "@/components/AppSidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waiting's Study World",
  description: "我的私人学习空间 — 单词本·听写·语法·AI学习教练",
};

const themeScript = `(function(){var h=new Date().getHours();if(h>=18||h<6)document.documentElement.classList.add('dark')})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={zhCN}>
      <html
        lang="zh-CN"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="h-full">
          <div className="flex h-full">
            <AppSidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
