import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Download, Upload, Save, Trash2, RefreshCw, HardDrive, Clock } from "lucide-react";

interface DatabaseManagerProps {
  onClose?: () => void;
}

export function DatabaseManager({ onClose }: DatabaseManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadDatabase = async () => {
    setIsLoading(true);
    try {
      // Simple backup functionality - export localStorage data
      const data = {
        bg_images: localStorage.getItem('bg_images'),
        quiz_stats: localStorage.getItem('quiz_stats'),
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading database:', error);
      alert('Error downloading database. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Restore localStorage data
        if (data.bg_images) localStorage.setItem('bg_images', data.bg_images);
        if (data.quiz_stats) localStorage.setItem('quiz_stats', data.quiz_stats);

        alert('Database uploaded successfully! The page will reload to apply changes.');
        window.location.reload();
      } catch (error) {
        console.error('Error uploading database:', error);
        alert('Error uploading database. Please check the file format.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClearAllData = async () => {
    if (confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        localStorage.clear();
        alert('All data cleared successfully!');
        window.location.reload();
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <Database className="w-6 h-6" />
          Database Management
        </h2>
        <p className="text-gray-400">
          Manage your application data with local storage backup and restore
        </p>
      </div>

      {/* Export/Import Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Export & Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleDownloadDatabase}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Backup
            </Button>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleUploadDatabase}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Backup
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Download your data to back it up or transfer to another device. Upload a .json file to restore data.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="glass-card border-red-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleClearAllData}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
          <p className="text-xs text-gray-400">
            This will permanently delete all your data including quiz stats and settings. This action cannot be undone.
          </p>
        </CardContent>
      </Card>

      {onClose && (
        <div className="flex justify-end">
          <Button onClick={onClose} className="glass-button">
            Close
          </Button>
        </div>
      )}
    </div>
  );
}