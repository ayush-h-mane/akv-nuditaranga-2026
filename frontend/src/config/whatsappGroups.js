export const EVENT_WHATSAPP_GROUPS = [
  {
    id: "reel",
    name: "Reel Contest",
    nameKn: "ರೀಲ್ ಸ್ಪರ್ಧೆ (Reel Contest)",
    keywords: ["reel", "ರೀಲ್"],
    url: "https://chat.whatsapp.com/JEIe0uiycfLA0W6XJdXOYX"
  },
  {
    id: "sketching",
    name: "Sketching Competition",
    nameKn: "ಸ್ಕೆಚಿಂಗ್ ಸ್ಪರ್ಧೆ (Sketching)",
    keywords: ["sketch", "ಸ್ಕೆಚ್"],
    url: "https://chat.whatsapp.com/Fkyq9hxU0tIJAJ0TTB7BvY"
  },
  {
    id: "painting",
    name: "Painting Competition",
    nameKn: "ಚಿತ್ರಕಲೆ ಸ್ಪರ್ಧೆ (Painting)",
    keywords: ["paint", "ಚಿತ್ರಕಲೆ", "ವರ್ಣಚಿತ್ರ"],
    url: "https://chat.whatsapp.com/D1wYhxvh7e8L1Ex8G05Y3t"
  },
  {
    id: "rangoli",
    name: "Rangoli Competition",
    nameKn: "ರಂಗೋಲಿ ಸ್ಪರ್ಧೆ (Rangoli)",
    keywords: ["rangoli", "ರಂಗೋಲಿ"],
    url: "https://chat.whatsapp.com/HSAcv8Rappx6bEe86ukKfM"
  },
  {
    id: "mehendi",
    name: "Mehendi Competition",
    nameKn: "ಮೆಹಂದಿ ಸ್ಪರ್ಧೆ (Mehendi)",
    keywords: ["mehendi", "mehndi", "ಮೆಹಂದಿ"],
    url: "https://chat.whatsapp.com/FnkpKWdMI7k5W80AMQg3GS"
  }
];

/**
 * Returns the matching WhatsApp group config for an event, registration, or title string.
 */
export const getEventWhatsAppGroup = (target) => {
  if (!target) return null;

  // Direct explicit URL support if present on object
  if (typeof target === "object") {
    if (target.whatsapp_group_url) {
      return {
        id: "custom",
        name: target.title_en || target.title || "Event WhatsApp Group",
        nameKn: target.title_kn || "ಸ್ಪರ್ಧೆಯ ವಾಟ್ಸಾಪ್ ಗ್ರೂಪ್",
        url: target.whatsapp_group_url
      };
    }
    if (target.whatsapp_link) {
      return {
        id: "custom",
        name: target.title_en || target.title || "Event WhatsApp Group",
        nameKn: target.title_kn || "ಸ್ಪರ್ಧೆಯ ವಾಟ್ಸಾಪ್ ಗ್ರೂಪ್",
        url: target.whatsapp_link
      };
    }
  }

  const searchCorpus = (
    typeof target === "object"
      ? [
          target.id,
          target.event_id,
          target.title_en,
          target.title_kn,
          target.title,
          target.name,
          target.event?.id,
          target.event?.title_en,
          target.event?.title_kn,
          target.event?.title
        ]
          .filter(Boolean)
          .join(" ")
      : String(target)
  ).toLowerCase();

  for (const group of EVENT_WHATSAPP_GROUPS) {
    if (group.keywords.some((kw) => searchCorpus.includes(kw.toLowerCase()))) {
      return group;
    }
  }

  return null;
};
