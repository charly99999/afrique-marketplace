import { describe, expect, it } from "vitest";
import { normalizePortablePost, postInitials } from "./postsSupabase";

describe("postsSupabase", () => {
  it("normalise un post public et conserve uniquement les URLs média sûres", () => {
    const post = normalizePortablePost({
      id: "post-1",
      user_id: "user-1",
      content: "Bonjour l’Afrique",
      media_urls: ["https://cdn.example/photo.jpg", "not-a-url", "https://cdn.example/video.mp4"],
      visibility: "public",
      created_at: "2026-08-27T10:00:00Z",
      updated_at: "2026-08-27T10:00:00Z",
      author_name: "Awa Diallo",
      author_photo_path: null,
      author_verified: true,
    });
    expect(post.userId).toBe("user-1");
    expect(post.author.name).toBe("Awa Diallo");
    expect(post.author.verified).toBe(true);
    expect(post.mediaUrls).toEqual(["https://cdn.example/photo.jpg", "https://cdn.example/video.mp4"]);
  });

  it("produit des initiales stables même si le nom est incomplet", () => {
    expect(postInitials("Awa Diallo")).toBe("AD");
    expect(postInitials("Awa")).toBe("A");
    expect(postInitials("")).toBe("AM");
  });
});
