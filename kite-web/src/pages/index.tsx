import HomeCTASection from "@/components/home/HomeCTASection";
import HomeFAQSection from "@/components/home/HomeFAQSections";
import HomeFeaturesSection from "@/components/home/HomeFeaturesSection";
import HomeFlowSection from "@/components/home/HomeFlowSection";
import HomeFooter from "@/components/home/HomeFooter";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import HomeLayout from "@/components/home/HomeLayout";

export default function Home() {
  return (
    <HomeLayout>
      <HomeHeroSection />
      <HomeFeaturesSection />
      <HomeFlowSection />
      <HomeFAQSection />
      <HomeCTASection />
      <HomeFooter />
    </HomeLayout>
  );
}
