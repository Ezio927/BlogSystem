/** Local pet replies only; never reads provider credentials or calls an AI service. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message : '';
  return Response.json({ reply: message.includes('鱼') ? '啊呜，谢谢小鱼！尾巴都开心起来啦～' : '小鲸鱼在这里陪你写作～' });
}
