export type OpenableNotification = { id: number; readAt: Date | null; linkPath: string | null };

export function getInternalListingPath(linkPath: string | null) {
  return linkPath?.match(/^\/annonce\/\d+$/) ? linkPath : null;
}

export function openNotificationDestination(
  item: OpenableNotification,
  actions: { markRead: (notificationId: number, callbacks?: { onSuccess?: () => void; onError?: () => void }) => void; navigate: (path: string) => void },
) {
  const destination = getInternalListingPath(item.linkPath);
  if (!destination) return false;
  if (item.readAt) {
    actions.navigate(destination);
    return true;
  }
  const navigate = () => actions.navigate(destination);
  actions.markRead(item.id, { onSuccess: navigate, onError: navigate });
  return true;
}
