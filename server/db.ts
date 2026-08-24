import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  callSessions,
  conversations,
  InsertUser,
  listings,
  messages,
  notifications,
  profiles,
  reviews,
  users,
  verifications,
} from "../drizzle/schema";
import { resolveVerificationDecision } from "../shared/marketplace";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result[0];
}

export async function saveProfile(payload: typeof profiles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(profiles).values(payload).onDuplicateKeyUpdate({
    set: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      city: payload.city,
      passwordHash: payload.passwordHash,
    },
  });
  return getProfile(payload.userId);
}

export async function setProfileMedia(userId: number, field: "profilePhotoKey" | "coverPhotoKey", key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(profiles).set({ [field]: key }).where(eq(profiles.userId, userId));
  return getProfile(userId);
}

export async function createVerification(payload: typeof verifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(verifications).values(payload);
  await db.update(profiles).set({ verificationStatus: "pending" }).where(eq(profiles.userId, payload.userId));
  return getLatestVerification(payload.userId);
}

export async function getLatestVerification(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(verifications).where(eq(verifications.userId, userId)).orderBy(desc(verifications.createdAt)).limit(1);
  return result[0];
}

export async function createListing(payload: typeof listings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(listings).values(payload);
  return { id: Number(result[0].insertId) };
}

export async function searchListings(filters: { category?: string; city?: string; query?: string; condition?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(listings.status, "published")];
  if (filters.category) conditions.push(eq(listings.category, filters.category));
  if (filters.city) conditions.push(eq(listings.city, filters.city));
  if (filters.condition) conditions.push(eq(listings.condition, filters.condition as "neuf" | "comme_neuf" | "bon_etat" | "a_reparer"));
  if (filters.query) conditions.push(sql`(${listings.title} like ${`%${filters.query}%`} or ${listings.description} like ${`%${filters.query}%`})`);
  return db.select().from(listings).where(and(...conditions)).orderBy(desc(listings.createdAt)).limit(60);
}

export async function getListing(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return result[0];
}

export async function getPublicProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    firstName: profiles.firstName,
    city: profiles.city,
    profilePhotoKey: profiles.profilePhotoKey,
    verificationStatus: profiles.verificationStatus,
  }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result[0];
}

export async function findOrCreateConversation(buyerId: number, sellerId: number, listingId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(conversations).where(and(eq(conversations.buyerId, buyerId), eq(conversations.sellerId, sellerId), listingId ? eq(conversations.listingId, listingId) : sql`${conversations.listingId} is null`)).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(conversations).values({ buyerId, sellerId, listingId: listingId ?? null });
  const created = await db.select().from(conversations).where(eq(conversations.id, Number(result[0].insertId))).limit(1);
  return created[0]!;
}

export async function getConversation(conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return result[0];
}

export async function getConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId))).orderBy(desc(conversations.updatedAt)).limit(100);
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt).limit(200);
}

export async function createMessage(payload: typeof messages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(messages).values(payload);
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, payload.conversationId));
}

export async function createCall(payload: typeof callSessions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(callSessions).values(payload);
}

export async function createReview(payload: typeof reviews.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(reviews).values(payload);
}

export async function createNotification(payload: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(notifications).values(payload);
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function getAdminOverview() {
  const db = await getDb();
  if (!db) return { users: 0, pendingVerifications: 0, listings: 0, flaggedContent: 0 };
  const [[usersCount], [verificationCount], [listingCount], [flaggedCount]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(verifications).where(eq(verifications.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(listings),
    db.select({ count: sql<number>`count(*)` }).from(listings).where(eq(listings.status, "hidden")),
  ]);
  return { users: Number(usersCount?.count ?? 0), pendingVerifications: Number(verificationCount?.count ?? 0), listings: Number(listingCount?.count ?? 0), flaggedContent: Number(flaggedCount?.count ?? 0) };
}

export async function getPendingVerifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(verifications).where(eq(verifications.status, "pending")).orderBy(desc(verifications.createdAt)).limit(100);
}

export async function getAdminListings() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: listings.id,
    title: listings.title,
    category: listings.category,
    city: listings.city,
    status: listings.status,
    createdAt: listings.createdAt,
  }).from(listings).orderBy(desc(listings.createdAt)).limit(100);
}

export async function reviewVerification(verificationId: number, reviewerId: number, decision: "approved" | "rejected", note: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const verification = (await db.select().from(verifications).where(eq(verifications.id, verificationId)).limit(1))[0];
  if (!verification) throw new Error("Vérification introuvable");
  const decisionResult = resolveVerificationDecision(decision, verification.selfieKey, note);
  await db.update(verifications).set({ status: decision, adminNote: note || null, reviewerId, reviewedAt: new Date() }).where(eq(verifications.id, verificationId));
  await db.update(profiles).set(decisionResult.profile).where(eq(profiles.userId, verification.userId));
  return verification;
}

export async function moderateListing(listingId: number, status: "published" | "hidden" | "removed") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(listings).set({ status }).where(eq(listings.id, listingId));
}
