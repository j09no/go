import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Play, Upload, FileText, AlertCircle, CheckCircle, ArrowLeft, Zap } from "lucide-react";
import { Book as BookIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import { neon } from '@neondatabase/serverless';

import type { Chapter, Book } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

interface ParsedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  difficulty?: string;
}

interface JSONUploadState {
  isOpen: boolean;
  chapterId: number;
  chapterTitle: string;
  selectedFile: File | null;
  parsedQuestions: ParsedQuestion[];
  parseError: string | null;
  isUploading: boolean;
  isDragOver: boolean;
}

const neonUrl = import.meta.env.VITE_DATABASE_URL;
const sql = neonUrl ? neon(neonUrl) : null;

const initChaptersTable = async () => {
  if (!sql) {
    console.log('Neon not configured, using localStorage fallback');
    return;
  }

  try {
    // Create books table if it doesn't exist
    await sql(`
      CREATE TABLE IF NOT EXISTS books (
        id BIGINT PRIMARY KEY,
        subject_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create questions table if it doesn't exist
    await sql(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_answer INTEGER NOT NULL,
        explanation TEXT,
        difficulty TEXT DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create json_files table if it doesn't exist
    await sql(`
      CREATE TABLE IF NOT EXISTS json_files (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_content TEXT NOT NULL,
        question_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create quiz_counters table if it doesn't exist
    await sql(`
      CREATE TABLE IF NOT EXISTS quiz_counters (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER NOT NULL UNIQUE,
        click_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if chapters table exists and add book_id if missing
    await sql(`
      DO $$ 
      BEGIN
        -- Add book_id to chapters if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='book_id') THEN
          ALTER TABLE chapters ADD COLUMN book_id BIGINT;
        END IF;

        -- Add total_questions to chapters if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='total_questions') THEN
          ALTER TABLE chapters ADD COLUMN total_questions INTEGER DEFAULT 0;
        END IF;

        -- Add completed_questions to chapters if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='completed_questions') THEN
          ALTER TABLE chapters ADD COLUMN completed_questions INTEGER DEFAULT 0;
        END IF;

        -- Add difficulty to chapters if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='difficulty') THEN
          ALTER TABLE chapters ADD COLUMN difficulty TEXT DEFAULT 'medium';
        END IF;
      END $$;
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

const generateChapterId = (): number => {
  return Math.floor(Math.random() * 90000 + 10000);
};

const getBookById = async (bookId: number): Promise<Book | null> => {
  if (!sql) {
    const stored = localStorage.getItem('neon_books');
    const books = stored ? JSON.parse(stored) : [];
    return books.find((book: Book) => book.id === bookId) || null;
  }

  try {
    const result = await sql('SELECT * FROM books WHERE id = $1', [bookId]);
    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      subjectId: row.subject_id,
      title: row.title,
      description: row.description,
      createdAt: row.created_at
    };
  } catch (error) {
    console.error('Error fetching book:', error);
    const stored = localStorage.getItem('neon_books');
    const books = stored ? JSON.parse(stored) : [];
    return books.find((book: Book) => book.id === bookId) || null;
  }
};

const getChaptersByBook = async (bookId: number): Promise<Chapter[]> => {
  if (!sql) {
    const stored = localStorage.getItem('neon_book_chapters');
    const chapters = stored ? JSON.parse(stored) : [];
    return chapters.filter((chapter: Chapter) => chapter.bookId === bookId);
  }

  try {
    await initChaptersTable();

    // First check if the table exists and what columns it has
    const tableCheck = await sql(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chapters' AND table_schema = 'public'
    `);

    const columns = tableCheck.map((row: any) => row.column_name);
    console.log('Available columns in chapters table:', columns);

    // Use conditional query based on available columns
    let query = '';
    if (columns.includes('book_id')) {
      query = `
        SELECT 
          id, 
          book_id, 
          subject_id, 
          title, 
          COALESCE(description, '') as description, 
          COALESCE(total_questions, 0) as total_questions,
          COALESCE(completed_questions, 0) as completed_questions,
          COALESCE(difficulty, 'medium') as difficulty,
          created_at
        FROM chapters 
        WHERE book_id = $1 
        ORDER BY title ASC
      `;
    } else {
      // Fallback to subject_id if book_id doesn't exist
      const book = await getBookById(bookId);
      if (!book) return [];

      query = `
        SELECT 
          id, 
          subject_id, 
          title, 
          COALESCE(description, '') as description, 
          COALESCE(total_questions, 0) as total_questions,
          COALESCE(completed_questions, 0) as completed_questions,
          COALESCE(difficulty, 'medium') as difficulty,
          created_at
        FROM chapters 
        WHERE subject_id = $1 
        ORDER BY title ASC
      `;
      const result = await sql(query, [book.subjectId]);

      return result.map((row: any) => ({
        id: row.id,
        bookId: bookId,
        subjectId: row.subject_id,
        title: row.title,
        description: row.description,
        totalQuestions: row.total_questions || 0,
        completedQuestions: row.completed_questions || 0,
        difficulty: row.difficulty,
        createdAt: row.created_at
      }));
    }

    const result = await sql(query, [bookId]);

    return result.map((row: any) => ({
      id: row.id,
      bookId: row.book_id || bookId,
      subjectId: row.subject_id,
      title: row.title,
      description: row.description,
      totalQuestions: row.total_questions || 0,
      completedQuestions: row.completed_questions || 0,
      difficulty: row.difficulty,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Error fetching chapters:', error);
    const stored = localStorage.getItem('neon_book_chapters');
    const chapters = stored ? JSON.parse(stored) : [];
    return chapters.filter((chapter: Chapter) => chapter.bookId === bookId);
  }
};

const createChapterInBook = async (chapterData: {
  title: string;
  description?: string;
  bookId: number;
  subjectId: number;
}): Promise<Chapter> => {
  const chapterId = generateChapterId();
  const newChapter = {
    id: chapterId,
    bookId: chapterData.bookId,
    subjectId: chapterData.subjectId,
    title: chapterData.title,
    description: chapterData.description,
    totalQuestions: 0,
    completedQuestions: 0,
    difficulty: 'medium',
    createdAt: new Date().toISOString()
  };

  if (!sql) {
    const stored = localStorage.getItem('neon_book_chapters');
    const chapters = stored ? JSON.parse(stored) : [];
    chapters.push(newChapter);
    localStorage.setItem('neon_book_chapters', JSON.stringify(chapters));
    return newChapter;
  }

  try {
    await initChaptersTable();

    // Check if book_id column exists
    const tableCheck = await sql(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chapters' AND table_schema = 'public'
    `);

    const columns = tableCheck.map((row: any) => row.column_name);

    let result;
    if (columns.includes('book_id')) {
      // Use book_id if available
      result = await sql(
        'INSERT INTO chapters (id, book_id, subject_id, title, description, total_questions, completed_questions, difficulty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [chapterId, chapterData.bookId, chapterData.subjectId, chapterData.title, chapterData.description || '', 0, 0, 'medium']
      );
    } else {
      // Fallback to basic columns if book_id doesn't exist
      result = await sql(
        'INSERT INTO chapters (id, subject_id, title, description, difficulty) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [chapterId, chapterData.subjectId, chapterData.title, chapterData.description || '', 'medium']
      );
    }

    const row = result[0];
    return {
      id: row.id,
      bookId: row.book_id || chapterData.bookId,
      subjectId: row.subject_id,
      title: row.title,
      description: row.description,
      totalQuestions: row.total_questions || 0,
      completedQuestions: row.completed_questions || 0,
      difficulty: row.difficulty,
      createdAt: row.created_at
    };
  } catch (error) {
    console.error('Error creating chapter:', error);
    const stored = localStorage.getItem('neon_book_chapters');
    const chapters = stored ? JSON.parse(stored) : [];
    chapters.push(newChapter);
    localStorage.setItem('neon_book_chapters', JSON.stringify(chapters));
    return newChapter;
  }
};

const deleteBookWithCascade = async (bookId: number): Promise<void> => {
  if (!sql) {
    // Fallback to localStorage
    const storedBooks = localStorage.getItem('neon_books');
    const books = storedBooks ? JSON.parse(storedBooks) : [];
    const filteredBooks = books.filter((book: Book) => book.id !== bookId);
    localStorage.setItem('neon_books', JSON.stringify(filteredBooks));

    // Delete all chapters for this book
    const storedChapters = localStorage.getItem('neon_book_chapters');
    const chapters = storedChapters ? JSON.parse(storedChapters) : [];
    const bookChapters = chapters.filter((chapter: Chapter) => chapter.bookId === bookId);

    // Delete JSON files for each chapter
    const storedJsonFiles = localStorage.getItem('neon_json_files');
    if (storedJsonFiles) {
      const jsonFiles = JSON.parse(storedJsonFiles);
      const chapterIds = bookChapters.map((c: Chapter) => c.id);
      const filteredJsonFiles = jsonFiles.filter((f: any) => !chapterIds.includes(f.chapterId));
      localStorage.setItem('neon_json_files', JSON.stringify(filteredJsonFiles));
    }

    // Delete chapters
    const filteredChapters = chapters.filter((chapter: Chapter) => chapter.bookId !== bookId);
    localStorage.setItem('neon_book_chapters', JSON.stringify(filteredChapters));
    return;
  }

  try {
    // Get all chapters for this book first
    const chaptersResult = await sql('SELECT id FROM chapters WHERE book_id = $1', [bookId]);
    const chapterIds = chaptersResult.map((row: any) => row.id);

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

const deleteChapterFromBook = async (id: number): Promise<void> => {
  if (!sql) {
    const stored = localStorage.getItem('neon_book_chapters');
    const chapters = stored ? JSON.parse(stored) : [];
    const filteredChapters = chapters.filter((chapter: Chapter) => chapter.id !== id);
    localStorage.setItem('neon_book_chapters', JSON.stringify(filteredChapters));

    const storedJsonFiles = localStorage.getItem('neon_json_files');
    if (storedJsonFiles) {
      const jsonFiles = JSON.parse(storedJsonFiles);
      const filteredJsonFiles = jsonFiles.filter((f: any) => f.chapterId !== id);
      localStorage.setItem('neon_json_files', JSON.stringify(filteredJsonFiles));
    }
    return;
  }

  try {
    // Delete JSON files first (cascade delete)
    await sql('DELETE FROM json_files WHERE chapter_id = $1', [id]);
    // Delete questions for this chapter
    await sql('DELETE FROM questions WHERE chapter_id = $1', [id]);
    // Finally delete the chapter
    await sql('DELETE FROM chapters WHERE id = $1', [id]);

    console.log(`Successfully deleted chapter ${id} with its JSON files and questions`);
  } catch (error) {
    console.error('Error deleting chapter:', error);
    const stored = localStorage.getItem('neon_book_chapters');
    const chapters = stored ? JSON.parse(stored) : [];
    const filteredChapters = chapters.filter((chapter: Chapter) => chapter.id !== id);
    localStorage.setItem('neon_book_chapters', JSON.stringify(filteredChapters));
  }
};

const checkDuplicateChapterName = async (title: string, bookId: number): Promise<boolean> => {
  if (!sql) {
    const stored = localStorage.getItem('neon_book_chapters');
    const chapters = stored ? JSON.parse(stored) : [];
    return chapters.some((chapter: Chapter) => 
      chapter.title.toLowerCase() === title.toLowerCase() && chapter.bookId === bookId
    );
  }

  try {
    const result = await sql(
      'SELECT COUNT(*) as count FROM chapters WHERE LOWER(title) = LOWER($1) AND book_id = $2',
      [title, bookId]
    );
    return result[0].count > 0;
  } catch (error) {
    console.error('Error checking duplicate chapter name:', error);
    return false;
  }
};

const saveJsonFileToNeon = async (data: {
  chapterId: number;
  filename: string;
  fileContent: string;
  questionCount: number;
}) => {
  if (!sql) {
    // Fallback to localStorage
    const stored = localStorage.getItem('neon_json_files');
    const files = stored ? JSON.parse(stored) : [];
    const newFile = {
      id: Date.now(),
      chapter_id: data.chapterId,
      filename: data.filename,
      file_content: data.fileContent,
      question_count: data.questionCount,
      created_at: new Date().toISOString()
    };
    files.push(newFile);
    localStorage.setItem('neon_json_files', JSON.stringify(files));

    // Also update chapter's total_questions
    const chaptersStored = localStorage.getItem('neon_chapters');
    if (chaptersStored) {
      const chapters = JSON.parse(chaptersStored);
      const chapterIndex = chapters.findIndex((c: any) => c.id === data.chapterId);
      if (chapterIndex !== -1) {
        chapters[chapterIndex].total_questions = data.questionCount;
        localStorage.setItem('neon_chapters', JSON.stringify(chapters));
      }
    }

    return newFile;
  }

  try {
    // First ensure all required tables exist with proper structure
    await sql(`
      CREATE TABLE IF NOT EXISTS json_files (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_content TEXT NOT NULL,
        question_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Also ensure chapters table has the required columns
    await sql(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='total_questions') THEN
          ALTER TABLE chapters ADD COLUMN total_questions INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='completed_questions') THEN
          ALTER TABLE chapters ADD COLUMN completed_questions INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);

    // Save the JSON file
    const result = await sql(
      'INSERT INTO json_files (chapter_id, filename, file_content, question_count) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.chapterId, data.filename, data.fileContent, data.questionCount]
    );

    // Update the chapter's total_questions count
    await sql(
      'UPDATE chapters SET total_questions = $1 WHERE id = $2',
      [data.questionCount, data.chapterId]
    );

    console.log('Successfully saved JSON file and updated chapter questions count');
    return result[0];
  } catch (error) {
    console.error('Error saving JSON file:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem('neon_json_files');
    const files = stored ? JSON.parse(stored) : [];
    const newFile = {
      id: Date.now(),
      chapter_id: data.chapterId,
      filename: data.filename,
      file_content: data.fileContent,
      question_count: data.questionCount,
      created_at: new Date().toISOString()
    };
    files.push(newFile);
    localStorage.setItem('neon_json_files', JSON.stringify(files));

    // Also update chapter's total_questions
    const chaptersStored = localStorage.getItem('neon_chapters');
    if (chaptersStored) {
      const chapters = JSON.parse(chaptersStored);
      const chapterIndex = chapters.findIndex((c: any) => c.id === data.chapterId);
      if (chapterIndex !== -1) {
        chapters[chapterIndex].total_questions = data.questionCount;
        localStorage.setItem('neon_chapters', JSON.stringify(chapters));
      }
    }

    return newFile;
  }
};

const getNeonJsonFile = async (chapterId: number) => {
  if (!sql) {
    const stored = localStorage.getItem('neon_json_files');
    const files = stored ? JSON.parse(stored) : [];
    const file = files.find((file: any) => file.chapter_id === chapterId);
    console.log('Found JSON file in localStorage:', file ? 'Yes' : 'No');
    return file;
  }

  try {
    const result = await sql('SELECT * FROM json_files WHERE chapter_id = $1 ORDER BY created_at DESC LIMIT 1', [chapterId]);
    const file = result[0] || null;
    console.log('Found JSON file in Neon DB:', file ? 'Yes' : 'No');
    return file;
  } catch (error) {
    console.error('Error fetching JSON file:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem('neon_json_files');
    const files = stored ? JSON.parse(stored) : [];
    const file = files.find((file: any) => file.chapter_id === chapterId);
    console.log('Found JSON file in localStorage (fallback):', file ? 'Yes' : 'No');
    return file;
  }
};

const getRandomBackgroundImage = async (): Promise<string> => {
  if (!sql) {
    return '/bg.jpg'; // Default fallback
  }

  try {
    const result = await sql('SELECT image_data FROM bgie ORDER BY RANDOM() LIMIT 1');
    if (result.length > 0) {
      return result[0].image_data;
    }
    return '/bg.jpg'; // Default if no images in database
  } catch (error) {
    console.error('Error fetching background image:', error);
    return '/bg.jpg'; // Default fallback
  }
};

export default function BookDetails() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/book/:id");
  const bookId = params?.id ? parseInt(params.id) : 0;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jsonUploadModal, setJsonUploadModal] = useState<JSONUploadState>({
    isOpen: false,
    chapterId: 0,
    chapterTitle: "",
    selectedFile: null,
    parsedQuestions: [],
    parseError: null,
    isUploading: false,
    isDragOver: false
  });
  const { toast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    chapter: any;
  }>({ isOpen: false, chapter: null });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [quizClickCounts, setQuizClickCounts] = useState<Record<number, number>>({});
  const [backgroundImages, setBackgroundImages] = useState<Record<number, string>>({});

  // Quiz click counter functions
  const getQuizClickCount = async (chapterId: number): Promise<number> => {
    if (!sql) {
      const stored = localStorage.getItem('quiz_click_counters');
      const counters = stored ? JSON.parse(stored) : {};
      return counters[chapterId] || 0;
    }

    try {
      const result = await sql('SELECT click_count FROM quiz_counters WHERE chapter_id = $1', [chapterId]);
      return result.length > 0 ? result[0].click_count : 0;
    } catch (error) {
      console.error('Error getting quiz click count:', error);
      return 0;
    }
  };

  const incrementQuizClickCount = async (chapterId: number): Promise<void> => {
    if (!sql) {
      const stored = localStorage.getItem('quiz_click_counters');
      const counters = stored ? JSON.parse(stored) : {};
      counters[chapterId] = (counters[chapterId] || 0) + 1;
      localStorage.setItem('quiz_click_counters', JSON.stringify(counters));
      return;
    }

    try {
      await sql(`
        INSERT INTO quiz_counters (chapter_id, click_count) 
        VALUES ($1, 1) 
        ON CONFLICT (chapter_id) 
        DO UPDATE SET 
          click_count = quiz_counters.click_count + 1,
          updated_at = CURRENT_TIMESTAMP
      `, [chapterId]);
    } catch (error) {
      console.error('Error incrementing quiz click count:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('quiz_click_counters');
      const counters = stored ? JSON.parse(stored) : {};
      counters[chapterId] = (counters[chapterId] || 0) + 1;
      localStorage.setItem('quiz_click_counters', JSON.stringify(counters));
    }
  };

  React.useEffect(() => {
    initChaptersTable().catch(console.error);
  }, []);

  const { data: book } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getBookById(bookId),
    enabled: bookId > 0,
  });

  const { data: chapters = [], isLoading, refetch } = useQuery({
    queryKey: ["book-chapters", bookId],
    queryFn: () => getChaptersByBook(bookId),
    enabled: bookId > 0,
  });

  // Load background images for chapters
  React.useEffect(() => {
    const loadBackgroundImages = async () => {
      if (chapters.length > 0) {
        const imagePromises = chapters.map(async (chapter) => {
          const bgImage = await getRandomBackgroundImage();
          return { id: chapter.id, image: bgImage };
        });
        
        const results = await Promise.all(imagePromises);
        const imageMap = results.reduce((acc, { id, image }) => {
          acc[id] = image;
          return acc;
        }, {} as Record<number, string>);
        
        setBackgroundImages(imageMap);
      }
    };

    loadBackgroundImages().catch(console.error);
  }, [chapters]);

  // Load quiz click counts when chapters change
  React.useEffect(() => {
    const loadQuizClickCounts = async () => {
      if (!chapters || chapters.length === 0) return;

      const counts: Record<number, number> = {};

      for (const chapter of chapters) {
        try {
          const count = await getQuizClickCount(chapter.id);
          counts[chapter.id] = count;
        } catch (error) {
          console.error(`Error loading quiz click count for chapter ${chapter.id}:`, error);
          counts[chapter.id] = 0;
        }
      }

      setQuizClickCounts(counts);
    };

    loadQuizClickCounts();
  }, [chapters]);

  const createChapterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Check for duplicate chapter name in this book
      const isDuplicate = await checkDuplicateChapterName(data.title, bookId);
      if (isDuplicate) {
        throw new Error('A chapter with this name already exists in this book');
      }

      const chapterData = {
        title: data.title,
        description: data.description,
        bookId: bookId,
        subjectId: book?.subjectId || 1
      };
      return await createChapterInBook(chapterData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chapter created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create chapter",
        variant: "destructive",
      });
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      return await deleteChapterFromBook(chapterId);
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Chapter deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete chapter",
        variant: "destructive",
      });
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
    createChapterMutation.mutate(data);
  };

  // JSON Upload Functions (same as in chapters.tsx)
  const handleFileSelect = (file: File) => {
    setJsonUploadModal(prev => ({ ...prev, selectedFile: file, parseError: null }));
    parseJSONFile(file);
  };

  const parseJSONFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (!Array.isArray(data) && !data.questions) {
          throw new Error('JSON must contain a questions array or be an array of questions');
        }

        const questions = Array.isArray(data) ? data : data.questions;

        const parsedQuestions: ParsedQuestion[] = questions.map((q: any, index: number) => {
          if (!q.question || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctAnswer) {
            throw new Error(`Question ${index + 1} is missing required fields`);
          }

          return {
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "No explanation provided",
            difficulty: q.difficulty || "medium"
          };
        });

        setJsonUploadModal(prev => ({ 
          ...prev, 
          parsedQuestions, 
          parseError: null 
        }));

      } catch (error: any) {
        setJsonUploadModal(prev => ({ 
          ...prev, 
          parseError: error.message,
          parsedQuestions: []
        }));
      }
    };
    reader.readAsText(file);
  };

  const handleJsonUpload = async () => {
    if (jsonUploadModal.parsedQuestions.length === 0 || !jsonUploadModal.selectedFile) return;

    setJsonUploadModal(prev => ({ ...prev, isUploading: true }));

    try {
      const properlyFormattedData = {
        questions: jsonUploadModal.parsedQuestions
      };

      const fileContent = JSON.stringify(properlyFormattedData, null, 2);
      const filename = `chapter_${jsonUploadModal.chapterId}_questions.json`;

      await saveJsonFileToNeon({
        chapterId: jsonUploadModal.chapterId,
        filename: filename,
        fileContent: fileContent,
        questionCount: jsonUploadModal.parsedQuestions.length
      });

      toast({
        title: "Success!",
        description: `Successfully uploaded ${jsonUploadModal.parsedQuestions.length} questions to ${jsonUploadModal.chapterTitle}`,
      });

      setJsonUploadModal({
        isOpen: false,
        chapterId: 0,
        chapterTitle: "",
        selectedFile: null,
        parsedQuestions: [],
        parseError: null,
        isUploading: false,
        isDragOver: false
      });

      refetch();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your questions.",
        variant: "destructive",
      });
    } finally {
      setJsonUploadModal(prev => ({ ...prev, isUploading: false }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setJsonUploadModal(prev => ({ ...prev, isDragOver: false }));

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));

    if (jsonFile) {
      handleFileSelect(jsonFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setJsonUploadModal(prev => ({ ...prev, isDragOver: true }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setJsonUploadModal(prev => ({ ...prev, isDragOver: false }));
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (!book) {
    return (
      <section className="mb-8 slide-up">
        <div className="text-center mt-8">
          <p className="text-gray-400">Book not found</p>
          <Button onClick={() => setLocation("/study")} className="mt-4">
            Go Back to Study
          </Button>
        </div>
      </section>
    );    }

  if (isLoading) {
    return (
      <section className="mb-8 slide-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 gradient-text">Loading...</h2>
            <p className="text-gray-400 font-medium">Please wait</p>
          </div>
          <div className="w-32 h-10 glass-card-subtle rounded-xl pulse-animation"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 slide-up">
      {/* Font import for Pixelify Sans and H Card CSS */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&display=swap');

          /* H Card CSS */
          .h-card-container {
            position: relative;
            display: inline-block;
            width: 100%;
            max-width: 353px;
            margin: 0 auto;
          }

          .h-background-card {
            position: absolute;
            width: 354px;
            height: 184px;
            background: transparent;
            border-radius: 20px;
            top: -1px;
            left: -1px;
            z-index: 0;
          }

          .h-background-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 20px;
            padding: 2px;
            background-size: 200% 100%;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: xor;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            animation: rotation_481 200ms infinite linear;
          }

          @keyframes rotation_481 {
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: 200% 50%;
            }
          }

          .h-card {
            width: 353px;
            height: 143px;
            position: relative;
            z-index: 1;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 20px;
            display: flex;
            position: relative;
            backdrop-filter: blur(2px);
            border: 1px solid rgba(40, 40, 40, 0.8);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.6),
              0 4px 16px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            overflow: hidden;
          }

          .h-status-section {
            position: absolute;
            top: 5px;
            left: -20px;
            z-index: 3;
          }

          .h-status-text {
            font-family: 'Pixelify Sans', sans-serif;
            font-size: 11px;
            font-weight: 500;
            color: #ffffff;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
            line-height: 1;
            display: flex;
            flex-direction: column;
            gap: -10px;
          }

          .h-status-text div {
            display: flex;
            align-items: center;
            gap: -9999px;
            height: 35px;
            position: relative;
          }

          .h-status-icon {
            width: 70px;
            height: 70px;
            object-fit: contain;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
            flex-shrink: 0;
            position: relative;
            z-index: 1;
          }

          .h-medals-section {
            position: absolute;
            top: -5px;
            right: 1px;
            z-index: 3;
          }

          .h-medals-row {
            display: flex;
            gap: 3px;
            align-items: center;
          }

          .h-medal-icon {
            width: 35px;
            height: 35px;
            object-fit: contain;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
            transition: transform 0.2s ease;
          }

          .h-medal-icon:hover {
            transform: scale(1.1);
          }

          .h-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 20px;
            z-index: 1;
          }

          .h-content {
            flex: 1;
            padding: 15px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: rgba(15, 15, 15, 0.5);
            border-radius: 0 20px 20px 0;
            backdrop-filter: blur(5px);
            position: relative;
            z-index: 2;
          }

          .h-productTitle {
            font-size: 24px;
            font-weight: bold;
            color: #ffff9e;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            margin-bottom: 15px;
            text-align: center;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1;
          }

          .h-productTitle .h-first-letter {
            font-size: 36px;
            color: #ff0000;
            font-weight: 900;
            text-shadow: 0 3px 6px rgba(255, 0, 0, 0.5);
            margin-right: 2px;
          }

          .h-button-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
          }

          .h-addtocart {
            width: 60px;
            padding: 8px 7px;
            border: none;
            background: rgba(15, 15, 10, 0.7);
            color: #e6e6b3;
            font-weight: 0;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
            border-radius: 10px;
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            cursor: pointer;
            box-shadow: 
              0 4px 12px rgba(0, 0, 0, 0.35),
              0 2px 6px rgba(0, 0, 0, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
            mix-blend-mode: color-dodge;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(40, 40, 40, 0.3);
          }

          .h-addtocart::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
            transition: opacity 0.2s ease;
          }

          .h-addtocart:hover {
            transform: translateY(-1px);
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
            opacity: 0.7;
            box-shadow: 
              0 6px 16px rgba(0, 0, 0, 0.35),
              0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .h-addtocart:hover::before {
            opacity: 0.1;
          }

          .h-addtocart:active {
            transform: translateY(0);
            box-shadow: 
              0 2px 8px rgba(0, 0, 0, 0.3),
              0 1px 3px rgba(0, 0, 0, 0.2);
          }

          .h-upload-button {
            width: 70px;
            padding: 8px 7px;
            border: none;
            background: rgba(15, 15, 10, 0.7);
            color: #e6e6b3;
            font-weight: 0;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
            border-radius: 10px;
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            cursor: pointer;
            box-shadow: 
              0 4px 12px rgba(0, 0, 0, 0.35),
              0 2px 6px rgba(0, 0, 0, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
            mix-blend-mode: color-dodge;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(40, 40, 40, 0.3);
          }

          .h-upload-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
            transition: opacity 0.2s ease;
          }

          .h-upload-button:hover {
            transform: translateY(-1px);
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
            opacity: 0.7;
            box-shadow: 
              0 6px 16px rgba(0, 0, 0, 0.35),
              0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .h-upload-button:hover::before {
            opacity: 0.1;
          }

          .h-upload-button:active {
            transform: translateY(0);
            box-shadow: 
              0 2px 8px rgba(0, 0, 0, 0.3),
              0 1px 3px rgba(0, 0, 0, 0.2);
          }

          .h-delete-button {
            --background: linear-gradient(135deg, #FF3B30 0%, #D70015 100%);
            --background-hover: linear-gradient(135deg, #FF453A 0%, #E8001A 100%);
            --text: #fff;
            --shadow: rgba(255, 59, 48, 0.25);
            --paper: #FF3B30;
            --paper-lines: #fff;
            --trash: #ffffff;
            --trash-lines: rgba(255, 255, 255, 0.8);
            --check: #fff;
            --check-background: #34C759;
            position: relative;
            border: none;
            outline: none;
            background: var(--btn, var(--background));
            padding: 6px;
            border-radius: 8px;
            min-width: 32px;
            -webkit-appearance: none;
            -webkit-tap-highlight-color: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text);
            box-shadow: 
              0 4px 12px var(--shadow),
              0 2px 6px rgba(0, 0, 0, 0.15);
            transform: scale(var(--scale, 1));
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            width: 32px;
            height: 32px;
            font-size: 10px;
            mix-blend-mode: screen;
          }

          .h-delete-button span {
            display: block;
            font-size: 11px;
            line-height: 16px;
            font-weight: 600;
            opacity: var(--span-opacity, 1);
            transform: translateX(var(--span-x, 0)) translateZ(0);
            transition: transform 0.4s ease var(--span-delay, 0.2s), opacity 0.3s ease var(--span-delay, 0.2s);
          }

          .h-delete-button .h-trash {
            display: block;
            position: relative;
            left: 0;
            transform: translate(var(--trash-x, 0), var(--trash-y, 1px)) translateZ(0) scale(var(--trash-scale, 0.5));
            transition: transform 0.5s;
            margin: 0 auto;
          }

          .h-delete-button .h-trash:before,
          .h-delete-button .h-trash:after {
            content: "";
            position: absolute;
            height: 8px;
            width: 2px;
            border-radius: 1px;
            background: var(--icon, var(--trash));
            bottom: 100%;
            transform-origin: 50% 6px;
            transform: translate(var(--x, 3px), 2px) scaleY(var(--sy, 0.7)) rotate(var(--r, 0deg));
            transition: transform 0.4s, background 0.3s;
          }

          .h-delete-button .h-trash:before {
            left: 1px;
          }

          .h-delete-button .h-trash:after {
            right: 1px;
            --x: -3px;
          }

          .h-delete-button .h-trash .h-top {
            position: absolute;
            overflow: hidden;
            left: -4px;
            right: -4px;
            bottom: 100%;
            height: 40px;
            z-index: 1;
            transform: translateY(2px);
          }

          .h-delete-button .h-trash .h-top:before,
          .h-delete-button .h-trash .h-top:after {
            content: "";
            position: absolute;
            border-radius: 1px;
            background: var(--icon, var(--trash));
            width: var(--w, 12px);
            height: var(--h, 2px);
            left: var(--l, 8px);
            bottom: var(--b, 5px);
            transition: background 0.3s, transform 0.4s;
          }

          .h-delete-button .h-trash .h-top:after {
            --w: 28px;
            --h: 2px;
            --l: 0;
            --b: 0;
            transform: scaleX(var(--trash-line-scale, 1));
          }

          .h-delete-button .h-trash .h-top .h-paper {
            width: 14px;
            height: 18px;
            background: var(--paper);
            left: 7px;
            bottom: 0;
            border-radius: 1px;
            position: absolute;
            transform: translateY(-16px);
            opacity: 0;
          }

          .h-delete-button .h-trash .h-top .h-paper:before,
          .h-delete-button .h-trash .h-top .h-paper:after {
            content: "";
            width: var(--w, 10px);
            height: 2px;
            border-radius: 1px;
            position: absolute;
            left: 2px;
            top: var(--t, 2px);
            background: var(--paper-lines);
            transform: scaleY(0.7);
            box-shadow: 0 9px 0 var(--paper-lines);
          }

          .h-delete-button .h-trash .h-top .h-paper:after {
            --t: 5px;
            --w: 7px;
          }

          .h-delete-button .h-trash .h-box {
            width: 20px;
            height: 25px;
            border: 2px solid var(--icon, var(--trash));
            border-radius: 1px 1px 4px 4px;
            position: relative;
            overflow: hidden;
            z-index: 2;
            transition: border-color 0.3s;
          }

          .h-delete-button .h-trash .h-box:before,
          .h-delete-button .h-trash .h-box:after {
            content: "";
            position: absolute;
            width: 4px;
            height: var(--h, 20px);
            top: 0;
            left: var(--l, 50%);
            background: var(--b, var(--trash-lines));
          }

          .h-delete-button .h-trash .h-box:before {
            border-radius: 2px;
            margin-left: -2px;
            transform: translateX(-3px) scale(0.6);
            box-shadow: 10px 0 0 var(--trash-lines);
            opacity: var(--trash-lines-opacity, 1);
            transition: transform 0.4s, opacity 0.4s;
          }

          .h-delete-button .h-trash .h-box:after {
            --h: 16px;
            --b: var(--paper);
            --l: 1px;
            transform: translate(-0.5px, -16px) scaleX(0.5);
            box-shadow: 7px 0 0 var(--paper), 14px 0 0 var(--paper), 21px 0 0 var(--paper);
          }

          .h-delete-button .h-trash .h-check {
            padding: 4px 3px;
            border-radius: 50%;
            background: var(--check-background);
            position: absolute;
            left: 2px;
            top: 24px;
            opacity: var(--check-opacity, 0);
            transform: translateY(var(--check-y, 0)) scale(var(--check-scale, 0.2));
            transition: transform var(--check-duration, 0.2s) ease var(--check-delay, 0s), opacity var(--check-duration-opacity, 0.2s) ease var(--check-delay, 0s);
          }

          .h-delete-button .h-trash .h-check svg {
            width: 8px;
            height: 6px;
            display: block;
            fill: none;
            stroke-width: 1.5;
            stroke-dasharray: 9px;
            stroke-dashoffset: var(--check-offset, 9px);
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke: var(--check);
            transition: stroke-dashoffset 0.4s ease var(--checkmark-delay, 0.4s);
          }

          .h-delete-button.delete {
            --span-opacity: 0;
            --span-x: 16px;
            --span-delay: 0s;
            --trash-x: 46px;
            --trash-y: 2px;
            --trash-scale: 1;
            --trash-lines-opacity: 0;
            --trash-line-scale: 0;
            --icon: #fff;
            --check-offset: 0;
            --check-opacity: 1;
            --check-scale: 1;
            --check-y: 16px;
            --check-delay: 1.7s;
            --checkmark-delay: 2.1s;
            --check-duration: 0.55s;
            --check-duration-opacity: 0.3s;
          }

          .h-delete-button.delete .h-trash:before,
          .h-delete-button.delete .h-trash:after {
            --sy: 1;
            --x: 0;
          }

          .h-delete-button.delete .h-trash:before {
            --r: 40deg;
          }

          .h-delete-button.delete .h-trash:after {
            --r: -40deg;
          }

          .h-delete-button.delete .h-trash .h-top .h-paper {
            animation: paper 1.5s linear forwards 0.5s;
          }

          .h-delete-button.delete .h-trash .h-box:after {
            animation: cut 1.5s linear forwards 0.5s;
          }

          .h-delete-button:hover {
            --btn: var(--background-hover);
            transform: translateY(-1px) scale(var(--scale, 1));
            box-shadow: 
              0 6px 16px rgba(255, 59, 48, 0.35),
              0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .h-delete-button:active {
            transform: translateY(0) scale(0.95);
            box-shadow: 
              0 2px 8px rgba(255, 59, 48, 0.3),
              0 1px 3px rgba(0, 0, 0, 0.2);
          }

          @keyframes paper {
            10%,
            40%,
            70% {
              transform: translateY(-16px);
            }
            20%,
            30%,
            50%,
            60%,
            80%,
            90% {
              transform: translateY(-12px);
            }
            100% {
              transform: translateY(4px);
              opacity: 0;
            }
          }

          @keyframes cut {
            0%,
            40% {
              transform: translate(-0.5px, -16px) scaleX(0.5);
            }
            100% {
              transform: translate(-0.5px, 4px) scaleX(0.5);
            }
          }
        `}
      </style>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/study")}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Study
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2 gradient-text flex items-center space-x-2">


            </h2>
            <p className="text-gray-400 font-medium">{book.description}</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="ios-button-primary flex items-center space-x-2 px-4 py-2 font-medium">
              <Plus className="w-4 h-4" />
              <span>Add Chapter</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-0 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold">
                Add New Chapter to {book.title}
              </DialogTitle>
               <DialogDescription className="text-gray-400">
              Create a new chapter for this book.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 font-medium">Chapter Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Chapter title" 
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
                          placeholder="Chapter description" 
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
                  disabled={createChapterMutation.isPending}
                >
                  {createChapterMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="ios-spinner"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Create Chapter"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chapters Grid with H Card Design */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {chapters.length === 0 ? (
          <Card className="glass-morphism col-span-full">
            <CardContent className="p-6 text-center">
              <BookIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No chapters found in this book</p>
              <p className="text-sm text-gray-500 mt-1">Add your first chapter to get started</p>
            </CardContent>
          </Card>
        ) : (
          chapters.map((chapter) => {
            const progressPercentage = (chapter.totalQuestions || 0) > 0 
              ? Math.round(((chapter.completedQuestions || 0) / (chapter.totalQuestions || 1)) * 100)
              : 0;

            return (
              <div key={chapter.id} className="h-card-container">
                <div className="h-background-card"></div>
                <div 
                  className="h-card"
                  style={{
                    backgroundImage: `url(${backgroundImages[chapter.id] || '/bg.jpg'})`
                  }}
                >
                  <div className="h-status-section">
                    <div className="h-status-text">
                      <div>
                        <img src="/question-icon.png" alt="?" className="h-status-icon" />
                        <span>{chapter.totalQuestions} question</span>
                      </div>
                      <div>
                        <img src="/complete-icon.png" alt="complete" className="h-status-icon" />
                        <span>{quizClickCounts[chapter.id] || 0} Attempts</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-medals-section">
                    <div className="h-medals-row">
                      {Array.from({ length: 5 }, (_, i) => {
                        const attemptCount = quizClickCounts[chapter.id] || 0;
                        const medalCount = Math.floor(attemptCount / 20);
                        return (
                          <img 
                            key={i}
                            src="/medal-icon.png" 
                            alt="medal" 
                            className="h-medal-icon"
                            style={{
                              opacity: medalCount > i ? 1 : 0.3
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="h-content">
                    <div className="h-productTitle">
                      <span className="h-first-letter">{chapter.title.charAt(0)}</span>
                      {chapter.title.slice(1)}
                    </div>
                    <div className="h-button-row">
                      <button 
                        className="h-delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmation({ isOpen: true, chapter });
                        }}
                        disabled={deleteChapterMutation.isPending}
                      >
                        <div className="h-trash">
                          <div className="h-top">
                            <div className="h-paper"></div>
                          </div>
                          <div className="h-box"></div>
                          <div className="h-check">
                            <svg viewBox="0 0 8 6">
                              <polyline points="1.5,3 3,4.5 6.5,1"></polyline>
                            </svg>
                          </div>
                        </div>
                      </button>
                      <button 
                        className="h-upload-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJsonUploadModal({
                            isOpen: true,
                            chapterId: chapter.id,
                            chapterTitle: chapter.title,
                            selectedFile: null,
                            parsedQuestions: [],
                            parseError: null,
                            isUploading: false,
                            isDragOver: false
                          });
                        }}
                      >
                        𝗨𝗣𝗟𝗢𝗔𝗗
                      </button>
                      <button 
                        className="h-addtocart"
                        onClick={async (e) => {
                          e.stopPropagation();

                          if (chapter.totalQuestions > 0) {
                            try {
                              const jsonFile = await getNeonJsonFile(chapter.id);

                              if (jsonFile && (jsonFile.file_content || jsonFile.fileContent)) {
                                // Increment the click counter
                                await incrementQuizClickCount(chapter.id);
                                // Update local state immediately
                                setQuizClickCounts(prev => ({
                                  ...prev,
                                  [chapter.id]: (prev[chapter.id] || 0) + 1
                                }));

                                const content = jsonFile.file_content || jsonFile.fileContent;
                                sessionStorage.setItem('current_quiz_data', content);
                                sessionStorage.setItem('current_chapter_id', chapter.id.toString());
                                sessionStorage.setItem('current_chapter_title', chapter.title);
                                setLocation("/quiz");
                              } else {
                                toast({
                                  title: "No Questions Found",
                                  description: "Please upload a JSON file with questions first.",
                                  variant: "destructive",
                                });
                              }
                            } catch (error) {
                              console.error('Error fetching questions:', error);
                              toast({
                                title: "Error",
                                description: "Failed to load questions for this chapter.",
                                variant: "destructive",
                              });
                            }
                          } else {
                            toast({
                              title: "No Questions",
                              description: "This chapter doesn't have any questions yet. Upload a JSON file first.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={chapter.totalQuestions === 0}
                      >
                        𝗘𝗡𝗧𝗘𝗥
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

        {/* JSON Upload Modal - Same as chapters.tsx */}
        <Dialog open={jsonUploadModal.isOpen} onOpenChange={(open) => {
          if (!open) {
            setJsonUploadModal({
              isOpen: false,
              chapterId: 0,
              chapterTitle: "",
              selectedFile: null,
              parsedQuestions: [],
              parseError: null,
              isUploading: false,
              isDragOver: false
            });
          }
        }}>
          <DialogContent className="glass-card border-0 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold flex items-center space-x-2">
                <Upload className="w-5 h-5 text-green-400" />
                <span>Upload JSON Questions</span>
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                Upload questions for {jsonUploadModal.chapterTitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-xs text-gray-300">
                Upload a JSON file with questions array containing: question, optionA, optionB, optionC, optionD, correctAnswer
              </p>

              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  jsonUploadModal.isDragOver ? "border-blue-400 bg-blue-500/10" : "border-gray-600 bg-gray-800/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />

                {jsonUploadModal.selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-8 h-8 text-green-400 mx-auto" />
                    <p className="text-sm text-white">{jsonUploadModal.selectedFile.name}</p>
                    <p className="text-xs text-gray-400">
                      {jsonUploadModal.parsedQuestions.length} questions parsed
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-300">Drop JSON file here or click to browse</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-700 border-gray-600"
                    >
                      Browse Files
                    </Button>
                  </div>
              )}
            </div>

            {jsonUploadModal.parseError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-red-300 text-sm">{jsonUploadModal.parseError}</p>
                </div>
              </div>
            )}

            {jsonUploadModal.parsedQuestions.length > 0 && !jsonUploadModal.parseError && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <p className="text-green-300 text-sm">
                    Ready to upload {jsonUploadModal.parsedQuestions.length} questions
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleJsonUpload}
              disabled={jsonUploadModal.parsedQuestions.length === 0 || jsonUploadModal.isUploading}
              className="w-full ios-button-primary h-11 font-medium"
            >
              {jsonUploadModal.isUploading ? (
                <div className="flex items-center space-x-2">
                  <div className="ios-spinner"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                `Upload ${jsonUploadModal.parsedQuestions.length} Questions`
              )}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, chapter: null })}
        onConfirm={() => {
          if (deleteConfirmation.chapter) {
            deleteChapterMutation.mutate(deleteConfirmation.chapter.id);
            setDeleteConfirmation({ isOpen: false, chapter: null });
          }
        }}
        title="Delete Chapter"
        description="Are you sure you want to delete this chapter? This will also delete all questions and JSON files associated with it."
        itemName={deleteConfirmation.chapter?.title}
      />
    </section>
  );
}