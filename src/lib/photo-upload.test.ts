import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BLOB_TOKEN_MISSING,
  jpegBufferFromDataUrl,
  putListingJpeg,
  requireBlobReadWriteToken,
} from "./photo-upload.ts";
import { PHOTO_MAX_BYTES } from "./photo-limits.ts";

function jpegDataUrl(bytes: Buffer) {
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

function fakeJpeg(length: number) {
  const buf = Buffer.alloc(length, 0x11);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return buf;
}

describe("requireBlobReadWriteToken", () => {
  it("throws a clear error when BLOB_READ_WRITE_TOKEN is missing", () => {
    assert.throws(() => requireBlobReadWriteToken({}), {
      message: BLOB_TOKEN_MISSING,
    });
    assert.throws(() => requireBlobReadWriteToken({ BLOB_READ_WRITE_TOKEN: "   " }), {
      message: BLOB_TOKEN_MISSING,
    });
  });

  it("returns the configured token", () => {
    assert.equal(
      requireBlobReadWriteToken({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test" }),
      "vercel_blob_rw_test",
    );
  });
});

describe("jpegBufferFromDataUrl", () => {
  it("accepts a JPEG under the 3 MB cap", () => {
    const buf = fakeJpeg(120);
    assert.deepEqual(jpegBufferFromDataUrl(jpegDataUrl(buf)), buf);
  });

  it("rejects a non-JPEG data URL", () => {
    assert.throws(
      () => jpegBufferFromDataUrl("data:image/png;base64,iVBORw0KGgo="),
      { message: "That photo needs to be a JPEG." },
    );
  });

  it("rejects a JPEG over PHOTO_MAX_BYTES", () => {
    const buf = fakeJpeg(PHOTO_MAX_BYTES + 1);
    assert.throws(() => jpegBufferFromDataUrl(jpegDataUrl(buf)), {
      message: "Keep the photo under 3 MB.",
    });
  });
});

describe("putListingJpeg", () => {
  it("uploads with public access and returns the blob URL", async () => {
    const buf = fakeJpeg(120);
    const blobUrl =
      "https://abc123xyz.public.blob.vercel-storage.com/uploads/photo.jpg";
    let called = 0;
    const url = await putListingJpeg(
      buf,
      async (pathname, body, options) => {
        called += 1;
        assert.match(pathname, /^uploads\/[a-z0-9-]+\.jpg$/i);
        assert.equal(body, buf);
        assert.equal(options.access, "public");
        assert.equal(options.contentType, "image/jpeg");
        assert.equal(options.token, "vercel_blob_rw_test");
        return { url: blobUrl };
      },
      { BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test" },
    );
    assert.equal(called, 1);
    assert.equal(url, blobUrl);
  });

  it("fails before put when the blob token is missing", async () => {
    let called = 0;
    await assert.rejects(
      () =>
        putListingJpeg(fakeJpeg(120), async () => {
          called += 1;
          return { url: "https://example.com/nope.jpg" };
        }, {}),
      { message: BLOB_TOKEN_MISSING },
    );
    assert.equal(called, 0);
  });
});

describe("upload handler source", () => {
  it("does not write photos under public/uploads", async () => {
    const source = await readFile(join(process.cwd(), "src/lib/uploads.ts"), "utf8");
    assert.equal(source.includes("mkdir"), false);
    assert.equal(source.includes("writeFile"), false);
    assert.equal(source.includes("public/uploads"), false);
    assert.match(source, /@vercel\/blob/);
    assert.match(source, /putListingJpeg/);
  });
});
