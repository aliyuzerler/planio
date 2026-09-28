import { Manrope, Plus_Jakarta_Sans } from "next/font/google";

export const planioDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-planio-display",
  weight: ["600", "700"],
});

export const planioSans = Manrope({
  subsets: ["latin"],
  variable: "--font-planio-sans",
});
