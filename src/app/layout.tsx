import './i18n/i18n';
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";
import dynamic from 'next/dynamic';
import { PrimeReactProvider } from 'primereact/api';
import { ClientInit } from './client-init';
import { Analytics } from '@vercel/analytics/next';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const I18nProvider = dynamic(() => import('./i18n/I18nProvider'), { ssr: false });

export const metadata: Metadata = {
  title: "BabelDuck",
  description: "A beginner-friendly AI-powered conversation practice application for language learners of all proficiency levels.",
  icons: {
    icon: '/images/favicon.png'
  }
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen w-screen`}
      >
        <I18nProvider>
          <PrimeReactProvider>
            <ClientInit />
            <Providers>
              {children}
              <Analytics />
            </Providers>
          </PrimeReactProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
