import React from "react";

export type NotificationAlert = {
  id: number;
  title: string;
  body: string;
  linkPath: string | null;
  readAt: Date | null;
};

export function NotificationAlertItem({ item, onOpen }: { item: NotificationAlert; onOpen: (item: NotificationAlert) => void }) {
  const canOpenListing = Boolean(item.linkPath?.match(/^\/annonce\/\d+$/));
  return <button onClick={() => onOpen(item)} className={!item.readAt ? "alert-item alert-item--unread" : "alert-item"}><strong>{item.title}</strong><span>{item.body}</span>{canOpenListing && <small>Voir l’annonce</small>}</button>;
}
