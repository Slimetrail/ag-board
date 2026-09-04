import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const LOGIN = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(80);

export const getAdminStatus = createServerFn({ method: "POST" }).handler(
  async () => {
    const { adminStatus } = await import("./admin.server");
    return adminStatus();
  },
);

export const createAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: LOGIN,
      password: z.string().min(8).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const { adminCreate } = await import("./admin.server");
    return adminCreate(data.username, data.password);
  });

export const loginAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: LOGIN,
      password: z.string().min(1).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const { adminLogin } = await import("./admin.server");
    return adminLogin(data.username, data.password);
  });

export const claimOffice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { claimFromUser } = await import("./admin.server");
    return claimFromUser(context.userId);
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(
  async () => {
    const { adminLogout } = await import("./admin.server");
    return adminLogout();
  },
);

export async function requireAdmin() {
  const mod = await import("./admin.server");
  return mod.requireAdmin();
}