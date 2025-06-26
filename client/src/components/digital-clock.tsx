import { useState, useEffect } from "react";
import { Sun, Moon, Settings, Clock, BarChart3 } from "lucide-react";

interface DigitalClockProps {
  onShowStats?: () => void;
  onShowSettings?: () => void;
}

export function DigitalClock({ onShowStats, onShowSettings }: DigitalClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.settings-dropdown')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);

  const timeString = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const hour = currentTime.getHours();
  const isDayTime = hour >= 6 && hour < 18;

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(false);
    onShowSettings?.();
  };

  const handleStatsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(false);
    onShowStats?.();
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="text-right">
        <div className="text-lg font-bold text-white tracking-tight">{timeString}</div>
        <div className="flex items-center justify-end space-x-2 text-xs text-gray-400 font-medium">
          <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
            isDayTime ? 'bg-yellow-400/20' : 'bg-indigo-400/20'
          }`}>
            {isDayTime ? (
              <Sun className="w-2 h-2 text-yellow-400" />
            ) : (
              <Moon className="w-2 h-2 text-indigo-400" />
            )}
          </div>
          <span>{isDayTime ? 'Day' : 'Night'}</span>
        </div>
      </div>
      <div className="relative settings-dropdown">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-11 h-11 glass-button-secondary flex items-center justify-center relative group"
        >
          <Settings className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        </button>

        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-black/90 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-50">
            <div className="p-2">
              <button
                onClick={handleSettingsClick}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-white hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Settings</span>
              </button>
              <button
                onClick={handleStatsClick}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-white hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="font-medium">View Stats</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
