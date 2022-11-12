import type { ContactInfo } from "./types";

export const SITE_TITLE = "Michał Bentkowski (@SecurityMB)";
export const SITE_DESCRIPTION = "Welcome to my website!";

export const FOOTER_CONTENT = `© ${new Date().getFullYear()} Michał Bentkowski. All rights reserved.`;

export const CONTACT_DATA: ContactInfo[] = [
  {
    icon: "mdi:email",
    href: "mailto:michal@bentkowski.info",
    text: "michal@bentkowski.info",
  },
  {
    icon: "mdi:twitter",
    href: "https://twitter.com/securitymb",
    text: "@SecurityMB",
  },
  {
    icon: "mdi:mastodon",
    href: "https://infosec.exchange/@securitymb",
    text: "@SecurityMB@infosec.exchange",
  },
  {
    icon: "mdi:discord",
    href: "https://discord.com/users/725985006287192064",
    text: "securityMB#8563",
  },
];
