import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isUserUploadPath, USER_IMAGE_PATH_MAX } from "./upload-path.ts";

const LEGACY = "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg";
const BLOB =
  "https://abc123xyz.public.blob.vercel-storage.com/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg";

describe("isUserUploadPath", () => {
  it("keeps leftover /uploads/ JPEG paths", () => {
    assert.equal(isUserUploadPath(LEGACY), true);
  });

  it("accepts a public Vercel Blob JPEG URL", () => {
    assert.equal(isUserUploadPath(BLOB), true);
    assert.ok(BLOB.length <= USER_IMAGE_PATH_MAX);
  });

  it("rejects stock library paths and other hosts", () => {
    assert.equal(isUserUploadPath("/images/goats.jpg"), false);
    assert.equal(isUserUploadPath("/uploads/not-a-photo.png"), false);
    assert.equal(isUserUploadPath("https://example.com/photo.jpg"), false);
    assert.equal(isUserUploadPath("http://abc.public.blob.vercel-storage.com/x.jpg"), false);
    assert.equal(
      isUserUploadPath(
        "https://abc123xyz.public.blob.vercel-storage.com/uploads/secret.pdf",
      ),
      false,
    );
  });
});
