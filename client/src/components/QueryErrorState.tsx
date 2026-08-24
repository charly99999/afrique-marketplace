import { RefreshCw, ShieldAlert } from "lucide-react";

export function QueryErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="query-error-state"><ShieldAlert size={25} /><h3>Une information reste indisponible.</h3><p>{message}</p>{onRetry && <button className="button button--outline button--small" onClick={onRetry}><RefreshCw size={14} /> Réessayer</button>}</div>;
}
