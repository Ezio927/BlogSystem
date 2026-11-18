import { readCollection } from '../../lib/collections';
export const dynamic = 'force-dynamic';
import AlbumEditor from './AlbumEditor';
export default function PhotoWallPage() {return <AlbumEditor {...readCollection('albums')} />;}
