import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, Loader2, Send, Trash2, Video } from "lucide-react";
import { useRef, useState } from "react";
import { listPublicPosts, createPortablePost, deletePortablePost, postInitials, type PortablePost } from "@/lib/postsSupabase";
import { getPortableSession } from "@/lib/marketplaceSupabase";
import { portableMediaUrl } from "@/lib/marketplaceSupabase";

function PostCard({ post, currentUserId, onDelete, deleting }: { post: PortablePost; currentUserId?: string; onDelete: (id: string) => void; deleting: boolean }) {
  const media = post.mediaUrls;
  return <article className="listing-card" aria-label={`Publication de ${post.author.name}`}>
    <div className="listing-card__body">
      <div className="post-author-row">
        <div className="conversation-avatar" aria-hidden="true">{postInitials(post.author.name)}</div>
        <div><strong>{post.author.name}</strong>{post.author.verified && <span className="verified-badge"><CheckCircle2 size={14} /> Vérifié</span>}<small>{new Date(post.createdAt).toLocaleString("fr-FR")}</small></div>
        {currentUserId === post.userId && <button type="button" className="icon-button" aria-label="Supprimer cette publication" onClick={() => onDelete(post.id)} disabled={deleting}><Trash2 size={16} /></button>}
      </div>
      {post.content && <p className="post-content">{post.content}</p>}
      {media.length > 0 && <div className={`post-media-grid post-media-grid--${Math.min(media.length, 3)}`}>{media.map((url, index) => { const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url); return isVideo ? <video key={url} src={portableMediaUrl(url)} controls preload="metadata" aria-label={`Vidéo ${index + 1} de la publication`} /> : <img key={url} src={portableMediaUrl(url)} alt="Média de la publication" loading="lazy" />; })}</div>}
    </div>
  </article>;
}

export default function PostsFeed() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const session = useQuery({ queryKey: ["portable-session-for-posts"], queryFn: getPortableSession });
  const posts = useQuery({ queryKey: ["global-posts"], queryFn: listPublicPosts });
  const create = useMutation({ mutationFn: () => createPortablePost({ content, files }), onSuccess: () => { setContent(""); setFiles([]); if (inputRef.current) inputRef.current.value = ""; void queryClient.invalidateQueries({ queryKey: ["global-posts"] }); } });
  const remove = useMutation({ mutationFn: deletePortablePost, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["global-posts"] }) });
  const connected = Boolean(session.data);
  return <section className="page-wrap section-space" aria-labelledby="global-feed-title">
    <div className="section-heading"><div><p className="eyebrow eyebrow--dark">Le fil Afrique</p><h2 id="global-feed-title">Les publications de la communauté.</h2></div><span className="results-count">{posts.data?.length ?? 0} publication{(posts.data?.length ?? 0) > 1 ? "s" : ""}</span></div>
    {connected && <form className="post-composer" onSubmit={event => { event.preventDefault(); if (!create.isPending) create.mutate(); }}><textarea value={content} onChange={event => setContent(event.target.value)} maxLength={5000} placeholder="Partagez une information avec la communauté…" aria-label="Texte de la publication" /><div className="post-composer__footer"><input ref={inputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple onChange={event => setFiles(Array.from(event.target.files ?? []))} aria-label="Ajouter des photos ou vidéos" /><span>{files.length ? `${files.length} média${files.length > 1 ? "s" : ""} sélectionné${files.length > 1 ? "s" : ""}` : <><ImagePlus size={16} /> Photo / <Video size={16} /> vidéo</>}</span><button className="button button--gold" disabled={create.isPending}>{create.isPending ? <Loader2 className="spin" size={17} /> : <Send size={17} />} Publier</button></div>{create.error && <p className="form-error" role="alert">{create.error.message}</p>}</form>}
    {!connected && <p className="empty-state empty-state--bordered">Connectez-vous pour publier. Les publications publiques restent visibles par les membres connectés.</p>}
    {posts.error ? <p className="form-error" role="alert">Le fil n’a pas pu être chargé. Réessayez.</p> : posts.isLoading ? <p className="empty-state">Chargement du fil…</p> : posts.data?.length ? <div className="listing-grid">{posts.data.map(post => <PostCard key={post.id} post={post} currentUserId={session.data?.user.id} onDelete={id => remove.mutate(id)} deleting={remove.isPending} />)}</div> : <p className="empty-state empty-state--bordered">Aucune publication publique pour le moment.</p>}
  </section>;
}
