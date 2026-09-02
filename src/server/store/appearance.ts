import "server-only";

export interface WebsiteAppearance {
  announcementText: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImage: string;
  editorialEyebrow: string;
  editorialTitle: string;
  editorialDescription: string;
  editorialImage: string;
  storyTitle: string;
  storyDescription: string;
  storyImage: string;
  whatsappNumber: string;
}

export const defaultAppearance: WebsiteAppearance = {
  announcementText: "COMPLIMENTARY SHIPPING ON ORDERS OVER IDR 500.000",
  heroEyebrow: "THE FIRST EDIT",
  heroTitle: "LOOMS\nPremium Hijab Collection",
  heroDescription: "Everyday pieces, thoughtfully composed—made for the beauty of an unhurried morning and the life that follows.",
  heroImage: "/images/editorial-sand.svg",
  editorialEyebrow: "THE NEW ARRIVALS",
  editorialTitle: "A softer kind of presence.",
  editorialDescription: "Ease into a collection shaped by precise drape, rich tonal stories, and the luxury of quiet detail.",
  editorialImage: "/images/editorial-teal.svg",
  storyTitle: "Made for the spaces between.",
  storyDescription: "We design for the small rituals that bring a day into focus: the first fold, a familiar tone, the feeling of being wholly yourself.",
  storyImage: "/images/editorial-mocha.svg",
  whatsappNumber: "6281558066629",
};

export let currentAppearance: WebsiteAppearance = { ...defaultAppearance };

export function getWebsiteAppearance(): WebsiteAppearance {
  return currentAppearance;
}

export function updateWebsiteAppearance(updates: Partial<WebsiteAppearance>): WebsiteAppearance {
  currentAppearance = {
    ...currentAppearance,
    ...updates,
  };
  return currentAppearance;
}
