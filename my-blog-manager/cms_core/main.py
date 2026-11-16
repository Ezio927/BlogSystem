"""Loopback-only authoring API for local recovery and private server sessions."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from cms_core import storage as store
from cms_core.api import config, picbed, drafts, moments, gallery, friends, projects, sync, media

app = FastAPI(title='Ezio Local CMS', version='1.0.0')
ORIGINS = ['http://127.0.0.1:3401', 'http://localhost:3401']
HOSTS = {'127.0.0.1:3402', 'localhost:3402'}
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_credentials=False, allow_methods=['GET', 'POST', 'OPTIONS'], allow_headers=['Content-Type'])


@app.middleware('http')
async def local_requests_only(request: Request, call_next):
    if request.headers.get('host') not in HOSTS:
        return JSONResponse({'success': False, 'message': '仅接受本地管理端 Host'}, status_code=403)
    origin = request.headers.get('origin')
    if origin and origin not in ORIGINS:
        return JSONResponse({'success': False, 'message': '拒绝跨站请求'}, status_code=403)
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and origin not in ORIGINS:
        return JSONResponse({'success': False, 'message': '写入请求必须来自本地管理端 Origin'}, status_code=403)
    if request.url.path == '/api/media/upload':
        length = request.headers.get('content-length', '')
        if length.isdigit() and int(length) > media.MAX_BYTES + 1024 * 1024:
            return JSONResponse({'success': False, 'message': 'Image exceeds 8 MB limit'}, status_code=413)
    if store.server_mode():
        path = request.url.path
        if path.startswith('/api/sync/') or path == '/api/drafts/sync_local':
            return JSONResponse({'success': False, 'message': '服务器模式直接发布内容，不支持本地同步或待处理队列'}, status_code=409)
        if any(path.startswith('/api/' + name + '/') for name in ('config', 'gallery', 'friends', 'projects')):
            return JSONResponse({'success': False, 'message': '网站配置由版本管理，修改后需要重新构建部署；此后台只直接发布内容'}, status_code=409)
    return await call_next(request)


@app.get('/api/status')
def status():
    return {'success': True, 'status': 'online', 'message': '服务器后台已连接' if store.server_mode() else '本地写作后台已连接'}


for name, module in [('config', config), ('picbed', picbed), ('media', media), ('drafts', drafts), ('moments', moments), ('gallery', gallery), ('friends', friends), ('projects', projects), ('sync', sync)]:
    app.include_router(module.router, prefix='/api/' + name)
