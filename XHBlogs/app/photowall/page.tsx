import { readCollection } from '../../lib/collections';
export const dynamic = 'force-dynamic';
import { siteConfig } from "../../siteConfig";
import PhotoWallClient from "./PhotoWallClient";

export const metadata = {
  title: "生活碎片 | " + siteConfig.title,
};

export default function PhotoWallPage() {
  return <PhotoWallClient {...readCollection('albums')} />;
}