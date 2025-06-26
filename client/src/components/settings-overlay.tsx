import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Settings, Moon, Bell, User, Download } from "lucide-react";
// Simple Switch component inline
const Switch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
  <button
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-600'
    }`}
    onClick={() => onCheckedChange(!checked)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/* From Uiverse.io by Yaya12085 */
const customFileUploadStyles = `
  height: 200px;
  width: 300px;
  display: flex;
  flex-direction: column;
  align-items: space-between;
  gap: 20px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border: 2px dashed #cacaca;
  background-color: rgba(255, 255, 255, 1);
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0px 48px 35px -48px rgba(0,0,0,0.1);
`;

const customFileUploadIconStyles = `
  display: flex;
  align-items: center;
  justify-content: center;
`;

const customFileUploadIconSvgStyles = `
  height: 80px;
  fill: rgba(75, 85, 99, 1);
`;

const customFileUploadTextStyles = `
  display: flex;
  align-items: center;
  justify-content: center;
`;

const customFileUploadTextSpanStyles = `
  font-weight: 400;
  color: rgba(75, 85, 99, 1);
`;

const customFileUploadInputStyles = `
  display: none;
`;

export function SettingsOverlay({ isOpen, onClose }: SettingsOverlayProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="absolute top-20 right-6 w-80 animate-slide-up">
        <Card className="bg-jet-light border-glass-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-bold">Settings</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClose()}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <Button variant="ghost" className="w-full justify-start">
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </Button>

            <Button variant="ghost" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Import Questions (CSV)
            </Button>

            <div className="text-sm text-gray-400 text-center mt-4">
              Background images can be managed from the Dashboard settings.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}