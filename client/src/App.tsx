import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { DigitalClock } from "./components/digital-clock";
import { SettingsOverlay } from "@/components/settings-overlay";
import { BottomNavigation } from "@/components/bottom-navigation";
import Dashboard from "@/pages/dashboard";
import Chapters from "@/pages/chapters";
import Quiz from "./pages/quiz";
import Analytics from "./pages/analytics";
import Storage from "./pages/storage";
import Chat from "./pages/chat";
import Calendar from "./pages/calendar";
// ChapterDetails component removed
import NotFound from "./pages/not-found";
import { BrainCircuit, Sparkles } from "lucide-react";
import Study from "@/pages/study";
import BookDetails from "@/pages/book-details";

function Router() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [location, setLocation] = useLocation();

  // Check if current page is dashboard/home
  const isHomePage = location === "/" || location === "/dashboard";

  // Functions to handle dashboard actions from nav
  const handleShowStats = () => {
    // Force navigation with state update
    setLocation('/dashboard');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('showStats'));
    }, 100);
  };

  const handleShowSettings = () => {
    // Force navigation with state update
    setLocation('/dashboard');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('showSettings'));
    }, 100);
  };

  return (
    <div className="bg-black text-white min-h-screen overflow-x-hidden custom-scrollbar">
      {/* Enhanced Header with iOS-style glass morphism */}
      {isHomePage && (
        <header className="fixed top-0 left-0 right-0 z-50 slide-up">
          <div className="mx-4 mt-4">
            <div className="glass-card smooth-transition">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-4">
                  <div className="">
                    <div className="0"></div>


                  </div>
                  <div>
                    <h1 className="text-xl font-semibold gradient-text tracking-tight">Neet Practice</h1>
                    <p className="text-xs text-gray-400 font-medium">
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <DigitalClock onShowStats={handleShowStats} onShowSettings={handleShowSettings} />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Enhanced main content area */}
      <main className={`pb-32 px-4 smooth-transition ${isHomePage ? 'pt-32' : 'pt-6'}`}>
        <div className="max-w-md mx-auto">
          <Switch>
            <Route path="/" component={Study} />
            <Route path="/dashboard" component={() => <Dashboard />} />
            <Route path="/study" component={Study} />
            <Route path="/chapters" component={Chapters} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/chat" component={Chat} />
            <Route path="/storage" component={Storage} />
            <Route path="/quiz" component={Quiz} />
            <Route path="/book/:id" component={BookDetails} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>

      <BottomNavigation />
      <SettingsOverlay />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Set dark mode by default
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}