export async function GET() {
  return Response.json({ error: '音乐功能已关闭' }, { status: 404 });
}
