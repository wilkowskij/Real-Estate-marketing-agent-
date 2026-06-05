/**
 * Lightweight HTTP server that mimics the Meta Graph API endpoints the app
 * calls during the Facebook/Instagram OAuth flow. Start it before the Next.js
 * dev server so META_GRAPH_API_URL can point at http://localhost:9999.
 */
import http from "http";

export const META_MOCK_PORT = 9999;

let _server: http.Server | null = null;

export function startMetaMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    _server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${META_MOCK_PORT}`);

      // Token exchange & fb_exchange_token refresh
      if (url.pathname.endsWith("/oauth/access_token")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            access_token: "mock-meta-access-token",
            token_type: "bearer",
            expires_in: 5183944,
          })
        );
        return;
      }

      // Managed Pages list — includes instagram_business_account so both
      // facebook and instagram callback paths resolve correctly.
      if (url.pathname.endsWith("/me/accounts")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            data: [
              {
                id: "page-123",
                name: "Test Realty Page",
                access_token: "mock-page-access-token",
                instagram_business_account: { id: "ig-456" },
              },
            ],
          })
        );
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Not found", type: "GraphMethodException" } }));
    });

    _server.on("error", reject);
    _server.listen(META_MOCK_PORT, () => resolve());
  });
}

export function stopMetaMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!_server) { resolve(); return; }
    _server.close((err) => (err ? reject(err) : resolve()));
    _server = null;
  });
}
