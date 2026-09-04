import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertJpegUnderCap,
  assertPhotoFile,
  dataUrlByteLength,
  nextJpegSettings,
  photoUserError,
  pickDecodeResize,
} from "./image-file.ts";
import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_LABEL,
  PHOTO_MIN_EDGE,
  PHOTO_SOURCE_MAX_BYTES,
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

describe("pickDecodeResize", () => {
  it("caps the long edge so gallery shots are not decoded at full size", () => {
    assert.deepEqual(pickDecodeResize(4032, 3024, 2048), { resizeWidth: 2048 });
    assert.deepEqual(pickDecodeResize(3024, 4032, 2048), { resizeHeight: 2048 });
  });
});

describe("photoUserError", () => {
  it("does not send a 401 upload failure to the login screen", () => {
    assert.match(
      photoUserError(new Error("Unauthorized")),
      /still signed in/i,
    );
  });
});

describe("assertJpegUnderCap", () => {
  it("rejects a data URL over the 3 MB cap", () => {
    const over = `data:image/jpeg;base64,${"A".repeat(4_200_000)}`;
    assert.throws(() => assertJpegUnderCap(over), /3 MB/);
  });
});

describe("assertPhotoFile", () => {
  it("rejects an empty file before the adjust step", () => {
    assert.throws(() => assertPhotoFile(new File(["x"], "empty.jpg")), /empty/i);
  });

  it("rejects a non-image type", () => {
    const file = new File([new Uint8Array(64)], "notes.txt", { type: "text/plain" });
    assert.throws(() => assertPhotoFile(file), /not a photo/i);
  });

  it("rejects a source file over the memory guard", () => {
    const file = new File(["ok"], "huge.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: PHOTO_SOURCE_MAX_BYTES + 1 });
    assert.throws(() => assertPhotoFile(file), /too large/i);
  });
});

describe("framed JPEG encode", () => {
  it("crops then uses the same 3 MB compression loop", async () => {
    const source = await readFile(join(process.cwd(), "src/lib/image-file.ts"), "utf8");
    assert.match(source, /export async function fileToFramedJpegDataUrl/);
    assert.match(source, /jpegUnderCap/);
    assert.match(source, /PHOTO_MAX_BYTES/);
    assert.match(source, /cropRect/);
    assert.match(source, /photoFrameDrawCommands/);
    assert.match(source, /PHOTO_FRAME_MATTE/);
  });
});
