import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAKE_VIDEO_BANNER,
  TUTORIALS,
  getTutorial,
  isSafeHttpUrl,
  normalizeHttpUrl,
  parseHttpUrl,
  resolveTutorialBoard,
  tutorialHostLabel,
} from "./tutorials.ts";

const sampleUser = {
  id: 1,
  title: "Stretching wire on a hill",
  summary: "A Saturday fence job we filmed after the rain.",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  farmName: "@neighbor",
  userId: "user-1",
  createdAt: "2026-09-05T00:00:00.000Z",
};

describe("parseHttpUrl / isSafeHttpUrl", () => {
  it("accepts http and https links", () => {
    assert.equal(isSafeHttpUrl("https://www.youtube.com/watch?v=abc"), true);
    assert.equal(isSafeHttpUrl("http://example.com/clip"), true);
    assert.equal(
      normalizeHttpUrl("https://tiktok.com/@farm/video/1"),
      "https://tiktok.com/@farm/video/1",
    );
  });

  it("rejects non-http schemes and junk", () => {
    assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
    assert.equal(isSafeHttpUrl("data:text/html,hi"), false);
    assert.equal(isSafeHttpUrl("ftp://files.example/clip"), false);
    assert.equal(isSafeHttpUrl("file:///tmp/clip.mp4"), false);
    assert.equal(isSafeHttpUrl(""), false);
    assert.equal(isSafeHttpUrl("not a url"), false);
    assert.equal(isSafeHttpUrl("https://user:pass@evil.example/"), false);
    assert.equal(parseHttpUrl("https://exa mple.com"), null);
  });
});

describe("tutorialHostLabel", () => {
  it("names common video hosts and falls back to hostname", () => {
    assert.equal(
      tutorialHostLabel("https://www.youtube.com/watch?v=abc"),
      "YouTube",
    );
    assert.equal(tutorialHostLabel("https://youtu.be/abc"), "YouTube");
    assert.equal(
      tutorialHostLabel("https://www.tiktok.com/@farm/video/1"),
      "TikTok",
    );
    assert.equal(
      tutorialHostLabel("https://www.facebook.com/watch?v=1"),
      "Facebook",
    );
    assert.equal(tutorialHostLabel("https://clips.example.net/a"), "clips.example.net");
  });
});

describe("resolveTutorialBoard", () => {
  it("shows stock tiles and the fake-video banner when no user tiles exist", () => {
    const board = resolveTutorialBoard([]);
    assert.equal(board.showStock, true);
    assert.equal(board.showFakeBanner, true);
    assert.equal(board.stockTiles.length, TUTORIALS.length);
    assert.deepEqual(
      board.stockTiles.map((item) => item.slug),
      TUTORIALS.map((item) => item.slug),
    );
    assert.equal(board.userTiles.length, 0);
    assert.equal(FAKE_VIDEO_BANNER, "Fake video");
  });

  it("hides stock and the banner once a user-linked tile exists", () => {
    const board = resolveTutorialBoard([sampleUser]);
    assert.equal(board.showStock, false);
    assert.equal(board.showFakeBanner, false);
    assert.deepEqual(board.stockTiles, []);
    assert.equal(board.userTiles.length, 1);
    assert.equal(board.userTiles[0]?.url, sampleUser.url);
  });

  it("restores stock and the banner when user tiles are gone again", () => {
    const withPosts = resolveTutorialBoard([sampleUser]);
    assert.equal(withPosts.showStock, false);
    const emptyAgain = resolveTutorialBoard([]);
    assert.equal(emptyAgain.showStock, true);
    assert.equal(emptyAgain.showFakeBanner, true);
    assert.equal(emptyAgain.stockTiles.length, TUTORIALS.length);
  });

  it("does not mutate the stock catalog", () => {
    const before = TUTORIALS.map((item) => item.slug);
    resolveTutorialBoard([sampleUser]);
    resolveTutorialBoard([]);
    assert.deepEqual(
      TUTORIALS.map((item) => item.slug),
      before,
    );
    assert.equal(getTutorial("stretching-woven-wire")?.title, "Stretching woven wire");
  });
});

describe("stock tutorial files", () => {
  it("leaves every stock poster on disk under public/images", async () => {
    for (const item of TUTORIALS) {
      assert.equal(item.posterPath.startsWith("/images/"), true);
      assert.equal(item.videoPath.startsWith("/videos/"), true);
      await access(join(process.cwd(), "public", item.posterPath));
    }
  });
});

describe("external tutorial UI", () => {
  it("warns before leaving and does not auto-embed off-site players", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const tiles = readFileSync(join(here, "../components/tutorial-tiles.tsx"), "utf8");
    const dialog = readFileSync(join(here, "../components/leave-site-dialog.tsx"), "utf8");
    const learn = readFileSync(join(here, "../routes/learn.tsx"), "utf8");
    assert.match(dialog, /Warning: leaving page/);
    assert.match(dialog, /openExternalTutorial/);
    assert.match(tiles, /onOpen/);
    assert.doesNotMatch(tiles, /<iframe/i);
    assert.doesNotMatch(learn, /<iframe|youtube\.com\/embed|tiktok\.com\/embed/i);
    assert.match(learn, /LeaveSiteDialog/);
  });
});
