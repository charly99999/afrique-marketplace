import { decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("firstName", { length: 80 }).notNull(),
  lastName: varchar("lastName", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  profilePhotoKey: varchar("profilePhotoKey", { length: 1024 }),
  coverPhotoKey: varchar("coverPhotoKey", { length: 1024 }),
  verificationStatus: mysqlEnum("verificationStatus", ["required", "pending", "verified", "rejected"]).default("required").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("profiles_city_idx").on(table.city)]);

export const verifications = mysqlTable("verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentType: mysqlEnum("documentType", ["cni", "passeport", "permis", "carte_scolaire"]).notNull(),
  documentKey: varchar("documentKey", { length: 1024 }).notNull(),
  selfieKey: varchar("selfieKey", { length: 1024 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminNote: text("adminNote"),
  reviewerId: int("reviewerId").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("verification_status_idx").on(table.status), index("verification_user_idx").on(table.userId)]);

export const listings = mysqlTable("listings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  price: decimal("price", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("XOF").notNull(),
  condition: mysqlEnum("condition", ["neuf", "comme_neuf", "bon_etat", "a_reparer"]).notNull(),
  media: json("media").$type<Array<{ key: string; kind: "image" | "video" }>>().notNull(),
  status: mysqlEnum("status", ["published", "hidden", "removed"]).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("listing_discovery_idx").on(table.status, table.category, table.city), index("listing_user_idx").on(table.userId)]);

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  buyerId: int("buyerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: int("sellerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: int("listingId").references(() => listings.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("conversation_members_idx").on(table.buyerId, table.sellerId)]);

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: int("senderId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
}, table => [index("message_conversation_idx").on(table.conversationId, table.createdAt)]);

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: int("toUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  rating: int("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("review_unique_interaction").on(table.fromUserId, table.toUserId, table.conversationId), index("review_recipient_idx").on(table.toUserId)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["message", "verification", "review", "system"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("notification_recipient_idx").on(table.userId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Listing = typeof listings.$inferSelect;
