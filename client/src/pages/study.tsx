import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Book, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useLocation } from "wouter";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import { neon } from '@neondatabase/serverless';
import "@/components/ui/animated-card.css";

import type { Subject, Book as BookType } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

const neonUrl = import.meta.env.VITE_DATABASE_URL;
const sql = neonUrl ? neon(neonUrl) : null;

type Book = {
  id: number;
  title: string;
  description: string;
  background_image?: string;
  side_image?: string;
  createdAt?: string;
};

// Neon DB Functions
const deleteBookWithCascade = async (bookId: number): Promise<void> => {
  try {
    // Get all chapter IDs for this book
    const chapters = await sql('SELECT id FROM chapters WHERE book_id = $1', [bookId]);
    const chapterIds = chapters.map((chapter: any) => chapter.id);

    // Delete JSON files for all chapters in this book
    if (chapterIds.length > 0) {
      await sql(`DELETE FROM json_files WHERE chapter_id = ANY($1)`, [chapterIds]);
      await sql(`DELETE FROM questions WHERE chapter_id = ANY($1)`, [chapterIds]);
    }

    // Delete all chapters for this book
    await sql('DELETE FROM chapters WHERE book_id = $1', [bookId]);

    // Finally delete the book
    await sql('DELETE FROM books WHERE id = $1', [bookId]);

    console.log(`Successfully deleted book ${bookId} with all its chapters and JSON files`);
  } catch (error) {
    console.error('Error deleting book with cascade:', error);
    throw error;
  }
};

const createNeonBook = async (bookData: { title: string; description?: string }): Promise<Book> => {
  try {
    // Generate a unique ID
    const bookId = Date.now();
    const subjectId = 1; // Default subject ID
    
    const result = await sql(
      'INSERT INTO books (id, subject_id, title, description, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [bookId, subjectId, bookData.title, bookData.description || '']
    );
    return result[0] as Book;
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
};

const updateBookImages = async (bookId: number, uploadType: 'both' | 'side' | 'background', backgroundUrl?: string, sideUrl?: string): Promise<void> => {
  try {
    let query = '';
    let params: any[] = [];

    if (uploadType === 'both') {
      query = 'UPDATE books SET background_image = $1, side_image = $2 WHERE id = $3';
      params = [backgroundUrl, sideUrl, bookId];
    } else if (uploadType === 'side') {
      query = 'UPDATE books SET side_image = $1 WHERE id = $2';
      params = [sideUrl, bookId];
    } else if (uploadType === 'background') {
      query = 'UPDATE books SET background_image = $1 WHERE id = $2';
      params = [backgroundUrl, bookId];
    }

    await sql(query, params);
    console.log(`Successfully updated book ${bookId} images`);
  } catch (error) {
    console.error('Error updating book images:', error);
    throw error;
  }
};

const getNeonBooks = async (): Promise<Book[]> => {
  try {
    const result = await sql('SELECT * FROM books ORDER BY created_at DESC');
    return result as Book[];
  } catch (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
};

const initBooksTable = async (): Promise<void> => {
  try {
    // Create table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id BIGINT PRIMARY KEY,
        subject_id INTEGER DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Add missing columns if they don't exist
    await sql`
      DO $$ 
      BEGIN
        -- Add background_image column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='books' AND column_name='background_image') THEN
          ALTER TABLE books ADD COLUMN background_image TEXT DEFAULT NULL;
        END IF;
        
        -- Add side_image column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='books' AND column_name='side_image') THEN
          ALTER TABLE books ADD COLUMN side_image TEXT DEFAULT NULL;
        END IF;
      END $$;
    `;
    
    console.log('Books table initialized successfully');
  } catch (error) {
    console.error('Error initializing books table:', error);
    throw error;
  }
};

export default function Study() {
  const [, setLocation] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState("1");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    book: any;
  }>({ isOpen: false, book: null });
  const [imageUploadModal, setImageUploadModal] = useState<{
    isOpen: boolean;
    bookId: number | null;
    uploadType: 'both' | 'side' | 'background' | null;
    isUploading: boolean;
  }>({ isOpen: false, bookId: null, uploadType: null, isUploading: false });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    initBooksTable().catch(console.error);
  }, []);

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects");
      return response.json();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["neon-books"],
    queryFn: getNeonBooks,
  });

  const createBookMutation = useMutation({
    mutationFn: createNeonBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neon-books"] });
      toast({ title: "Book created successfully!" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: deleteBookWithCascade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neon-books"] });
      toast({ title: "Book deleted successfully!" });
      setDeleteConfirmation({ isOpen: false, book: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete book",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const imageUploadMutation = useMutation({
    mutationFn: async ({ bookId, uploadType, file }: { bookId: number; uploadType: 'both' | 'side' | 'background'; file: File }) => {
      // Convert file to base64 for storage
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      if (uploadType === 'both') {
        await updateBookImages(bookId, uploadType, base64, base64);
      } else if (uploadType === 'side') {
        await updateBookImages(bookId, uploadType, undefined, base64);
      } else if (uploadType === 'background') {
        await updateBookImages(bookId, uploadType, base64);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neon-books"] });
      toast({ title: "Images updated successfully!" });
      setImageUploadModal({ isOpen: false, bookId: null, uploadType: null, isUploading: false });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update images",
        description: error.message,
        variant: "destructive",
      });
      setImageUploadModal(prev => ({ ...prev, isUploading: false }));
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createBookMutation.mutate(data);
  };

  // Show all books instead of filtering by subject
  const allBooks = data || [];

  if (isLoading) {
    return (
      <section className="mb-8 slide-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 gradient-text">Study Books</h2>
            <p className="text-gray-400 font-medium">Organize your chapters in books</p>
          </div>
          <div className="w-32 h-10 glass-card-subtle rounded-xl pulse-animation"></div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-6">
                <div className="w-32 h-6 glass-card-subtle rounded-lg mb-3 pulse-animation"></div>
                <div className="w-full h-4 glass-card-subtle rounded-lg mb-4 pulse-animation"></div>
                <div className="flex space-x-3">
                  <div className="flex-1 h-10 glass-card-subtle rounded-xl pulse-animation"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  const handleDeleteBook = (bookId: number) => {
    setDeleteConfirmation({
      isOpen: true,
      book: { id: bookId }, // Only the ID is needed for deletion
    });
  };

  const handleImageUpload = (bookId: number) => {
    setImageUploadModal({ isOpen: true, bookId, uploadType: null, isUploading: false });
  };

  const handleFileUpload = (file: File) => {
    if (!imageUploadModal.bookId || !imageUploadModal.uploadType) return;
    
    setImageUploadModal(prev => ({ ...prev, isUploading: true }));
    imageUploadMutation.mutate({
      bookId: imageUploadModal.bookId,
      uploadType: imageUploadModal.uploadType,
      file
    });
  };

  return (
    <section className="mb-8 slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 gradient-text">Study Books</h2>
          <p className="text-gray-400 font-medium">Organize your chapters in books</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="ios-button-primary flex items-center space-x-2 px-4 py-2 font-medium">
              <Plus className="w-4 h-4" />
              <span>Add Book</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-0 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold">
                Add New Book
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new book to organize your study materials.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 font-medium">Book Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Mechanics Book"
                          {...field}
                          className="glass-card-subtle border-0 text-white placeholder:text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 font-medium">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Book description"
                          {...field}
                          className="glass-card-subtle border-0 text-white placeholder:text-gray-500 min-h-20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full ios-button-primary h-11 font-medium"
                  disabled={createBookMutation.isPending}
                >
                  {createBookMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="ios-spinner"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Create Book"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Subject Tabs */}
      {/* <Tabs value={selectedSubject} onValueChange={setSelectedSubject} className="mb-6">
        <TabsList className="glass-morphism w-full">
          {subjects?.map((subject) => (
            <TabsTrigger
              key={subject.id}
              value={subject.id.toString()}
              className="flex-1"
            >
              {subject.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs> */}

      {/* Books Grid */}
      <div className="grid gap-4">
        {data && data.length > 0 ? (
          data.map((book) => (
            <div key={book.id} className="flex justify-center">
              <AnimatedCard
                title={book.title}
                imageUrl={book.side_image || "/bgg.jpg"}
                backgroundImage={book.background_image || "/bg.jpg"}
                onDelete={() => setDeleteConfirmation({ isOpen: true, book })}
                onUpload={() => handleImageUpload(book.id)}
                onEnter={() => setLocation(`/book/${book.id}`)}
              />
            </div>
          ))
        ) : (
          <Card className="glass-morphism">
            <CardContent className="p-6 text-center">
              <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No books found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, book: null })}
        onConfirm={() => {
          if (deleteConfirmation.book) {
            deleteBookMutation.mutate(deleteConfirmation.book.id);
            setDeleteConfirmation({ isOpen: false, book: null });
          }
        }}
        title="Delete Book"
        description="Are you sure you want to delete this book?"
      />

      {/* Image Upload Modal */}
      <Dialog open={imageUploadModal.isOpen} onOpenChange={(open) => !imageUploadModal.isUploading && setImageUploadModal({ isOpen: open, bookId: null, uploadType: null, isUploading: false })}>
        <DialogContent className="glass-card border-0 max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}>
              Upload Images
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose what you want to change for this book.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 p-2">
            {/* Radio Options */}
            <div className="radio-buttons">
              <label className="radio-button">
                <input 
                  type="radio" 
                  name="uploadOption" 
                  value="both"
                  checked={imageUploadModal.uploadType === 'both'}
                  onChange={(e) => setImageUploadModal(prev => ({ ...prev, uploadType: 'both' }))}
                />
                <div className="radio-circle"></div>
                <span className="radio-label">Change both</span>
              </label>
              <label className="radio-button">
                <input 
                  type="radio" 
                  name="uploadOption" 
                  value="side"
                  checked={imageUploadModal.uploadType === 'side'}
                  onChange={(e) => setImageUploadModal(prev => ({ ...prev, uploadType: 'side' }))}
                />
                <div className="radio-circle"></div>
                <span className="radio-label">Change side image</span>
              </label>
              <label className="radio-button">
                <input 
                  type="radio" 
                  name="uploadOption" 
                  value="background"
                  checked={imageUploadModal.uploadType === 'background'}
                  onChange={(e) => setImageUploadModal(prev => ({ ...prev, uploadType: 'background' }))}
                />
                <div className="radio-circle"></div>
                <span className="radio-label">Change background</span>
              </label>
            </div>

            {/* File Upload */}
            {imageUploadModal.uploadType && (
              <div className="mt-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="w-full p-3 glass-card-subtle border-0 text-white rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-500 file:text-white hover:file:bg-red-600"
                  disabled={imageUploadModal.isUploading}
                />
                {imageUploadModal.isUploading && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="ios-spinner"></div>
                    <span className="text-gray-400 text-sm">Uploading...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}