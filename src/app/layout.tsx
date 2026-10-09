import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'HieuDaoTao - Academic Policy Intelligence Prototype',
  description:
    'Provider-agnostic AI prototype for Vietnamese higher education policy analysis, source-grounded answers, and human verification.',
  icons: {
    icon: '/brand/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <div className="page-glow glow-one" aria-hidden="true" />
        <div className="page-glow glow-two" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
