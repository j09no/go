import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderPlus, Upload, FileText, Image, Download, Search, MoreVertical, Folder, ArrowLeft, Trash2, Database, Save, RefreshCw, HardDrive, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteConfirmationModal } from '@/components/delete-confirmation-modal';
import { DatabaseManager } from '@/components/database-manager';
import { neon } from '@neondatabase/serverless';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// PDF.js worker setup - Use version-specific worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface FileItem {
  id: number;
  name: string;
  type: "folder" | "pdf" | "image" | "document";
  size?: string;
  modified: string;
  path: string;
}

export default function Storage() {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showDatabaseManager, setShowDatabaseManager] = useState(false);
  const [backups, setBackups] = useState<string[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'file' | 'folder';
    item: any;
  }>({ isOpen: false, type: 'file', item: null });

  // PDF viewer state
  const [pdfViewerState, setPdfViewerState] = useState<{
    isOpen: boolean;
    file: FileItem | null;
    numPages: number | null;
    pageNumber: number;
    scale: number;
    error: string | null;
    pdfUrl?: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    file: null,
    numPages: null,
    pageNumber: 1,
    scale: 1.0,
    error: null,
    pdfUrl: undefined,
    isLoading: false
  });

  // Neon database setup
  const neonUrl = import.meta.env.VITE_DATABASE_URL;
  const sql = neonUrl ? neon(neonUrl) : null;

  // Direct database functions
  const getBackups = async (): Promise<string[]> => {
    if (!sql) {
      const stored = localStorage.getItem('backups');
      return stored ? JSON.parse(stored) : [];
    }

    try {
      await sql(`
        CREATE TABLE IF NOT EXISTS backups (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result = await sql('SELECT name FROM backups ORDER BY created_at DESC');
      return result.map((row: any) => row.name);
    } catch (error) {
      console.error('Error fetching backups:', error);
      return [];
    }
  };

  const initNeonDatabase = async () => {
    if (!sql) {
      console.log('Neon not configured for storage, using SQL.js fallback');
      return;
    }
    try {
      // Create files table with content column
      await sql(`
        CREATE TABLE IF NOT EXISTS files (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          size TEXT,
          path TEXT NOT NULL,
          content TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add content column if it doesn't exist (for existing tables)
      await sql(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='files' AND column_name='content') THEN
            ALTER TABLE files ADD COLUMN content TEXT;
          END IF;
        END $$;
      `);

      // Create folders table
      await sql(`
        CREATE TABLE IF NOT EXISTS folders (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('Neon storage tables initialized successfully');
    } catch (error) {
      console.error('Error initializing Neon storage tables:', error);
    }
  };

  const getNeonFiles = async (): Promise<FileItem[]> => {
    if (!sql) {
      const stored = localStorage.getItem('storage_files');
      return stored ? JSON.parse(stored) : [];
    }

    try {
      const result = await sql('SELECT * FROM files ORDER BY created_at DESC');
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type as FileItem['type'],
        size: row.size,
        modified: new Date(row.created_at).toLocaleDateString(),
        path: row.path,
        content: row.content // Include content in the file item
      }));
    } catch (error) {
      console.error('Error getting files from Neon:', error);
      return [];
    }
  };

  const getNeonFolders = async (): Promise<FileItem[]> => {
    if (!sql) {
      const stored = localStorage.getItem('storage_folders');
      return stored ? JSON.parse(stored) : [];
    }

    try {
      const result = await sql('SELECT * FROM folders ORDER BY created_at DESC');
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: "folder" as const,
        modified: new Date(row.created_at).toLocaleDateString(),
        path: row.path
      }));
    } catch (error) {
      console.error('Error getting folders from Neon:', error);
      return [];
    }
  };

  const createNeonFile = async (fileData: { name: string; type: string; size?: string; path: string; content?: string }): Promise<FileItem> => {
    const newFile = {
      id: Date.now(),
      name: fileData.name,
      type: fileData.type as FileItem['type'],
      size: fileData.size,
      modified: new Date().toLocaleDateString(),
      path: fileData.path,
      content: fileData.content
    };

    if (!sql) {
      const stored = localStorage.getItem('storage_files');
      const files = stored ? JSON.parse(stored) : [];
      files.push(newFile);
      localStorage.setItem('storage_files', JSON.stringify(files));
      return newFile;
    }

    try {
      const result = await sql(
        'INSERT INTO files (name, type, size, path, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [fileData.name, fileData.type, fileData.size || null, fileData.path, fileData.content || null]
      );
      return {
        id: result[0].id,
        name: result[0].name,
        type: result[0].type as FileItem['type'],
        size: result[0].size,
        modified: new Date(result[0].created_at).toLocaleDateString(),
        path: result[0].path,
        content: result[0].content
      };
    } catch (error) {
      console.error('Error creating file in Neon:', error);
      throw error;
    }
  };

  const createNeonFolder = async (folderData: { name: string; path: string }): Promise<FileItem> => {
    const newFolder = {
      id: Date.now(),
      name: folderData.name,
      type: "folder" as const,
      modified: new Date().toLocaleDateString(),
      path: folderData.path
    };

    if (!sql) {
      const stored = localStorage.getItem('storage_folders');
      const folders = stored ? JSON.parse(stored) : [];
      folders.push(newFolder);
      localStorage.setItem('storage_folders', JSON.stringify(folders));
      return newFolder;
    }

    try {
      const result = await sql(
        'INSERT INTO folders (name, path) VALUES ($1, $2) RETURNING *',
        [folderData.name, folderData.path]
      );
      return {
        id: result[0].id,
        name: result[0].name,
        type: "folder" as const,
        modified: new Date(result[0].created_at).toLocaleDateString(),
        path: result[0].path
      };
    } catch (error) {
      console.error('Error creating folder in Neon:', error);
      throw error;
    }
  };

  const deleteNeonFile = async (id: number): Promise<boolean> => {
    if (!sql) {
      const stored = localStorage.getItem('storage_files');
      const files = stored ? JSON.parse(stored) : [];
      const filtered = files.filter((f: any) => f.id !== id);
      localStorage.setItem('storage_files', JSON.stringify(filtered));
      return true;
    }

    try {
      await sql('DELETE FROM files WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting file from Neon:', error);
      return false;
    }
  };

  const deleteNeonFolder = async (id: number): Promise<boolean> => {
    if (!sql) {
      const stored = localStorage.getItem('storage_folders');
      const folders = stored ? JSON.parse(stored) : [];
      const filtered = folders.filter((f: any) => f.id !== id);
      localStorage.setItem('storage_folders', JSON.stringify(filtered));
      return true;
    }

    try {
      await sql('DELETE FROM folders WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting folder from Neon:', error);
      return false;
    }
  };

  // Load files and folders using Neon functions
  useEffect(() => {
    const loadData = async () => {
      try {
        await initNeonDatabase();

        const [filesData, foldersData] = await Promise.all([
          getNeonFiles(),
          getNeonFolders()
        ]);

        const allItems: FileItem[] = [...foldersData, ...filesData];
        setFiles(allItems);
      } catch (error) {
        console.error('Error loading files and folders:', error);
      }
    };

    loadData();
    loadBackups();
  }, []);

  // Load available backups
  const loadBackups = async () => {
    try {
      const availableBackups = await getBackups();
      setBackups(availableBackups);
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const getFileIcon = (type: string) => {
    // Use book icon for all file types
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <img 
          src="/book-icon.png"
          alt="Book with Feather Icon" 
          className="w-8 h-8 object-contain"
        />
      </div>
    );
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const folderItem = await createNeonFolder({
          name: newFolderName,
          path: `${currentPath}${newFolderName.toLowerCase().replace(/\s+/g, '-')}`
        });

        setFiles(prev => [...prev, folderItem]);
        setNewFolderName("");
        setIsCreateFolderOpen(false);
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Content = e.target?.result as string; // Store the file content as base64

          const fileData = {
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' :
                  file.type === 'application/pdf' ? 'pdf' : 'document',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            path: `${currentPath}${file.name}`,
            content: base64Content
          };

          const fileItem = await createNeonFile(fileData);
          setFiles(prev => [...prev, fileItem]);
        };

        reader.onerror = (error) => {
          console.error('Error reading file:', error);
        };

        reader.readAsDataURL(file); // Read file as Data URL (base64)

      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      if ((file as any).content) {
        // If file content is available (base64), download the actual file
        const byteCharacters = atob((file as any).content.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.type === 'pdf' ? 'application/pdf' : 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = file.name; // Set the file name for download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

      } else {
        // If no content, create a placeholder text file
        const fileContent = `File: ${file.name}\nType: ${file.type}\nSize: ${file.size || 'Unknown'}\nPath: ${file.path}\nModified: ${file.modified}\n\nContent not available. Please re-upload the file.`;
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${file.name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleViewPDF = async (file: FileItem) => {
    try {
      setPdfViewerState({
        isOpen: true,
        file: file,
        numPages: null,
        pageNumber: 1,
        scale: 1.0,
        error: null,
        pdfUrl: undefined,
        isLoading: true
      });

      console.log('Starting PDF download and processing for:', file.name);

      let pdfUrl: string | undefined;

      if ((file as any).content && file.type === 'pdf') {
        try {
          // Use actual PDF content if available
          const base64Data = (file as any).content;

          // Check if it's a valid base64 data URL
          if (base64Data && typeof base64Data === 'string' && base64Data.startsWith('data:application/pdf;base64,')) {
            const base64String = base64Data.split(',')[1];

            // Validate base64 string
            if (base64String && base64String.length > 0) {
              try {
                const binaryString = atob(base64String);
                const bytes = new Uint8Array(binaryString.length);

                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
                pdfUrl = URL.createObjectURL(pdfBlob);

                console.log('PDF automatically downloaded and ready for viewing:', file.name);

                // Auto-cleanup after 5 minutes
                setTimeout(() => {
                  if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl);
                    console.log('PDF URL automatically cleaned up after 5 minutes');
                  }
                }, 5 * 60 * 1000); // 5 minutes

              } catch (decodingError) {
                console.warn('Error decoding base64 PDF content:', decodingError);
                throw new Error('Invalid base64 content');
              }
            } else {
              throw new Error('Empty base64 content');
            }
          } else {
            throw new Error('Invalid PDF data format');
          }
        } catch (contentError) {
          console.warn('Error processing PDF content:', contentError);
          // Fallback to demo PDF
          pdfUrl = await createDemoPDF(file);
        }
      } else {
        // Create a demo PDF if no content available
        console.log('No PDF content found, creating demo PDF for:', file.name);
        pdfUrl = await createDemoPDF(file);
      }

      if (pdfUrl) {
        setPdfViewerState(prev => ({
          ...prev,
          pdfUrl: pdfUrl,
          error: null,
          isLoading: false
        }));
      } else {
        throw new Error('Failed to create PDF URL');
      }

    } catch (error) {
      console.error('Error opening PDF:', error);
      setPdfViewerState(prev => ({
        ...prev,
        error: 'PDF को load करने में समस्या आई। कृपया फिर से try करें।',
        pdfUrl: undefined,
        isLoading: false
      }));
    }
  };

  const createDemoPDF = async (file: FileItem): Promise<string> => {
    // Create a simple demo PDF with better content
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 400
>>
stream
BT
/F1 16 Tf
50 720 Td
(NEET Practice - File Viewer) Tj
0 -40 Td
/F1 12 Tf
(File Name: ${file.name}) Tj
0 -24 Td
(Size: ${file.size || 'Unknown'}) Tj
0 -24 Td
(Modified: ${file.modified}) Tj
0 -24 Td
(Path: ${file.path}) Tj
0 -48 Td
(यह एक demo PDF है।) Tj
0 -24 Td
(असली PDF files upload करने के लिए,) Tj
0 -24 Td
(कृपया valid PDF files choose करें।) Tj
0 -48 Td
(This is a demo PDF placeholder.) Tj
0 -24 Td
(Upload actual PDF files to view them here.) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000066 00000 n 
0000000123 00000 n 
0000000283 00000 n 
0000000733 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
833
%%EOF`;

    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    return URL.createObjectURL(pdfBlob);
  };

  // PDF navigation and zoom functions
  const goToPrevPage = () => {
    setPdfViewerState(prev => ({
      ...prev,
      pageNumber: Math.max(prev.pageNumber - 1, 1)
    }));
  };

  const goToNextPage = () => {
    setPdfViewerState(prev => ({
      ...prev,
      pageNumber: Math.min(prev.pageNumber + 1, prev.numPages || 1)
    }));
  };

  const zoomIn = () => {
    setPdfViewerState(prev => ({
      ...prev,
      scale: Math.min(prev.scale + 0.2, 3.0)
    }));
  };

  const zoomOut = () => {
    setPdfViewerState(prev => ({
      ...prev,
      scale: Math.max(prev.scale - 0.2, 0.5)
    }));
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfViewerState(prev => ({
      ...prev,
      numPages: numPages,
      error: null,
      isLoading: false
    }));
    console.log('PDF loaded successfully with', numPages, 'pages');
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setPdfViewerState(prev => ({
      ...prev,
      error: 'PDF को load करने में समस्या आई।',
      isLoading: false
    }));
  };

  const closePdfViewer = () => {
    // Clean up object URL to prevent memory leaks
    if (pdfViewerState.pdfUrl) {
      URL.revokeObjectURL(pdfViewerState.pdfUrl);
    }

    setPdfViewerState({
      isOpen: false,
      file: null,
      numPages: null,
      pageNumber: 1,
      scale: 1.0,
      error: null,
      pdfUrl: undefined,
      isLoading: false
    });
  };

  const handleDeleteClick = (item: FileItem) => {
    setDeleteConfirmation({
      isOpen: true,
      type: item.type === 'folder' ? 'folder' : 'file',
      item
    });
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteConfirmation.type === 'folder') {
        await deleteNeonFolder(deleteConfirmation.item.id);
      } else {
        await deleteNeonFile(deleteConfirmation.item.id);
      }

      setFiles(prev => prev.filter(f => f.id !== deleteConfirmation.item.id));
      setDeleteConfirmation({ isOpen: false, type: 'file', item: null });

    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleFolderOpen = (folder: FileItem) => {
    if (folder.type === 'folder') {
      setCurrentPath(folder.path + '/');
    }
  };

  const handleBackNavigation = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      pathParts.pop();
      setCurrentPath('/' + pathParts.join('/') + (pathParts.length > 0 ? '/' : ''));
    }
  };

  const filteredFiles = files.filter(file => 
    file.path.startsWith(currentPath) && 
    file.path.replace(currentPath, '').split('/').length === 1 &&
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pathBreadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <section className="mb-8 slide-up">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 gradient-text">File Storage</h2>
        <p className="text-gray-400 font-medium">Manage your study files and documents</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="flex space-x-3">
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button className="ios-button-secondary text-sm font-medium">
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-0 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-semibold">Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="glass-card-subtle border-0 text-white placeholder:text-gray-500"
                />
                <div className="flex space-x-3">
                  <Button onClick={handleCreateFolder} className="flex-1 ios-button-primary font-medium">
                    Create
                  </Button>
                  <Button 
                    onClick={() => setIsCreateFolderOpen(false)}
                    className="flex-1 ios-button-secondary font-medium"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button className="ios-button-secondary text-sm font-medium" asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </label>
          </Button>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center space-x-2 mb-4">
        {currentPath !== '/' && (
          <Button variant="ghost" size="sm" onClick={handleBackNavigation}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <div className="flex items-center space-x-1 text-sm text-gray-400">
          <span>Home</span>
          {pathBreadcrumbs.map((part, index) => (
            <span key={index}>
              <span className="mx-1">/</span>
              <span>{part}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search files and folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#27272a] border-gray-700"
        />
      </div>

      {/* File Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFiles.map((file) => (
          <Card key={`${file.type}-${file.id}`} className="glass-card border-0 hover:glass-card-hover transition-all duration-300 cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="flex-1" 
                  onClick={() => file.type === 'folder' ? handleFolderOpen(file) : null}
                >
                  {getFileIcon(file.type)}
                  <h3 className="font-medium mt-2 mb-1 truncate">{file.name}</h3>
                  <div className="text-xs text-gray-400 space-y-1">
                    {file.size && <p>{file.size}</p>}
                    <p>Modified {file.modified}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {file.type === 'pdf' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPDF(file)}
                      className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                      title="View PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  )}
                  {file.type !== 'folder' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(file)}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">No files or folders found</div>
          {searchQuery && (
            <Button variant="ghost" onClick={() => setSearchQuery("")}>
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, type: 'file', item: null })}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteConfirmation.type === 'file' ? 'File' : 'Folder'}`}
        description={`Are you sure you want to delete this ${deleteConfirmation.type}? This action cannot be undone.`}
        itemName={deleteConfirmation.item?.name}
      />

      {/* PDF Viewer Modal */}
      <Dialog open={pdfViewerState.isOpen} onOpenChange={(open) => !open && closePdfViewer()}>
        <DialogContent className="max-w-6xl max-h-[95vh] bg-gray-900 border-gray-700 overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <DialogTitle className="text-white text-lg font-semibold truncate">
              📄 {pdfViewerState.file?.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={closePdfViewer}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </DialogHeader>

          {pdfViewerState.error ? (
            <div className="flex items-center justify-center h-96 text-red-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">PDF Viewer Error</p>
                <p className="text-sm mt-2">{pdfViewerState.error}</p>
                <Button 
                  onClick={() => handleViewPDF(pdfViewerState.file!)}
                  className="mt-4 ios-button-primary"
                >
                  फिर से try करें
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* PDF Controls */}
              <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg mb-4">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={pdfViewerState.pageNumber <= 1}
                    className="text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="text-white text-sm">
                    Page {pdfViewerState.pageNumber} of {pdfViewerState.numPages || '?'}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={pdfViewerState.pageNumber >= (pdfViewerState.numPages || 1)}
                    className="text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    className="text-white hover:bg-gray-700"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>

                  <span className="text-white text-sm">
                    {Math.round(pdfViewerState.scale * 100)}%
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomIn}
                    className="text-white hover:bg-gray-700"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(pdfViewerState.file!)}
                    className="text-white hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* PDF Document Display */}
              <div className="flex justify-center overflow-auto max-h-[70vh] bg-gray-800 rounded-lg p-4">
                {pdfViewerState.isLoading ? (
                  <div className="flex items-center justify-center h-96 text-white">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-lg font-medium">PDF automatically downloading और preparing...</p>
                      <p className="text-sm mt-2 text-gray-300">
                        File: {pdfViewerState.file?.name}
                      </p>
                      <p className="text-sm text-gray-300">
                        Size: {pdfViewerState.file?.size || 'Unknown'}
                      </p>
                    </div>
                  </div>
                ) : pdfViewerState.pdfUrl ? (
                  <div className="text-center">
                    <Document
                      file={pdfViewerState.pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading={
                        <div className="text-white">
                          <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          Loading PDF...
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pdfViewerState.pageNumber}
                        scale={pdfViewerState.scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="mx-auto shadow-lg"
                      />
                    </Document>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-white">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">PDF preparing...</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
