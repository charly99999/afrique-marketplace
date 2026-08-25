import React from "react";

export type NotificationAlert = {
  id: number;
  title: string;
  body: string;
  readAt: Date | null;
};

export function NotificationAlertItem({ item, onOpen }: { item: NotificationAlert; onOpen: (notificationId: number) => void }) {
  return <button onClick={() => !item.readAt && onOpen(item.id)} className={!item.readAt ? "alert-item alert-item--unread" : "alert-item"}><strong>{item.title}</strong><span>{item.body}</span></button>;
}
