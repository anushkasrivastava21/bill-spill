import { Sora, Space_Grotesk, Work_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-sora" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500"], variable: "--font-space-grotesk" });
const workSans = Work_Sans({ subsets: ["latin"], weight: ["400"], variable: "--font-work-sans" });

export const metadata = {
  title: "ShoreSplit",
  description: "Bill Splitter App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${sora.variable} ${spaceGrotesk.variable} ${workSans.variable} font-body-md min-h-screen flex flex-col bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container`}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
