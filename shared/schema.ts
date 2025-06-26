import { z } from "zod";

// TypeScript interfaces for IndexedDB storage
export interface Subject {
  id: number;
  name: string;
  color: string;
}

export interface Book {
  id: number;
  subjectId: number;
  title: string;
  description: string;
  createdAt: Date;
}

export interface Chapter {
  id: number;
  subjectId: number;
  bookId: number;
  title: string;
  description: string;
  progress: number;
  totalQuestions: number;
  completedQuestions: number;
  difficulty: string;
  createdAt: Date;
}

export interface Question {
  id: number;
  chapterId: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface QuizSession {
  id: number;
  chapterId: number;
  totalQuestions: number;
  currentQuestion: number;
  score: number;
  isCompleted: boolean;
  createdAt: Date;
}

export interface QuizAnswer {
  id: number;
  sessionId: number;
  questionId: number;
  selectedAnswer: number;
  isCorrect: boolean;
}

export interface QuizStat {
  id: number;
  date: Date;
  chapterTitle: string;
  subjectTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
}

export interface FileItem {
  id: number;
  name: string;
  type: "folder" | "pdf" | "image" | "document";
  size?: string;
  path: string;
  createdAt: Date;
}

export interface Folder {
  id: number;
  name: string;
  path: string;
  createdAt: Date;
}

export interface Message {
  id: number;
  text: string;
  timestamp: Date;
  sender: "user";
}

export interface StudySession {
  id: number;
  chapterId: number;
  duration: number;
  date: Date;
}

export interface ScheduleEvent {
  id: number;
  title: string;
  description?: string;
  date: Date;
  time: string;
  type: string;
}