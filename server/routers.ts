import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { z } from "zod";
import { normalizePhone, registrationSchema } from "../shared/marketplace";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { marketplaceRouter } from "./routers/marketplace";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(registrationSchema).mutation(async ({ ctx, input }) => {
      const phone = normalizePhone(input.phone);
      const existing = await db.getAuthUserByPhone(phone);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Un compte existe déjà avec ce numéro. Connectez-vous." });
      const salt = randomBytes(16).toString("hex");
      const passwordHash = `${salt}:${scryptSync(input.password, salt, 64).toString("hex")}`;
      const user = ctx.user ?? await db.createPhoneUser({ ...input, phone, passwordHash });
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? `${input.firstName} ${input.lastName}`, expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      return { id: user.id, name: user.name, role: user.role };
    }),
    login: publicProcedure.input(z.object({ phone: z.string().min(8), password: z.string().min(8) })).mutation(async ({ ctx, input }) => {
      const user = await db.getAuthUserByPhone(normalizePhone(input.phone));
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Numéro ou mot de passe incorrect." });
      const [salt, hash] = user.passwordHash.split(":");
      const derivedHash = scryptSync(input.password, salt, 64).toString("hex");
      const valid = hash && timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derivedHash, "hex"));
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Numéro ou mot de passe incorrect." });
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "Membre Afrique Marketplace", expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      return { id: user.id, name: user.name, role: user.role };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  marketplace: marketplaceRouter,
});

export type AppRouter = typeof appRouter;
