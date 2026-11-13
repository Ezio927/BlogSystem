/** Local pet replies only; never reads provider credentials or calls an AI service. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message : '';
  return Response.json({ reply: message.includes('鱼') ? '谢谢小鱼干，喵～今天也要记得休息！' : '喵～我现在只陪伴，不连接 AI 服务。' });
}
