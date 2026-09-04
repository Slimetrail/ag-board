import { randomUUID } from "node:crypto";
import { PHOTO_MAX_BYTES, PHOTO_MAX_LABEL } from "./photo-limits.ts";

const JPEG_START = Buffer.from([0xff, 0xd8, 0xff]);

export const BLOB_TOKEN_MISSING =
  "Photo storage is not configured. Set BLOB_READ_WRITE_TOKEN for this environment.";

export function requireBlobReadWriteToken(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const token = env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error(BLOB_TOKEN_MISSING);
  }
  return token;
}

export function isJpeg(buf: Buffer) {
  return buf.length > 3 && buf.subarray(0, 3).equals(JPEG_START);
}

export function jpegBufferFromDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/jpeg;base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
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
  return buf;
}

export type BlobPut = (
  pathname: string,
  body: Buffer,
  options: { access: "public"; contentType: string; token: string },
) => Promise<{ url: string }>;

export async function putListingJpeg(
  buf: Buffer,
  put: BlobPut,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const token = requireBlobReadWriteToken(env);
  const pathname = `uploads/${randomUUID()}.jpg`;
  const blob = await put(pathname, buf, {
    access: "public",
    contentType: "image/jpeg",
    token,
  });
  if (!blob?.url) {
    throw new Error("Photo storage did not return a public URL.");
  }
  return blob.url;
}
