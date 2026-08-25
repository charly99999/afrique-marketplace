import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { NotificationAlertItem } from "@/components/NotificationAlertItem";
import { QueryErrorState } from "@/components/QueryErrorState";
import { trpc } from "@/lib/trpc";
import { Bell, MessageCircle, Star } from "lucide-react";
import React from "react";
import { useState } from "react";

export default function Messages() {
  const { isAuthenticated } = useAuth();
  const conversations = trpc.marketplace.conversations.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5000 });
  const alerts = trpc.marketplace.notifications.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5000 });
  const [selected, setSelected] = useState<number>();
  const messages = trpc.marketplace.conversations.messages.useQuery({ conversationId: selected ?? 0 }, { enabled: Boolean(selected), refetchInterval: 3500 });
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const reply = trpc.marketplace.conversations.reply.useMutation({ onSuccess: () => { setBody(""); if (selected) messages.refetch(); } });
  const leaveReview = trpc.marketplace.reviews.leave.useMutation({ onSuccess: () => { setReviewComment(""); setReviewOpen(false); } });
  const markRead = trpc.marketplace.notifications.markRead.useMutation({ onSuccess: () => alerts.refetch() });

  const alertContent = alerts.error ? <QueryErrorState message="Les alertes sont indisponibles pour le moment." onRetry={() => alerts.refetch()} /> : alerts.data?.length ? alerts.data.map(item => <NotificationAlertItem key={item.id} item={item} onOpen={notificationId => markRead.mutate({ notificationId })} />) : <div className="inbox-empty">Vous recevrez ici les nouvelles importantes.</div>;

  if (!isAuthenticated) return <MarketplaceShell title="Messages"><section className="page-wrap section-space"><div className="gate-card"><MessageCircle size={28} /><h2>Vos échanges sont protégés.</h2><p>Connectez-vous pour retrouver vos conversations et les alertes qui vous concernent.</p></div></section></MarketplaceShell>;

  return <MarketplaceShell title="Messages et alertes"><section className="page-wrap section-space"><div className="mobile-alerts"><div className="inbox-title"><Bell size={18} /> Alertes</div>{alertContent}</div><div className="messages-layout"><aside className="conversation-list"><div className="inbox-title"><MessageCircle size={18} /> Conversations</div>{conversations.error ? <QueryErrorState message="Vos conversations n’ont pas pu être chargées." onRetry={() => conversations.refetch()} /> : conversations.data?.length ? conversations.data.map(item => <button onClick={() => setSelected(item.id)} key={item.id} className={selected === item.id ? "active" : ""}><span className="conversation-avatar">AM</span><span><strong>Conversation #{item.id}</strong><small>Échange acheteur / vendeur</small></span></button>) : <div className="inbox-empty">Vos nouvelles conversations apparaîtront ici.</div>}</aside><div className="chat-panel">{selected ? <><header><div><strong>Conversation #{selected}</strong><small>Messages protégés entre membres</small></div></header><div className="messages-feed">{messages.error ? <QueryErrorState message="Le fil de discussion est momentanément indisponible." onRetry={() => messages.refetch()} /> : messages.data?.length ? messages.data.map(item => <div className="message-bubble" key={item.id}>{item.body}</div>) : <p>Commencez votre échange avec bienveillance et précision.</p>}</div>{reviewOpen && <form className="review-form" onSubmit={event => { event.preventDefault(); leaveReview.mutate({ conversationId: selected, rating, comment: reviewComment }); }}><div><span>Votre note</span><select value={rating} onChange={event => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map(value => <option value={value} key={value}>{value} / 5</option>)}</select></div><input required minLength={8} value={reviewComment} onChange={event => setReviewComment(event.target.value)} placeholder="Décrivez honnêtement votre expérience" /><button className="button button--outline button--small">Publier l’avis</button>{leaveReview.error && <p className="form-error">{leaveReview.error.message}</p>}</form>}<form onSubmit={event => { event.preventDefault(); if (body.trim()) reply.mutate({ conversationId: selected, body }); }}><input value={body} onChange={event => setBody(event.target.value)} placeholder="Votre message" /><button type="button" className="review-trigger" onClick={() => setReviewOpen(!reviewOpen)} aria-label="Laisser un avis"><Star size={17} /></button><button className="button button--gold">Envoyer</button></form><p className="chat-note">Pour appeler un vendeur, utilisez le numéro indiqué sur son annonce vérifiée.</p></> : <div className="chat-placeholder"><MessageCircle size={33} /><h2>Une discussion peut commencer ici.</h2><p>Sélectionnez un échange quand vous aurez contacté un vendeur ou reçu un message.</p></div>}</div><aside className="alerts-panel"><div className="inbox-title"><Bell size={18} /> Alertes</div>{alertContent}<div className="review-callout"><Star size={17} /><span>Après un échange, laissez une note honnête pour aider la communauté.</span></div></aside></div></section></MarketplaceShell>;
}
