export interface SocialLink {
  label: string;
  url: string;
}

export interface SiteConfig {
  title: string;
  description: string;
  url: string;
  language: string;
  author: {
    name: string;
    bio: string;
    avatar: string;
  };
  socialLinks: SocialLink[];
  features: {
    search: boolean;
    comments: boolean;
    analytics: boolean;
  };
}
