import { isUserUploadPath } from "./upload-path.ts";

/** Two letters from a username or display name. Single token uses the first two. */
export function avatarInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export function isRemotePhotoUrl(path: string): boolean {
  try {
    const url = new URL(path);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/** User-uploaded JPEG or a sign-in provider photo. Not a site stock image. */
export function isCustomPhotoPath(path: string): boolean {
  if (!path) return false;
  return isUserUploadPath(path) || isRemotePhotoUrl(path);
}

export function isAllowedAvatar(path: string): boolean {
  return path === "" || isCustomPhotoPath(path);
}
