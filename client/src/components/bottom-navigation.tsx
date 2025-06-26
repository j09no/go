import { useLocation } from "wouter";
import { Home, BookOpen, PlayCircle, BarChart3, Calendar, FolderOpen, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", label: "Home", icon: Home, gradient: "from-blue-500 to-purple-500" },
  { path: "/study", label: "Study", icon: BookOpen, gradient: "from-green-500 to-emerald-500" },
  { path: "/quiz", label: "Quiz", icon: PlayCircle, gradient: "from-orange-500 to-red-500" },
  { path: "/calendar", label: "Calendar", icon: Calendar, gradient: "from-purple-500 to-pink-500" },
  { path: "/storage", label: "Files", icon: FolderOpen, gradient: "from-yellow-500 to-orange-500" },
  { path: "/chat", label: "Chat", icon: MessageCircle, gradient: "from-teal-500 to-cyan-500" },
];

export function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-3 mb-2">
        <div className="glass-card-subtle rounded-3xl px-1 py-1">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path || (location === "/" && item.path === "/dashboard");

              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={cn(
                    "flex flex-col items-center py-2 px-2 rounded-2xl smooth-transition relative group min-w-0",
                    "hover:bg-white/5 active:scale-95",
                    isActive ? "text-white" : "text-gray-500"
                  )}
                >
                  {/* Active indicator background */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10"></div>
                  )}

                  <div className="relative z-10 flex flex-col items-center">
                    <Icon className={cn(
                      "w-4 h-4 transition-all mb-1",
                      isActive && "scale-110 drop-shadow-sm"
                    )} />

                    <span className={cn(
                      "text-[10px] transition-all duration-200 font-medium leading-tight",
                      isActive ? "font-semibold text-white" : "text-gray-500"
                    )}>
                      {item.label}
                    </span>
                  </div>

                  {/* Active dot indicator */}
                  {isActive && (
                    <div className={`absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-0.5 rounded-full bg-gradient-to-r ${item.gradient} opacity-60`}></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}