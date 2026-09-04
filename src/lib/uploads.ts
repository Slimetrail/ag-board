import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { PHOTO_MAX_DATA_URL_CHARS } from "@/lib/photo-limits";
import { jpegBufferFromDataUrl, putListingJpeg } from "@/lib/photo-upload";

export const uploadListingPhoto = createServerFn({ method: "POST" })
  .validator(
    z.object({
      dataUrl: z.string().min(80).max(PHOTO_MAX_DATA_URL_CHARS),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const buf = jpegBufferFromDataUrl(data.dataUrl);
    const { put } = await import("@vercel/blob");
    const url = await putListingJpeg(buf, (pathname, body, options) =>
      put(pathname, body, options),
    );
    return { path: url };
  });
