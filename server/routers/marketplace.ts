import { TRPCError } from "@trpc/server";
import { randomBytes, randomUUID, scryptSync } from "crypto";
import { z } from "zod";
import { canPublishWithVerification, MARKETPLACE_CATEGORIES, listingCreateSchema, moderationStatuses, profileDetailsSchema, registrationSchema, resolveVerificationDecision, visibleSellerPhone } from "../../shared/marketplace";
import * as db from "../db";
import { notifyOwner } from "../_core/notification";
import { storagePut } from "../storage";
import { analyzeVerificationWithAi } from "../verificationAi";
import { decideFromAiReview } from "../../shared/verificationAi";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const dataUrlSchema = z.string().regex(/^data:(image\/(jpeg|jpg|png|webp)|video\/(mp4|webm));base64,/, "Format de média non pris en charge").max(3_000_000);
const verificationReviewSchema = z.object({
  verificationId: z.number().int().positive(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).default(""),
  confirmedConsistent: z.boolean(),
}).superRefine((input, context) => {
  if (input.decision === "approved" && !input.confirmedConsistent) {
    context.addIssue({ code: "custom", message: "Confirmez que le document, le selfie et le profil sont cohérents avant de valider." });
  }
  if (input.decision === "rejected" && input.note.trim().length < 8) {
    context.addIssue({ code: "custom", message: "Indiquez un motif de refus précis pour aider le membre à corriger son dossier." });
  }
});

function getFileFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Fichier invalide" });
  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");
  const extension = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("video") ? (mime.includes("webm") ? "webm" : "mp4") : "jpg";
  return { mime, bytes, extension, kind: mime.startsWith("video/") ? "video" as const : "image" as const };
}

async function putPrivateFile(prefix: string, dataUrl: string) {
  const file = getFileFromDataUrl(dataUrl);
  const key = `${prefix}/${randomUUID()}.${file.extension}`;
  const result = await storagePut(key, file.bytes, file.mime);
  return { key: result.key, kind: file.kind };
}

function assertConversationMember(conversation: { buyerId: number; sellerId: number } | undefined, userId: number) {
  if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette conversation ne vous appartient pas" });
  }
}

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Accès administrateur requis" });
  return next();
});

async function runAiVerification(verificationId: number) {
  const dossier = await db.getVerificationDossier(verificationId);
  if (!dossier) throw new TRPCError({ code: "NOT_FOUND", message: "Dossier de vérification introuvable." });
  const review = await analyzeVerificationWithAi(dossier);
  await db.saveAiVerificationReview(verificationId, review);
  const outcome = decideFromAiReview(review);
  if (outcome.decision === "pending") {
    await notifyOwner({ title: "Dossier IA à examiner", content: `Le profil ${dossier.userId} nécessite une revue complémentaire : ${outcome.note}` });
    return { id: dossier.id, status: "pending" as const, aiStatus: "manual_review" as const };
  }
  const decided = await db.applyAutomatedVerificationDecision(verificationId, outcome.decision, outcome.note);
  const notification = resolveVerificationDecision(outcome.decision, decided.selfieKey, outcome.note).notification;
  await db.createNotification({ userId: decided.userId, type: "verification", ...notification });
  return { id: dossier.id, status: outcome.decision, aiStatus: "decided" as const };
}

export const marketplaceRouter = router({
  catalog: router({
    categories: protectedProcedure.query(() => MARKETPLACE_CATEGORIES),
  }),
  profile: router({
    mine: protectedProcedure.query(async ({ ctx }) => (await db.getConsistentProfile(ctx.user.id)) ?? null),
    register: protectedProcedure.input(registrationSchema).mutation(async ({ ctx, input }) => {
      const salt = randomBytes(16).toString("hex");
      const passwordHash = `${salt}:${scryptSync(input.password, salt, 64).toString("hex")}`;
      const profile = await db.saveProfile({
        userId: ctx.user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        city: input.city,
        passwordHash,
      });
      return profile;
    }),
    uploadCover: protectedProcedure.input(z.object({ dataUrl: dataUrlSchema })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complétez d’abord votre inscription" });
      const file = await putPrivateFile(`profiles/${ctx.user.id}/cover`, input.dataUrl);
      return db.setProfileMedia(ctx.user.id, "coverPhotoKey", file.key);
    }),
    updateDetails: protectedProcedure.input(profileDetailsSchema).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complétez d’abord votre inscription" });
      return db.updateProfileDetails(ctx.user.id, input);
    }),
  }),
  verification: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const verification = await db.getLatestVerification(ctx.user.id);
      if (!verification) return null;
      return { id: verification.id, documentType: verification.documentType, status: verification.status, adminNote: verification.adminNote, aiReview: verification.aiReview, aiReviewedAt: verification.aiReviewedAt, createdAt: verification.createdAt };
    }),
    submit: protectedProcedure.input(z.object({ documentType: z.enum(["cni", "passeport", "permis", "carte_scolaire"]), documentData: dataUrlSchema, selfieData: dataUrlSchema })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complétez d’abord votre inscription" });
      const [documentFile, selfieFile] = await Promise.all([
        putPrivateFile(`verifications/${ctx.user.id}/document`, input.documentData),
        putPrivateFile(`verifications/${ctx.user.id}/selfie`, input.selfieData),
      ]);
      const verification = await db.createVerification({ userId: ctx.user.id, documentType: input.documentType, documentKey: documentFile.key, selfieKey: selfieFile.key });
      if (!verification) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Le dossier de vérification n’a pas pu être créé." });
      try {
        return await runAiVerification(verification.id);
      } catch (error) {
        console.error("[Verification AI] Analysis unavailable:", error);
        await notifyOwner({ title: "Dossier à examiner", content: `Le profil ${ctx.user.id} a soumis une vérification qui nécessite une revue.` });
        return { id: verification.id, status: "pending" as const, aiStatus: "unavailable" as const };
      }
    }),
    analyzeMine: protectedProcedure.mutation(async ({ ctx }) => {
      const verification = await db.getLatestVerification(ctx.user.id);
      if (!verification || verification.status !== "pending") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aucun dossier en attente à analyser." });
      try {
        return await runAiVerification(verification.id);
      } catch (error) {
        console.error("[Verification AI] Analysis unavailable:", error);
        return { id: verification.id, status: "pending" as const, aiStatus: "unavailable" as const };
      }
    }),
  }),
  listings: router({
    search: publicProcedure.input(z.object({ category: z.string().optional(), city: z.string().optional(), query: z.string().optional(), condition: z.string().optional() }).optional()).query(({ input }) => db.searchListings(input ?? {})),
    mine: protectedProcedure.query(({ ctx }) => db.getListingsForUser(ctx.user.id)),
    detail: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const listing = await db.getListing(input.id);
      if (!listing || listing.status !== "published") throw new TRPCError({ code: "NOT_FOUND", message: "Annonce introuvable" });
      const seller = await db.getPublicProfile(listing.userId);
      return { listing, seller: seller ? { ...seller, phone: visibleSellerPhone(seller.verificationStatus, seller.phone) } : null };
    }),
    create: protectedProcedure.input(listingCreateSchema).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfile(ctx.user.id);
      if (!canPublishWithVerification(profile?.verificationStatus)) throw new TRPCError({ code: "FORBIDDEN", message: "La vérification du profil est obligatoire avant toute publication" });
      const media = await Promise.all(input.mediaData.map(dataUrl => putPrivateFile(`listings/${ctx.user.id}`, dataUrl)));
      return db.createListing({ userId: ctx.user.id, title: input.title, description: input.description, category: input.category, city: input.city, price: input.price.toFixed(2), currency: input.currency, condition: input.condition, media });
    }),
    moderate: adminProcedure.input(z.object({ listingId: z.number().int().positive(), status: z.enum(moderationStatuses) })).mutation(({ input }) => db.moderateListing(input.listingId, input.status)),
  }),
  conversations: router({
    list: protectedProcedure.query(({ ctx }) => db.getConversations(ctx.user.id)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      assertConversationMember(await db.getConversation(input.conversationId), ctx.user.id);
      return db.getMessages(input.conversationId);
    }),
    send: protectedProcedure.input(z.object({ recipientId: z.number().int().positive(), listingId: z.number().int().positive().optional(), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
      if (input.recipientId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas vous écrire" });
      const conversation = await db.findOrCreateConversation(ctx.user.id, input.recipientId, input.listingId);
      await db.createMessage({ conversationId: conversation.id, senderId: ctx.user.id, body: input.body });
      await db.createNotification({ userId: input.recipientId, type: "message", title: "Nouveau message", body: "Un acheteur ou vendeur vous a contacté." });
      return { conversationId: conversation.id };
    }),
    reply: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
      const conversation = await db.getConversation(input.conversationId);
      assertConversationMember(conversation, ctx.user.id);
      const recipientId = conversation!.buyerId === ctx.user.id ? conversation!.sellerId : conversation!.buyerId;
      await db.createMessage({ conversationId: input.conversationId, senderId: ctx.user.id, body: input.body });
      await db.createNotification({ userId: recipientId, type: "message", title: "Nouveau message", body: "Un acheteur ou vendeur vous a contacté." });
      return { success: true };
    }),
  }),
  reviews: router({
    leave: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), rating: z.number().int().min(1).max(5), comment: z.string().trim().min(8).max(1000) })).mutation(async ({ ctx, input }) => {
      const conversation = await db.getConversation(input.conversationId);
      assertConversationMember(conversation, ctx.user.id);
      const recipientId = conversation!.buyerId === ctx.user.id ? conversation!.sellerId : conversation!.buyerId;
      const interaction = await db.getMessages(input.conversationId);
      if (interaction.length === 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Un échange est nécessaire avant de laisser un avis" });
      await db.createReview({ fromUserId: ctx.user.id, toUserId: recipientId, conversationId: input.conversationId, rating: input.rating, comment: input.comment });
      await db.createNotification({ userId: recipientId, type: "review", title: "Nouvel avis reçu", body: "Un membre a partagé son expérience avec vous." });
      return { success: true };
    }),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.listNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.markNotificationRead(ctx.user.id, input.notificationId)),
  }),
  admin: router({
    overview: adminProcedure.query(() => db.getAdminOverview()),
    listings: adminProcedure.query(() => db.getAdminListings()),
    pendingVerifications: adminProcedure.query(() => db.getPendingVerifications()),
    reviewVerification: adminProcedure.input(verificationReviewSchema).mutation(async ({ ctx, input }) => {
      const verification = await db.reviewVerification(input.verificationId, ctx.user.id, input.decision, input.note);
      const notification = resolveVerificationDecision(input.decision, verification.selfieKey, input.note).notification;
      await db.createNotification({ userId: verification.userId, type: "verification", ...notification });
      return { success: true };
    }),
  }),
});
