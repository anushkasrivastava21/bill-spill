import { Sora, Work_Sans, Space_Grotesk } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-sora" });
const workSans = Work_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-work-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-space-grotesk" });

export const metadata = {
  title: "Bill Spill",
  description: "Split bills with friends, beautifully.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('bill-spill-theme') || 'system';
                  var isDark = theme === 'dark' || 
                    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${workSans.variable} ${sora.variable} ${spaceGrotesk.variable} min-h-screen flex flex-col`} style={{ fontFamily: "var(--font-work-sans)" }}>
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-1)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              fontSize: '14px',
              fontFamily: "var(--font-work-sans)",
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 93, 144, 0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
