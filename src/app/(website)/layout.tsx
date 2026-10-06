import { Header } from "@/components/home/header";
import "../globals.css";
import { Footer } from "@/components/home/Footer";

export default function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
