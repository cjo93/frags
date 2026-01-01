import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Frags Platform",
  description: "A scaffold for the Frags project with Next.js, Prisma, Auth.js, and Stripe.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
