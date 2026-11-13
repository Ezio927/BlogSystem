export async function POST() {
  return Response.json({ error: '此功能尚未启用' }, { status: 404 });
}
