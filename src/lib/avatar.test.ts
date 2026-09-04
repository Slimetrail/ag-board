import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  avatarInitials,
  isAllowedAvatar,
  isCustomPhotoPath,
  isRemotePhotoUrl,
} from "./avatar.ts";

describe("avatarInitials", () => {
  it("uses the first two letters of a single token", () => {
    assert.equal(avatarInitials("farmgirl"), "FA");
    assert.equal(avatarInitials("Hay"), "HA");
  });

  it("uses the first letter of the first two tokens", () => {
    assert.equal(avatarInitials("john_doe"), "JD");
    assert.equal(avatarInitials("Mary Jane"), "MJ");
    assert.equal(avatarInitials("hay-barn-sc"), "HB");
  });

  it("handles short and empty names", () => {
    assert.equal(avatarInitials("a"), "A");
    assert.equal(avatarInitials("  "), "?");
    assert.equal(avatarInitials(""), "?");
  });
});

describe("photo path rules", () => {
  it("accepts user uploads and https sign-in photos", () => {
    assert.equal(isCustomPhotoPath("/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"), true);
    assert.equal(
      isCustomPhotoPath(
        "https://abc123xyz.public.blob.vercel-storage.com/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      ),
      true,
    );
    assert.equal(isRemotePhotoUrl("https://lh3.googleusercontent.com/a/photo"), true);
    assert.equal(isAllowedAvatar(""), true);
    assert.equal(isAllowedAvatar("/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"), true);
    assert.equal(isAllowedAvatar("https://avatars.githubusercontent.com/u/1"), true);
  });

  it("rejects stock library paths and other schemes", () => {
    assert.equal(isCustomPhotoPath("/images/goats.jpg"), false);
    assert.equal(isCustomPhotoPath("/images/hay.jpg"), false);
    assert.equal(isAllowedAvatar("/images/goats.jpg"), false);
    assert.equal(isAllowedAvatar("http://example.com/pic.jpg"), false);
    assert.equal(isAllowedAvatar("/uploads/not-a-photo.png"), false);
  });
});
