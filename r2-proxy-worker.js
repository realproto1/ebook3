// Cloudflare Worker: R2 Public Proxy
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // Remove leading slash
    
    // R2 Bucket에서 파일 가져오기
    const object = await env.R2_BUCKET.get(key);
    
    if (!object) {
      return new Response('File not found', { status: 404 });
    }
    
    // 이미지 반환
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(object.body, { headers });
  }
};
