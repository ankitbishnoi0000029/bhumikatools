import { Header } from "@/components/home/header";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PageInformationSection } from "@/components/seo/page-information-section";
import { PageFaqSection } from "@/components/seo/page-faq-section";
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
      <Breadcrumbs />
      {children}
      <PageInformationSection />
      <PageFaqSection />
      <Footer />
    </>
  );
}
