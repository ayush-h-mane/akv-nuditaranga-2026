import React from "react";
import { HeroSection } from "../sections/HeroSection";
import { KarunadaVaibhavaSchedule } from "../components/KarunadaVaibhavaSchedule";
import { AboutSection } from "../sections/AboutSection";
import { ActivitiesSection } from "../sections/ActivitiesSection";
import { NuditarangaHero } from "../sections/NuditarangaHero";
import { StatsSection } from "../sections/StatsSection";
import { GallerySection } from "../sections/GallerySection";
import { InstagramSection } from "../sections/InstagramSection";
import { ContactSection } from "../sections/ContactSection";

export const HomePage = ({ setCurrentView, setSelectedEventId, onOpenAuthTab }) => {
  const handleRegisterFromHome = (eventId = null) => {
    if (eventId) {
      setSelectedEventId(eventId);
    }
    setCurrentView("register");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExploreNuditaranga = () => {
    const el = document.getElementById("schedule");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      setCurrentView("events");
    }
  };

  const handleKnowAbout = () => {
    const el = document.getElementById("about");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div>
      <HeroSection
        onExploreNuditaranga={handleExploreNuditaranga}
        onKnowAbout={handleKnowAbout}
        onOpenAuthTab={onOpenAuthTab}
        setCurrentView={setCurrentView}
      />
      <KarunadaVaibhavaSchedule
        onRegisterClick={() => handleRegisterFromHome(null)}
      />
      <AboutSection />
      <ActivitiesSection />
      <NuditarangaHero
        onRegister={() => handleRegisterFromHome(null)}
        onViewEvents={() => {
          setCurrentView("events");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
      <StatsSection />
      <GallerySection />
      <InstagramSection />
      <ContactSection />
    </div>
  );
};
