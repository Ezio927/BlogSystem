import { siteConfig } from "../../../../config/site.config";

export default function AboutPage() {
  return (
    <article className="prose">
      <h1>关于 {siteConfig.author.name}</h1>
      <p>{siteConfig.author.bio}</p>
    </article>
  );
}
