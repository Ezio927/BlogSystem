export type SiteSocialLink = {
  label: string;
  url: string;
};

export type SiteConfig = {
  name: string;
  description: string;
  author: string;
  avatar?: string;
  socials: SiteSocialLink[];
};