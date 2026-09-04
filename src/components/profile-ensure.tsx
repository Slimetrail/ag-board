import { useEffect } from "react";
import { ensureOwnProfile } from "@/lib/profiles";

export function ProfileEnsure() {
  useEffect(() => {
    void ensureOwnProfile();
  }, []);
  return null;
}
