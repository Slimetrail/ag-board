export function isUserUploadPath(path: string) {
  return /^\/uploads\/[a-z0-9-]+\.jpg$/i.test(path);
}
