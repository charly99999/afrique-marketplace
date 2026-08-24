import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import Account from "./pages/Account";
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Sell from "./pages/Sell";
import SellerProfile from "./pages/SellerProfile";
import Verification from "./pages/Verification";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/compte" component={Account} /><Route path="/annonces" component={Listings} /><Route path="/annonce/:id">{params => <ListingDetail id={params.id} />}</Route><Route path="/vendeur/:id">{params => <SellerProfile id={params.id} />}</Route><Route path="/profil" component={Profile} /><Route path="/verification" component={Verification} /><Route path="/vendre" component={Sell} /><Route path="/messages" component={Messages} /><Route path="/administration" component={Admin} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
