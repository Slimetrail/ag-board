import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { PHOTO_MAX_BYTES, PHOTO_MAX_DATA_URL_CHARS, PHOTO_MAX_LABEL } from "@/lib/photo-limits";

const JPEG_START = Buffer.from([0xff, 0xd8, 0xff]);

function isJpeg(buf: Buffer) {
  return buf.length > 3 && buf.subarray(0, 3).equals(JPEG_START);
}

export const uploadListingPhoto = createServerFn({ method: "POST" })
  .validator(
    z.object({
      dataUrl: z.string().min(80).max(PHOTO_MAX_DATA_URL_CHARS),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const match = /^data:image\/jpeg;base64,([a-z0-9+/=\s]+)$/i.exec(data.dataUrl);
    if (!match) {
      throw new Error("That photo needs to be a JPEG.");
    }
    const buf = Buffer.from(match[1].replace(/\s/g, ""), "base64");
    if (buf.length < 80 || buf.length > PHOTO_MAX_BYTES) {
      throw new Error(`Keep the photo under ${PHOTO_MAX_LABEL}.`);
    }
    if (!isJpeg(buf)) {
      throw new Error("That file is not a JPEG photo.");
    }
    const name = `${randomUUID()}.jpg`;
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), buf);
    return { path: `/uploads/${name}` };
  });
