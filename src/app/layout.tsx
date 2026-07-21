import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'United Legal Support Services Portal',
  description:
    'Pre-litigation operations support and secure firm activity portal for personal injury law firms.',
};

// Applies the saved (or system) theme before first paint to avoid a flash.
const themeInit = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
