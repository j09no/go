import { indexedDB } from './indexed-db';
import type {
  Subject,
  Chapter,
  Question,
  QuizSession,
  QuizAnswer,
  QuizStat,
  FileItem,
  Folder,
  Message,
  StudySession,
  ScheduleEvent
} from "@shared/schema";

// Initialization
let initializationPromise: Promise<void> | null = null;

async function initializeDefaultData() {
  await indexedDB.init();

  // Check if subjects already exist
  const existingSubjects = await indexedDB.getAll('subjects');
  if (existingSubjects.length > 0) {
    return; // Already initialized
  }

  // Add default NEET subjects
  const defaultSubjects = [
    { id: 1, name: "Physics", color: "#3B82F6" },
    { id: 2, name: "Chemistry", color: "#10B981" },
    { id: 3, name: "Biology", color: "#F59E0B" }
  ];

  for (const subject of defaultSubjects) {
    await indexedDB.add('subjects', subject);
  }
}

export function ensureInitialized(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeDefaultData();
  }
  return initializationPromise;
}

// Subjects
export async function getSubjects(): Promise<Subject[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getAll('subjects');
  } catch (error) {
    console.error('Error getting subjects:', error);
    return [];
  }
}

export async function createSubject(subjectData: { name: string; color: string }): Promise<Subject> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('subjects');
    const newSubject: Subject = {
      id,
      name: subjectData.name,
      color: subjectData.color
    };

    return await indexedDB.add('subjects', newSubject);
  } catch (error) {
    console.error('Error creating subject:', error);
    throw error;
  }
}

export async function deleteSubject(id: number): Promise<void> {
  try {
    // Delete all related chapters and their questions first
    const chapters = await getChaptersBySubject(id);
    for (const chapter of chapters) {
      await deleteChapter(chapter.id);
    }

    await indexedDB.delete('subjects', id);
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }
}

// Chapters
export async function getChapters(): Promise<Chapter[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getAll('chapters');
  } catch (error) {
    console.error('Error getting chapters:', error);
    return [];
  }
}

export async function getChaptersBySubject(subjectId: number): Promise<Chapter[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getByIndex('chapters', 'subjectId', subjectId);
  } catch (error) {
    console.error('Error getting chapters by subject:', error);
    return [];
  }
}

export async function getChapterById(id: number): Promise<Chapter | undefined> {
  try {
    await ensureInitialized();
    return await indexedDB.getById('chapters', id);
  } catch (error) {
    console.error('Error getting chapter by id:', error);
    return undefined;
  }
}

export async function createChapter(chapterData: {
  subjectId: number;
  title: string;
  description: string;
  difficulty: string;
}): Promise<Chapter> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('chapters');
    const newChapter: Chapter = {
      id,
      subjectId: chapterData.subjectId,
      title: chapterData.title,
      description: chapterData.description,
      difficulty: chapterData.difficulty,
      progress: 0,
      totalQuestions: 0
    };

    return await indexedDB.add('chapters', newChapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    throw error;
  }
}

export async function deleteChapter(id: number): Promise<void> {
  try {
    // Delete all questions in this chapter first
    const questions = await getQuestionsByChapter(id);
    for (const question of questions) {
      await indexedDB.delete('questions', question.id);
    }

    // Delete all quiz sessions for this chapter
    const sessions = await indexedDB.getByIndex('quizSessions', 'chapterId', id);
    for (const session of sessions) {
      await indexedDB.delete('quizSessions', session.id);
    }

    // Delete all study sessions for this chapter
    const studySessions = await indexedDB.getByIndex('studySessions', 'chapterId', id);
    for (const session of studySessions) {
      await indexedDB.delete('studySessions', session.id);
    }

    await indexedDB.delete('chapters', id);
  } catch (error) {
    console.error('Error deleting chapter:', error);
    throw error;
  }
}

// Questions
export async function getQuestions(): Promise<Question[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getAll('questions');
  } catch (error) {
    console.error('Error getting questions:', error);
    return [];
  }
}

export async function getQuestionsByChapter(chapterId: number): Promise<Question[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getByIndex('questions', 'chapterId', chapterId);
  } catch (error) {
    console.error('Error getting questions by chapter:', error);
    return [];
  }
}

export async function createQuestion(questionData: {
  chapterId: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}): Promise<Question> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('questions');
    const newQuestion: Question = {
      id,
      chapterId: questionData.chapterId,
      question: questionData.question,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
      explanation: questionData.explanation,
      difficulty: questionData.difficulty
    };

    const question = await indexedDB.add('questions', newQuestion);

    // Update chapter's total questions count
    const chapter = await getChapterById(questionData.chapterId);
    if (chapter) {
      chapter.totalQuestions += 1;
      await indexedDB.put('chapters', chapter);
    }

    return question;
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
}

export async function createBulkQuestions(questionsData: {
  chapterId: number;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
  }>;
}): Promise<Question[]> {
  try {
    await ensureInitialized();
    const createdQuestions: Question[] = [];

    // Check if Neon is configured
    const neonUrl = import.meta.env.VITE_DATABASE_URL;

    if (neonUrl) {
      // Use Neon database
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(neonUrl);

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

      for (const questionData of questionsData.questions) {
        const result = await sql(
          'INSERT INTO questions (chapter_id, question, options, correct_answer, explanation, difficulty) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [
            questionsData.chapterId,
            questionData.question,
            JSON.stringify(questionData.options),
            questionData.correctAnswer,
            questionData.explanation,
            questionData.difficulty
          ]
        );

        const row = result[0];
        const question: Question = {
          id: row.id,
          chapterId: row.chapter_id,
          question: row.question,
          options: JSON.parse(row.options),
          correctAnswer: row.correct_answer,
          explanation: row.explanation,
          difficulty: row.difficulty
        };

        createdQuestions.push(question);
      }

      // Update chapter's total questions count in Neon
      await sql(
        'UPDATE chapters SET total_questions = total_questions + $1 WHERE id = $2',
        [questionsData.questions.length, questionsData.chapterId]
      );

      console.log(`Successfully created ${createdQuestions.length} questions in Neon database`);
    } else {
      // Fallback to IndexedDB
      for (const questionData of questionsData.questions) {
        const id = await indexedDB.getNextId('questions');
        const newQuestion: Question = {
          id,
          chapterId: questionsData.chapterId,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation,
          difficulty: questionData.difficulty
        };

        const question = await indexedDB.add('questions', newQuestion);
        createdQuestions.push(question);
      }

      // Update chapter's total questions count in IndexedDB
      const chapter = await getChapterById(questionsData.chapterId);
      if (chapter) {
        chapter.totalQuestions += questionsData.questions.length;
        await indexedDB.put('chapters', chapter);
      }
    }

    // Update chapter's total questions count
    const chapter = await getChapterById(questionsData.chapterId);
    if (chapter) {
      chapter.totalQuestions += questionsData.questions.length;
      await indexedDB.put('chapters', chapter);
    }

    return createdQuestions;
  } catch (error) {
    console.error('Error creating bulk questions:', error);
    throw error;
  }
}

// Quiz Sessions
export async function createQuizSession(sessionData: {
  chapterId: number;
  totalQuestions: number;
}): Promise<QuizSession> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('quizSessions');
    const newSession: QuizSession = {
      id,
      chapterId: sessionData.chapterId,
      totalQuestions: sessionData.totalQuestions,
      currentQuestion: 0,
      score: 0,
      isCompleted: false,
      createdAt: new Date()
    };

    return await indexedDB.add('quizSessions', newSession);
  } catch (error) {
    console.error('Error creating quiz session:', error);
    throw error;
  }
}

export async function getQuizSession(id: number): Promise<QuizSession | undefined> {
  try {
    await ensureInitialized();
    return await indexedDB.getById('quizSessions', id);
  } catch (error) {
    console.error('Error getting quiz session:', error);
    return undefined;
  }
}

export async function updateQuizSession(id: number, sessionData: Partial<QuizSession>): Promise<QuizSession | undefined> {
  try {
    await ensureInitialized();
    const session = await indexedDB.getById('quizSessions', id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...sessionData };
    return await indexedDB.put('quizSessions', updatedSession);
  } catch (error) {
    console.error('Error updating quiz session:', error);
    return undefined;
  }
}

export async function createQuizAnswer(answerData: {
  sessionId: number;
  questionId: number;
  selectedAnswer: number;
  isCorrect: boolean;
}): Promise<QuizAnswer> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('quizAnswers');
    const newAnswer: QuizAnswer = {
      id,
      sessionId: answerData.sessionId,
      questionId: answerData.questionId,
      selectedAnswer: answerData.selectedAnswer,
      isCorrect: answerData.isCorrect
    };

    return await indexedDB.add('quizAnswers', newAnswer);
  } catch (error) {
    console.error('Error creating quiz answer:', error);
    throw error;
  }
}

export async function getQuizAnswersBySession(sessionId: number): Promise<QuizAnswer[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getByIndex('quizAnswers', 'sessionId', sessionId);
  } catch (error) {
    console.error('Error getting quiz answers by session:', error);
    return [];
  }
}

// Check if Neon is configured
const neonUrl = import.meta.env.VITE_DATABASE_URL;

// Set up the sql variable
let sql: any = null;
if (neonUrl) {
  try {
    import('@neondatabase/serverless').then(({ neon }) => {
      sql = neon(neonUrl);
      console.log('Neon SQL client initialized');
    });
  } catch (error) {
    console.error('Failed to initialize Neon client:', error);
  }
}

// Statistics
export async function getUserStats() {
  console.log('getUserStats called - sql available:', !!sql);

  if (sql) {
    try {
      console.log('Fetching quiz stats from database...');
      
      // First, ensure the table exists
      await sql(`
        CREATE TABLE IF NOT EXISTS quiz_stats (
          id SERIAL PRIMARY KEY,
          date TEXT NOT NULL,
          chapter_title TEXT NOT NULL,
          subject_title TEXT DEFAULT 'NEET',
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          percentage INTEGER NOT NULL,
          accuracy INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const quizStats = await sql('SELECT * FROM quiz_stats ORDER BY created_at DESC');
      console.log('Raw quiz stats from DB:', quizStats);

      const formattedStats = quizStats.map(stat => ({
        id: stat.id,
        date: stat.date || stat.created_at,
        chapterTitle: stat.chapter_title,
        subjectTitle: stat.subject_title || 'NEET',
        score: stat.score,
        totalQuestions: stat.total_questions,
        accuracy: stat.accuracy || Math.round((stat.score / stat.total_questions) * 100),
        percentage: stat.percentage || Math.round((stat.score / stat.total_questions) * 100)
      }));

      console.log('Formatted quiz stats:', formattedStats);

      return {
        quizStats: formattedStats
      };
    } catch (error) {
      console.error('Error fetching user stats from database:', error);
      return {
        quizStats: []
      };
    }
  }

  console.log('SQL not available, returning empty stats');
  // Fallback for local storage
  return { 
    quizStats: []
  };
}

export async function createQuizStat(statData: {
  chapterTitle: string;
  subjectTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
}): Promise<QuizStat> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('quizStats');
    const newStat: QuizStat = {
      id,
      date: new Date(),
      chapterTitle: statData.chapterTitle,
      subjectTitle: statData.subjectTitle,
      score: statData.score,
      totalQuestions: statData.totalQuestions,
      percentage: statData.percentage
    };

    return await indexedDB.add('quizStats', newStat);
  } catch (error) {
    console.error('Error creating quiz stat:', error);
    throw error;
  }
}

// Files
export async function getFiles(): Promise<FileItem[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getAll('files');
  } catch (error) {
    console.error('Error getting files:', error);
    return [];
  }
}

export async function createFile(fileData: { 
  name: string; 
  type: string; 
  size?: string; 
  path: string 
}): Promise<FileItem> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('files');
    const newFile: FileItem = {
      id,
      name: fileData.name,
      type: fileData.type as FileItem['type'],
      size: fileData.size,
      path: fileData.path,
      createdAt: new Date()
    };

    return await indexedDB.add('files', newFile);
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
}

export async function deleteFile(id: number): Promise<boolean> {
  try {
    await ensureInitialized();
    return await indexedDB.delete('files', id);
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

// Folders
export async function getFolders(): Promise<Folder[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getAll('folders');
  } catch (error) {
    console.error('Error getting folders:', error);
    return [];
  }
}

export async function createFolder(folderData: { 
  name: string; 
  path: string 
}): Promise<Folder> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('folders');
    const newFolder: Folder = {
      id,
      name: folderData.name,
      path: folderData.path,
      createdAt: new Date()
    };

    return await indexedDB.add('folders', newFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

export async function deleteFolder(id: number): Promise<boolean> {
  try {
    await ensureInitialized();
    return await indexedDB.delete('folders', id);
  } catch (error) {
    console.error('Error deleting folder:', error);
    return false;
  }
}

// Messages
export async function getMessages(): Promise<Message[]> {
  try {
    await ensureInitialized();
    return await indexedDB.getAll('messages');
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
}

export async function createMessage(messageData: {
  text: string;
  sender: string;
}): Promise<Message> {
  try {
    await ensureInitialized();
    const id = await indexedDB.getNextId('messages');
    const newMessage: Message = {
      id,
      text: messageData.text,
      timestamp: new Date(),
      sender: messageData.sender as "user"
    };

    return await indexedDB.add('messages', newMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

// Utility
export async function clearAllData(): Promise<void> {
  try {
    await ensureInitialized();
    await indexedDB.clear('quizAnswers');
    await indexedDB.clear('quizSessions');
    await indexedDB.clear('questions');
    await indexedDB.clear('chapters');
    await indexedDB.clear('subjects');
    await indexedDB.clear('quizStats');
    await indexedDB.clear('files');
    await indexedDB.clear('folders');
    await indexedDB.clear('messages');
    await indexedDB.clear('studySessions');
    await indexedDB.clear('scheduleEvents');
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
}

// Subtopic functionality has been completely removed from the application