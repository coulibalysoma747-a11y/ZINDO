import sharp from "sharp";
import { VIGNETTE_SOURCE, VIGNETTE_WIDTHS } from "@/lib/vignette";

export const runtime = "nodejs";

// Au-delà, on ne tente pas de réduire : le navigateur reçoit l'original.
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

/**
 * Version réduite (WebP) d'une photo de nos espaces Supabase. La réponse est gardée
 * un an en cache (navigateur et réseau Vercel) : chaque vignette n'est calculée
 * qu'une fois. En cas d'échec, redirection vers l'original pour ne jamais casser l'image.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get("u") ?? "";
  const width = Number(params.get("w"));

  if (!VIGNETTE_SOURCE.test(source) || !(VIGNETTE_WIDTHS as readonly number[]).includes(width)) {
    return new Response("Adresse non autorisée", { status: 400 });
  }

  try {
    const original = await fetch(source, { signal: AbortSignal.timeout(20000) });
    if (!original.ok) return new Response("Image introuvable", { status: original.status === 404 ? 404 : 502 });
    const size = Number(original.headers.get("content-length") ?? 0);
    if (size > MAX_SOURCE_BYTES) return Response.redirect(source, 302);

    const output = await sharp(Buffer.from(await original.arrayBuffer()), { failOn: "none" })
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return Response.redirect(source, 302);
  }
}
