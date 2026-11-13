import { NextResponse, type NextRequest } from 'next/server';

// The console is a local authoring tool, including its few Next API handlers.
export function proxy(request: NextRequest) {
  const host = request.headers.get('host');
  const origin = request.headers.get('origin');
  if (!host || !['127.0.0.1:3401', 'localhost:3401'].includes(host)
    || (origin && !['http://127.0.0.1:3401', 'http://localhost:3401'].includes(origin))
    || (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !origin)) {
    return NextResponse.json({ success: false, message: '仅接受本地控制台请求' }, { status: 403 });
  }
  return NextResponse.next();
}
