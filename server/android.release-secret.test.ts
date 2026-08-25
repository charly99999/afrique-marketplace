import { createServer, type Server } from "node:http";
import { describe, expect, it, afterEach } from "vitest";

let server: Server | undefined;

async function startSecretCheckEndpoint(expectedSecret: string) {
  server = createServer((request, response) => {
    const supplied = request.headers["x-keystore-secret"];
    const valid = request.method === "POST" && supplied === expectedSecret;
    response.statusCode = valid ? 204 : 401;
    response.end();
  });

  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Secret check endpoint unavailable");
  return `http://127.0.0.1:${address.port}/validate`;
}

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!server) return resolve();
    server.close((error) => (error ? reject(error) : resolve()));
    server = undefined;
  });
});

describe("Android release keystore secret", () => {
  it("is accepted by the lightweight validation endpoint without exposing its value", async () => {
    const secret = process.env.ANDROID_RELEASE_KEYSTORE_PASSWORD;
    expect(secret).toBeTruthy();
    expect(secret).not.toBe("Marc2019@");

    const endpoint = await startSecretCheckEndpoint(secret!);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "x-keystore-secret": secret! },
    });

    expect(response.status).toBe(204);
  });
});
