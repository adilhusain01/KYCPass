import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account verification | Northstar Digital Bank",
  description: "A relying-party demonstration of KYCPass identity verification.",
};

export default function NorthstarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
