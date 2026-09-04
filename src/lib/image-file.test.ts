import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dataUrlByteLength, nextJpegSettings } from "./image-file.ts";
import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_LABEL,
  PHOTO_MIN_EDGE,
} from "./photo-limits.ts";

describe("photo size cap", () => {
  it("is a clear 3 MB upload limit", () => {
    assert.equal(PHOTO_MAX_BYTES, 3 * 1024 * 1024);
    assert.equal(PHOTO_MAX_LABEL, "3 MB");
  });
});

describe("dataUrlByteLength", () => {
  it("decodes a padded base64 payload", () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const dataUrl = `data:image/jpeg;base64,${bytes.toString("base64")}`;
    assert.equal(dataUrlByteLength(dataUrl), 4);
  });

  it("ignores whitespace in the payload", () => {
    assert.equal(dataUrlByteLength("data:image/jpeg;base64,QQ=="), 1);
    assert.equal(dataUrlByteLength("data:image/jpeg;base64,Q Q =\n="), 1);
  });
});

describe("nextJpegSettings", () => {
  it("drops quality before shrinking the edge", () => {
    assert.deepEqual(nextJpegSettings(2048, 0.84), { edge: 2048, quality: 0.72 });
    assert.deepEqual(nextJpegSettings(2048, 0.72), { edge: 2048, quality: 0.6 });
  });

  it("then shrinks the edge and restores mid quality", () => {
    assert.deepEqual(nextJpegSettings(2048, 0.6), { edge: 1536, quality: 0.72 });
  });

  it("stops at the minimum edge", () => {
    assert.deepEqual(nextJpegSettings(PHOTO_MIN_EDGE, 0.84), {
      edge: PHOTO_MIN_EDGE,
      quality: 0.72,
    });
    assert.equal(nextJpegSettings(PHOTO_MIN_EDGE, 0.55), null);
  });
});
