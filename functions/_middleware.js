export async function onRequest(context) {
  const response = await context.next();

  // Add headers for MediaPipe WebAssembly support
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self)');

  return response;
}
