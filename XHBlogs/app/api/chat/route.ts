import 'server-only';
import { createChatHandler } from '../../../lib/server/companionChat.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handleChat = createChatHandler();
export async function POST(request: Request) { return handleChat(request); }
