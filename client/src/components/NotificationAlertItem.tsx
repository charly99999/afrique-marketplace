import React from "react";

export type NotificationAlert = {
  id: string | number;
  title: string;
  body: string;
  linkPath: string | null;
  readAt: Date | string | null;
};

export function NotificationAlertItem({ item, onOpen }: { item: NotificationAlert; onOpen: (item: NotificationAlert) => void }) {
  const canOpenListing = Boolean(item.linkPath?.match(/^\/annonce\/[0-9a-f-]+$/i));
  return <button onClick={() => onOpen(item)} className={!item.readAt ? "alert-item alert-item--unread" : "alert-item"}><strong>{item.title}</strong><span>{item.body}</span>{canOpenListing && <small>Voir l’annonce</small>}</button>;
}
