import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { getSeoMetadata } from "./lib/seo";
import Admin from "./pages/Admin";
import Account from "./pages/Account";
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import FollowedSellers from "./pages/FollowedSellers";
import Sell from "./pages/Sell";
import SellerProfile from "./pages/SellerProfile";
import Verification from "./pages/Verification";

function SeoMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const metadata = getSeoMetadata(location);
    document.title = metadata.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", metadata.description);
    document.querySelector('meta[name="robots"]')?.setAttribute("content", metadata.robots);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", metadata.canonical);
  }, [location]);

  return null;
}

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/compte" component={Account} /><Route path="/annonces" component={Listings} /><Route path="/annonce/:id">{params => <ListingDetail id={params.id} />}</Route><Route path="/vendeur/:id">{params => <SellerProfile id={params.id} />}</Route><Route path="/profil" component={Profile} /><Route path="/suivis" component={FollowedSellers} /><Route path="/verification" component={Verification} /><Route path="/vendre" component={Sell} /><Route path="/messages" component={Messages} /><Route path="/administration" component={Admin} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><SeoMetadata /><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
