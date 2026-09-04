import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PHOTO_FRAME_ASPECT,
  PHOTO_FRAME_COVER_ZOOM,
  PHOTO_FRAME_MATTE,
  PHOTO_FRAME_MAX_ZOOM,
  clampPhotoFrame,
  containSize,
  coverSize,
  cropExtendsOutside,
  cropRect,
  defaultPhotoFrame,
  integerCrop,
  minPhotoZoom,
  panPhotoFrame,
  photoFrameDrawCommands,
  photoFrameImageStyle,
  zoomPhotoFrame,
} from "./photo-frame.ts";

describe("photo frame aspects", () => {
  it("matches the listing card 4/3 cover and a square avatar", () => {
    assert.equal(PHOTO_FRAME_ASPECT.listing, 4 / 3);
    assert.equal(PHOTO_FRAME_ASPECT.avatar, 1);
  });
});

describe("coverSize", () => {
  it("uses the full image when the aspect already matches", () => {
    assert.deepEqual(coverSize(4000, 3000, 4 / 3), { width: 4000, height: 3000 });
    assert.deepEqual(coverSize(1200, 1200, 1), { width: 1200, height: 1200 });
  });

  it("crops the long side of a tall portrait for a 4/3 listing frame", () => {
    assert.deepEqual(coverSize(3000, 4000, 4 / 3), { width: 3000, height: 2250 });
  });

  it("crops the wide side of a landscape for a square avatar", () => {
    assert.deepEqual(coverSize(4000, 3000, 1), { width: 3000, height: 3000 });
  });
});

describe("containSize", () => {
  it("matches cover when the aspect already matches", () => {
    assert.deepEqual(containSize(4000, 3000, 4 / 3), { width: 4000, height: 3000 });
    assert.deepEqual(containSize(1200, 1200, 1), { width: 1200, height: 1200 });
  });

  it("adds width so a tall portrait fits a 4/3 listing frame", () => {
    assert.deepEqual(containSize(3000, 4000, 4 / 3), {
      width: 4000 * (4 / 3),
      height: 4000,
    });
  });

  it("adds height so a landscape fits a square avatar", () => {
    assert.deepEqual(containSize(4000, 3000, 1), { width: 4000, height: 4000 });
  });
});

describe("minPhotoZoom", () => {
  it("is cover-fit when the image already matches the frame", () => {
    assert.equal(minPhotoZoom(4000, 3000, 4 / 3), PHOTO_FRAME_COVER_ZOOM);
    assert.equal(minPhotoZoom(1200, 1200, 1), PHOTO_FRAME_COVER_ZOOM);
  });

  it("is cover/contain so a portrait can zoom out inside a 4/3 listing frame", () => {
    assert.equal(minPhotoZoom(3000, 4000, 4 / 3), 3000 / (4000 * (4 / 3)));
  });

  it("is cover/contain so a landscape can zoom out inside a square avatar", () => {
    assert.equal(minPhotoZoom(4000, 3000, 1), 3000 / 4000);
  });
});

describe("clampPhotoFrame", () => {
  it("starts centered at cover-fit", () => {
    const frame = clampPhotoFrame(4000, 3000, 4 / 3, defaultPhotoFrame());
    assert.deepEqual(frame, { cx: 0.5, cy: 0.5, zoom: 1 });
  });

  it("cannot pan at zoom 1 when the image already matches the frame", () => {
    const panned = panPhotoFrame(4000, 3000, 4 / 3, defaultPhotoFrame(), 0.4, 0.4);
    assert.equal(panned.cx, 0.5);
    assert.equal(panned.cy, 0.5);
    assert.equal(panned.zoom, 1);
  });

  it("keeps the crop inside a tall image at cover-fit", () => {
    const frame = clampPhotoFrame(3000, 4000, 4 / 3, { cx: 0, cy: 0, zoom: 1 });
    const crop = cropRect(3000, 4000, 4 / 3, frame);
    assert.ok(crop.x >= -1e-6);
    assert.ok(crop.y >= -1e-6);
    assert.ok(crop.x + crop.width <= 3000 + 1e-6);
    assert.ok(crop.y + crop.height <= 4000 + 1e-6);
    assert.equal(crop.width, 3000);
    assert.equal(crop.height, 2250);
  });

  it("caps zoom and recenters when the crop would leave the image", () => {
    const frame = clampPhotoFrame(800, 600, 4 / 3, {
      cx: 0,
      cy: 1,
      zoom: 99,
    });
    assert.equal(frame.zoom, PHOTO_FRAME_MAX_ZOOM);
    const crop = cropRect(800, 600, 4 / 3, frame);
    assert.ok(crop.x >= -1e-6);
    assert.ok(crop.y >= -1e-6);
    assert.ok(crop.x + crop.width <= 800 + 1e-6);
    assert.ok(crop.y + crop.height <= 600 + 1e-6);
  });

  it("allows contain zoom and keeps a portrait fully visible in a 4/3 frame", () => {
    const minZoom = minPhotoZoom(3000, 4000, 4 / 3);
    const frame = clampPhotoFrame(3000, 4000, 4 / 3, {
      cx: 0.5,
      cy: 0.5,
      zoom: 0.01,
    });
    assert.equal(frame.zoom, minZoom);
    const crop = cropRect(3000, 4000, 4 / 3, frame);
    assert.ok(crop.x <= 1e-6);
    assert.ok(crop.y <= 1e-6);
    assert.ok(crop.x + crop.width >= 3000 - 1e-6);
    assert.ok(crop.y + crop.height >= 4000 - 1e-6);
    assert.ok(cropExtendsOutside(3000, 4000, crop));
  });
});

describe("zoomPhotoFrame", () => {
  it("keeps the image point under the origin fixed", () => {
    const start = clampPhotoFrame(4000, 3000, 4 / 3, { cx: 0.5, cy: 0.5, zoom: 1 });
    const origin = { x: 0.25, y: 0.4 };
    const before = cropRect(4000, 3000, 4 / 3, start);
    const ix = before.x + origin.x * before.width;
    const iy = before.y + origin.y * before.height;
    const zoomed = zoomPhotoFrame(4000, 3000, 4 / 3, start, 2, origin);
    const after = cropRect(4000, 3000, 4 / 3, zoomed);
    assert.equal(zoomed.zoom, 2);
    assert.ok(Math.abs(after.x + origin.x * after.width - ix) < 1e-6);
    assert.ok(Math.abs(after.y + origin.y * after.height - iy) < 1e-6);
  });

  it("will not zoom below contain-fit", () => {
    const minZoom = minPhotoZoom(3000, 4000, 4 / 3);
    const zoomed = zoomPhotoFrame(3000, 4000, 4 / 3, defaultPhotoFrame(), 0.01);
    assert.equal(zoomed.zoom, minZoom);
    assert.ok(zoomed.zoom < PHOTO_FRAME_COVER_ZOOM);
  });

  it("can zoom out from cover to contain on a landscape avatar", () => {
    const zoomed = zoomPhotoFrame(4000, 3000, 1, defaultPhotoFrame(), 0.2);
    assert.equal(zoomed.zoom, minPhotoZoom(4000, 3000, 1));
    const crop = cropRect(4000, 3000, 1, zoomed);
    assert.ok(crop.x <= 1e-6);
    assert.ok(crop.x + crop.width >= 4000 - 1e-6);
    assert.ok(crop.y <= 1e-6);
    assert.ok(crop.y + crop.height >= 3000 - 1e-6);
  });
});

describe("panPhotoFrame", () => {
  it("moves the crop opposite the drag so the image follows the finger", () => {
    const start = clampPhotoFrame(4000, 3000, 4 / 3, { cx: 0.5, cy: 0.5, zoom: 2 });
    const right = panPhotoFrame(4000, 3000, 4 / 3, start, 0.1, 0);
    assert.ok(right.cx < start.cx);
    const down = panPhotoFrame(4000, 3000, 4 / 3, start, 0, 0.1);
    assert.ok(down.cy < start.cy);
  });

  it("lets a contained portrait slide horizontally in a 4/3 frame", () => {
    const start = clampPhotoFrame(3000, 4000, 4 / 3, {
      cx: 0.5,
      cy: 0.5,
      zoom: minPhotoZoom(3000, 4000, 4 / 3),
    });
    const right = panPhotoFrame(3000, 4000, 4 / 3, start, 0.2, 0);
    assert.ok(right.cx < start.cx);
    const crop = cropRect(3000, 4000, 4 / 3, right);
    assert.ok(crop.x <= 1e-6);
    assert.ok(crop.x + crop.width >= 3000 - 1e-6);
    const down = panPhotoFrame(3000, 4000, 4 / 3, start, 0, 0.2);
    assert.equal(down.cy, 0.5);
  });

  it("lets a contained landscape slide vertically in a square avatar", () => {
    const start = clampPhotoFrame(4000, 3000, 1, {
      cx: 0.5,
      cy: 0.5,
      zoom: minPhotoZoom(4000, 3000, 1),
    });
    const down = panPhotoFrame(4000, 3000, 1, start, 0, 0.2);
    assert.ok(down.cy < start.cy);
    const crop = cropRect(4000, 3000, 1, down);
    assert.ok(crop.y <= 1e-6);
    assert.ok(crop.y + crop.height >= 3000 - 1e-6);
    const right = panPhotoFrame(4000, 3000, 1, start, 0.2, 0);
    assert.equal(right.cx, 0.5);
  });
});

describe("integerCrop", () => {
  it("stays inside the bitmap after rounding", () => {
    const crop = integerCrop(100, 80, { x: -0.4, y: 79.6, width: 50.2, height: 20.4 });
    assert.ok(crop.x >= 0);
    assert.ok(crop.y >= 0);
    assert.ok(crop.x + crop.width <= 100);
    assert.ok(crop.y + crop.height <= 80);
    assert.ok(crop.width >= 1);
    assert.ok(crop.height >= 1);
  });
});

describe("photoFrameDrawCommands", () => {
  it("fills the canvas when the crop is inside the bitmap", () => {
    const crop = { x: 500, y: 250, width: 2000, height: 1500 };
    const draw = photoFrameDrawCommands(4000, 3000, crop, 400, 300);
    assert.equal(draw.needsMatte, false);
    assert.equal(draw.sx, 500);
    assert.equal(draw.sy, 250);
    assert.equal(draw.sw, 2000);
    assert.equal(draw.sh, 1500);
    assert.equal(draw.dx, 0);
    assert.equal(draw.dy, 0);
    assert.equal(draw.dw, 400);
    assert.equal(draw.dh, 300);
  });

  it("insets a contained portrait so letterbox is left and right", () => {
    const crop = cropRect(3000, 4000, 4 / 3, {
      cx: 0.5,
      cy: 0.5,
      zoom: minPhotoZoom(3000, 4000, 4 / 3),
    });
    const draw = photoFrameDrawCommands(3000, 4000, crop, 800, 600);
    assert.equal(draw.needsMatte, true);
    assert.ok(draw.dx > 0);
    assert.ok(draw.dx + draw.dw < 800);
    assert.ok(Math.abs(draw.dy) < 1e-6);
    assert.ok(Math.abs(draw.dh - 600) < 1e-6);
    assert.equal(draw.sx, 0);
    assert.equal(draw.sy, 0);
    assert.equal(draw.sw, 3000);
    assert.equal(draw.sh, 4000);
  });
});

describe("photoFrameImageStyle", () => {
  it("places the image so the crop fills the viewport", () => {
    const crop = { x: 500, y: 250, width: 2000, height: 1500 };
    assert.deepEqual(photoFrameImageStyle(crop, 4000, 3000), {
      width: "200%",
      height: "200%",
      left: "-25%",
      top: `${(-250 / 1500) * 100}%`,
    });
  });

  it("shrinks a contained portrait so the whole photo sits in the frame", () => {
    const crop = cropRect(3000, 4000, 4 / 3, {
      cx: 0.5,
      cy: 0.5,
      zoom: minPhotoZoom(3000, 4000, 4 / 3),
    });
    const style = photoFrameImageStyle(crop, 3000, 4000);
    const widthPct = Number.parseFloat(style.width);
    const heightPct = Number.parseFloat(style.height);
    assert.ok(widthPct < 100);
    assert.ok(Math.abs(heightPct - 100) < 1e-6);
    assert.ok(Number.parseFloat(style.left) > 0);
  });
});

describe("photo picker wires the adjust step before upload", () => {
  it("opens the frame adjuster and encodes the crop before blob upload", async () => {
    const source = await readFile(
      join(process.cwd(), "src/components/photo-picker.tsx"),
      "utf8",
    );
    assert.match(source, /PhotoFrameAdjuster/);
    assert.match(source, /fileToFramedJpegDataUrl/);
    assert.match(source, /uploadListingPhoto/);
    assert.match(source, /assertJpegUnderCap/);
    assert.equal(source.includes("fileToJpegDataUrl("), false);
  });

  it("uses the same picker for listing and profile photos", async () => {
    const profile = await readFile(
      join(process.cwd(), "src/routes/profile.tsx"),
      "utf8",
    );
    const picker = await readFile(
      join(process.cwd(), "src/components/listing-photo-editor.tsx"),
      "utf8",
    );
    assert.match(profile, /PhotoUploadButton/);
    assert.match(profile, /frame="avatar"/);
    assert.match(picker, /PhotoPicker/);
  });

  it("lets the adjuster zoom out to contain, not only cover", async () => {
    const source = await readFile(
      join(process.cwd(), "src/components/photo-frame-adjuster.tsx"),
      "utf8",
    );
    assert.match(source, /minPhotoZoom/);
    assert.equal(source.includes("PHOTO_FRAME_MIN_ZOOM"), false);
    assert.match(source, /Zoom out to fit the whole photo/);
  });
});

describe("framed JPEG encode uses the wash matte when zoomed out", () => {
  it("fills letterbox with the adjuster wash color", async () => {
    const source = await readFile(join(process.cwd(), "src/lib/image-file.ts"), "utf8");
    assert.match(source, /photoFrameDrawCommands/);
    assert.match(source, /PHOTO_FRAME_MATTE/);
    assert.match(source, /jpegUnderCap/);
    assert.equal(PHOTO_FRAME_MATTE, "#cbb894");
  });
});
