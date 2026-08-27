import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { getSeoMetadata } from "./lib/seo";
import Home from "./pages/Home";

const Admin = lazy(() => import("./pages/Admin"));
const Account = lazy(() => import("./pages/Account"));
const Listings = lazy(() => import("./pages/Listings"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Profile = lazy(() => import("./pages/Profile"));
const FollowedSellers = lazy(() => import("./pages/FollowedSellers"));
const Sell = lazy(() => import("./pages/Sell"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const Verification = lazy(() => import("./pages/Verification"));

function SeoMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const metadata = getSeoMetadata(location);
    document.title = metadata.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", metadata.description);
    document.querySelector('meta[name="robots"]')?.setAttribute("content", metadata.robots);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", metadata.canonical);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", metadata.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", metadata.description);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", metadata.canonical);
  }, [location]);

  return null;
}

function Router() {
  return <Suspense fallback={<main className="page-wrap section-space" role="status" aria-live="polite">Chargement de la page…</main>}><Switch><Route path="/" component={Home} /><Route path="/compte" component={Account} /><Route path="/annonces" component={Listings} /><Route path="/explorer" component={Listings} /><Route path="/annonce/:id">{params => <ListingDetail id={params.id} />}</Route><Route path="/annonces/:id">{params => <ListingDetail id={params.id} />}</Route><Route path="/vendeur/:id">{params => <SellerProfile id={params.id} />}</Route><Route path="/profil" component={Profile} /><Route path="/suivis" component={FollowedSellers} /><Route path="/abonnements" component={FollowedSellers} /><Route path="/verification" component={Verification} /><Route path="/vendre" component={Sell} /><Route path="/messages" component={Messages} /><Route path="/administration" component={Admin} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></Suspense>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><SeoMetadata /><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
