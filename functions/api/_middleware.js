const API_SECURITY_HEADERS = {
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), publickey-credentials-get=(), usb=()',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-permitted-cross-domain-policies': 'none',
  'x-robots-tag': 'noindex, nofollow'
};

const jsonError = (message, status) => new Response(JSON.stringify({ error: message }), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export async function onRequest(context) {
  const length = Number(context.request.headers.get('content-length') || 0);
  const photoUpload=context.request.method==='POST'&&/^\/api\/admin\/player-photos(?:\/[a-zA-Z0-9-]+)?$/.test(new URL(context.request.url).pathname);
  let response;
  try {
    response = length > (photoUpload?5*1024*1024+16384:65536)
      ? jsonError('Request body is too large.', 413)
      : await context.next();
  } catch (error) {
    console.error(JSON.stringify({
      message: 'Unhandled UFL API error',
      path: new URL(context.request.url).pathname,
      // Exception messages can include upstream URLs or credentials. Never log them.
      error: 'request_failed'
    }));
    response = jsonError('The server could not complete this request.', 500);
  }

  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) secured.headers.set(name, value);
  if (!secured.headers.has('content-security-policy')) {
    secured.headers.set('content-security-policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; sandbox");
  }
  if (new URL(context.request.url).pathname.startsWith('/api/auth/')) {
    secured.headers.set('cache-control', 'private, no-store');
    secured.headers.set('pragma', 'no-cache');
  }
  return secured;
}
