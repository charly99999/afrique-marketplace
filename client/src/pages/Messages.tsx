import { useAuth } from "@/_core/hooks/useAuth";
import { MarketplaceShell } from "@/components/MarketplaceShell";
import { NotificationAlertItem } from "@/components/NotificationAlertItem";
import { openNotificationDestination } from "@/lib/notificationNavigation";
import { QueryErrorState } from "@/components/QueryErrorState";
import { isSupabaseMode } from "@/lib/backendMode";
import { leavePortableReview, listPortableConversations, listPortableMessages, listPortableNotifications, markPortableNotificationRead, replyPortableConversation } from "@/lib/marketplaceSupabase";
import { trpc } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, MessageCircle, Star } from "lucide-react";
import React from "react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Messages() {
  const { isAuthenticated } = useAuth();
  const legacyConversations = trpc.marketplace.conversations.list.useQuery(undefined, { enabled: !isSupabaseMode && isAuthenticated, refetchInterval: 5000 });
  const legacyAlerts = trpc.marketplace.notifications.list.useQuery(undefined, { enabled: !isSupabaseMode && isAuthenticated, refetchInterval: 5000 });
  const [selected, setSelected] = useState<string | number>();
  const legacyMessages = trpc.marketplace.conversations.messages.useQuery({ conversationId: typeof selected === "number" ? selected : 0 }, { enabled: !isSupabaseMode && typeof selected === "number", refetchInterval: 3500 });
  const portableConversations = useQuery({ queryKey: ["portable-conversations"], queryFn: listPortableConversations, enabled: isSupabaseMode && isAuthenticated, refetchInterval: 5000 });
  const portableAlerts = useQuery({ queryKey: ["portable-notifications"], queryFn: listPortableNotifications, enabled: isSupabaseMode && isAuthenticated, refetchInterval: 5000 });
  const portableMessages = useQuery({ queryKey: ["portable-conversation-messages", selected], queryFn: () => listPortableMessages(String(selected)), enabled: isSupabaseMode && typeof selected === "string", refetchInterval: 3500 });
  const conversations = isSupabaseMode ? portableConversations : legacyConversations;
  const alerts = isSupabaseMode ? portableAlerts : legacyAlerts;
  const messages = isSupabaseMode ? portableMessages : legacyMessages;
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [, navigate] = useLocation();
  const legacyReply = trpc.marketplace.conversations.reply.useMutation({ onSuccess: () => { setBody(""); if (selected) messages.refetch(); } });
  const legacyLeaveReview = trpc.marketplace.reviews.leave.useMutation({ onSuccess: () => { setReviewComment(""); setReviewOpen(false); } });
  const legacyMarkRead = trpc.marketplace.notifications.markRead.useMutation({ onSuccess: () => alerts.refetch() });
  const portableReply = useMutation({ mutationFn: (payload: { conversationId: string; body: string }) => replyPortableConversation(payload.conversationId, payload.body), onSuccess: () => { setBody(""); if (selected) messages.refetch(); } });
  const portableLeaveReview = useMutation({ mutationFn: (payload: { conversationId: string; rating: number; comment: string }) => leavePortableReview(payload), onSuccess: () => { setReviewComment(""); setReviewOpen(false); } });
  const portableMarkRead = useMutation({ mutationFn: markPortableNotificationRead, onSuccess: () => alerts.refetch() });

  const openAlert = (item: { id: string | number; readAt: Date | string | null; linkPath: string | null }) => {
    if (isSupabaseMode) {
      const destination = item.linkPath && /^\/annonce\/[0-9a-f-]+$/i.test(item.linkPath) ? item.linkPath : null;
      if (!destination) return;
      portableMarkRead.mutate(String(item.id), { onSuccess: () => navigate(destination), onError: () => navigate(destination) });
      return;
    }
    openNotificationDestination(item as { id: number; readAt: Date | null; linkPath: string | null }, { markRead: (notificationId, callbacks) => legacyMarkRead.mutate({ notificationId }, callbacks), navigate });
  };
  const normalizedAlerts = isSupabaseMode ? (alerts.data ?? []).map(item => ({ id: String(item.id), title: String(item.title), body: String(item.body), linkPath: item.link_path ? String(item.link_path) : null, readAt: item.read_at ? String(item.read_at) : null })) : (alerts.data ?? []);
  const alertContent = alerts.error ? <QueryErrorState message="Les alertes sont indisponibles pour le moment." onRetry={() => alerts.refetch()} /> : normalizedAlerts.length ? normalizedAlerts.map(item => <NotificationAlertItem key={item.id} item={item} onOpen={openAlert} />) : <div className="inbox-empty">Vous recevrez ici les nouvelles importantes.</div>;

  if (!isAuthenticated) return <MarketplaceShell title="Messages"><section className="page-wrap section-space"><div className="gate-card"><MessageCircle size={28} /><h2>Vos échanges sont protégés.</h2><p>Connectez-vous pour retrouver vos conversations et les alertes qui vous concernent.</p></div></section></MarketplaceShell>;

  const selectedConversationId = selected === undefined ? null : String(selected);
  const submitReview = () => {
    if (!selectedConversationId) return;
    if (isSupabaseMode) portableLeaveReview.mutate({ conversationId: selectedConversationId, rating, comment: reviewComment });
    else legacyLeaveReview.mutate({ conversationId: Number(selected), rating, comment: reviewComment });
  };
  const submitReply = () => {
    if (!body.trim() || !selectedConversationId) return;
    if (isSupabaseMode) portableReply.mutate({ conversationId: selectedConversationId, body });
    else legacyReply.mutate({ conversationId: Number(selected), body });
  };

  return <MarketplaceShell title="Messages et alertes"><section className="page-wrap section-space"><div className="mobile-alerts"><div className="inbox-title"><Bell size={18} /> Alertes</div>{alertContent}</div><div className="messages-layout"><aside className="conversation-list"><div className="inbox-title"><MessageCircle size={18} /> Conversations</div>{conversations.error ? <QueryErrorState message="Vos conversations n’ont pas pu être chargées." onRetry={() => conversations.refetch()} /> : conversations.data?.length ? conversations.data.map(item => <button onClick={() => setSelected(item.id)} key={item.id} className={selected === item.id ? "active" : ""}><span className="conversation-avatar">AM</span><span><strong>Conversation #{item.id}</strong><small>Échange acheteur / vendeur</small></span></button>) : <div className="inbox-empty">Vos nouvelles conversations apparaîtront ici.</div>}</aside><div className="chat-panel">{selected ? <><header><div><strong>Conversation #{selected}</strong><small>Messages protégés entre membres</small></div></header><div className="messages-feed">{messages.error ? <QueryErrorState message="Le fil de discussion est momentanément indisponible." onRetry={() => messages.refetch()} /> : messages.data?.length ? messages.data.map(item => <div className="message-bubble" key={item.id}>{item.body}</div>) : <p>Commencez votre échange avec bienveillance et précision.</p>}</div>{reviewOpen && <form className="review-form" onSubmit={event => { event.preventDefault(); submitReview(); }}><div><span>Votre note</span><select value={rating} onChange={event => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map(value => <option value={value} key={value}>{value} / 5</option>)}</select></div><input required minLength={8} value={reviewComment} onChange={event => setReviewComment(event.target.value)} placeholder="Décrivez honnêtement votre expérience" /><button className="button button--outline button--small">Publier l’avis</button>{(isSupabaseMode ? portableLeaveReview.error : legacyLeaveReview.error) && <p className="form-error">{String((isSupabaseMode ? portableLeaveReview.error : legacyLeaveReview.error)?.message)}</p>}</form>}<form onSubmit={event => { event.preventDefault(); submitReply(); }}><input value={body} onChange={event => setBody(event.target.value)} placeholder="Votre message" /><button type="button" className="review-trigger" onClick={() => setReviewOpen(!reviewOpen)} aria-label="Laisser un avis"><Star size={17} /></button><button className="button button--gold">Envoyer</button></form><p className="chat-note">Pour appeler un vendeur, utilisez le numéro indiqué sur son annonce vérifiée.</p></> : <div className="chat-placeholder"><MessageCircle size={33} /><h2>Une discussion peut commencer ici.</h2><p>Sélectionnez un échange quand vous aurez contacté un vendeur ou reçu un message.</p></div>}</div><aside className="alerts-panel"><div className="inbox-title"><Bell size={18} /> Alertes</div>{alertContent}<div className="review-callout"><Star size={17} /><span>Après un échange, laissez une note honnête pour aider la communauté.</span></div></aside></div></section></MarketplaceShell>;
}
