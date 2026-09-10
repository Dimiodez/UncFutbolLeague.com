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
  if (length > 65536) return jsonError('Request body is too large.', 413);

  let response;
  try {
    response = await context.next();
  } catch (error) {
    console.error(JSON.stringify({
      message: 'Unhandled UFL API error',
      path: new URL(context.request.url).pathname,
      error: error instanceof Error ? error.message : String(error)
    }));
    response = jsonError('The server could not complete this request.', 500);
  }

  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) secured.headers.set(name, value);
  return secured;
}
