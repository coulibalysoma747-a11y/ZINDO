import { createServer } from "node:net";

/** Trouve un port TCP libre sur 127.0.0.1 pour le serveur Next.js embarqué. */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Impossible de déterminer un port libre")));
      }
    });
  });
}
