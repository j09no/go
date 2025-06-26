// server/index.ts
import dotenv from "dotenv";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/local-storage.ts
import * as fs from "fs";
import * as path from "path";
var LocalStorage = class {
  subjects = /* @__PURE__ */ new Map();
  chapters = /* @__PURE__ */ new Map();
  questions = /* @__PURE__ */ new Map();
  subtopics = /* @__PURE__ */ new Map();
  messages = /* @__PURE__ */ new Map();
  files = /* @__PURE__ */ new Map();
  folders = /* @__PURE__ */ new Map();
  quizSessions = /* @__PURE__ */ new Map();
  quizAnswers = /* @__PURE__ */ new Map();
  studySessions = /* @__PURE__ */ new Map();
  userStatsData = {
    id: 1,
    totalQuestionsSolved: 1247,
    totalCorrectAnswers: 1085,
    studyStreak: 12,
    lastStudyDate: /* @__PURE__ */ new Date(),
    totalStudyTimeMinutes: 1260
  };
  scheduleEvents = /* @__PURE__ */ new Map();
  quizStats = [];
  // ID counters
  subjectIdCounter = 1;
  chapterIdCounter = 1;
  questionIdCounter = 1;
  subtopicIdCounter = 1;
  messageIdCounter = 1;
  fileIdCounter = 1;
  folderIdCounter = 1;
  sessionIdCounter = 1;
  answerIdCounter = 1;
  studySessionIdCounter = 1;
  eventIdCounter = 1;
  quizStatIdCounter = 1;
  constructor() {
    this.loadPersistedData();
    this.initializeDefaultData();
  }
  initializeDefaultData() {
    if (this.subjects.size === 0) {
      this.subjects.set(1, { id: 1, name: "Physics", color: "blue" });
      this.subjects.set(2, { id: 2, name: "Chemistry", color: "green" });
      this.subjects.set(3, { id: 3, name: "Biology", color: "purple" });
      this.subjectIdCounter = 4;
    }
    if (this.chapters.size === 0) {
      const sampleChapters = [
        { id: 1, title: "Mechanics", description: "Laws of motion and forces", subjectId: 1, totalQuestions: 0, completedQuestions: 0, createdAt: /* @__PURE__ */ new Date() },
        { id: 2, title: "Thermodynamics", description: "Heat and energy transfer", subjectId: 1, totalQuestions: 0, completedQuestions: 0, createdAt: /* @__PURE__ */ new Date() },
        { id: 3, title: "Atomic Structure", description: "Structure of atoms and molecules", subjectId: 2, totalQuestions: 0, completedQuestions: 0, createdAt: /* @__PURE__ */ new Date() },
        { id: 4, title: "Chemical Bonding", description: "Types of chemical bonds", subjectId: 2, totalQuestions: 0, completedQuestions: 0, createdAt: /* @__PURE__ */ new Date() },
        { id: 5, title: "Cell Biology", description: "Structure and function of cells", subjectId: 3, totalQuestions: 0, completedQuestions: 0, createdAt: /* @__PURE__ */ new Date() },
        { id: 6, title: "Genetics", description: "Heredity and genetic variation", subjectId: 3, totalQuestions: 0, completedQuestions: 0, createdAt: /* @__PURE__ */ new Date() }
      ];
      sampleChapters.forEach((chapter) => {
        this.chapters.set(chapter.id, chapter);
      });
      this.chapterIdCounter = 7;
    }
    this.persistData();
  }
  loadPersistedData() {
    try {
      const dataPath = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      this.loadDataType("subjects", this.subjects, (data) => {
        if (data.id >= this.subjectIdCounter) this.subjectIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("chapters", this.chapters, (data) => {
        data.createdAt = new Date(data.createdAt);
        if (data.id >= this.chapterIdCounter) this.chapterIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("questions", this.questions, (data) => {
        data.createdAt = new Date(data.createdAt);
        if (data.id >= this.questionIdCounter) this.questionIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("subtopics", this.subtopics, (data) => {
        data.createdAt = new Date(data.createdAt);
        if (data.id >= this.subtopicIdCounter) this.subtopicIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("messages", this.messages, (data) => {
        data.createdAt = new Date(data.createdAt);
        if (data.id >= this.messageIdCounter) this.messageIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("files", this.files, (data) => {
        data.createdAt = new Date(data.createdAt);
        if (data.id >= this.fileIdCounter) this.fileIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("folders", this.folders, (data) => {
        data.createdAt = new Date(data.createdAt);
        if (data.id >= this.folderIdCounter) this.folderIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("quizSessions", this.quizSessions, (data) => {
        data.createdAt = new Date(data.createdAt);
        if (data.id >= this.sessionIdCounter) this.sessionIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("quizAnswers", this.quizAnswers, (data) => {
        if (data.id >= this.answerIdCounter) this.answerIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("studySessions", this.studySessions, (data) => {
        data.date = new Date(data.date);
        if (data.id >= this.studySessionIdCounter) this.studySessionIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("scheduleEvents", this.scheduleEvents, (data) => {
        data.startTime = new Date(data.startTime);
        data.endTime = new Date(data.endTime);
        if (data.id >= this.eventIdCounter) this.eventIdCounter = data.id + 1;
        return data;
      });
      this.loadDataType("quizStats", this.quizStats, (data) => {
        return data;
      });
    } catch (error) {
      console.log("No persisted data found or error loading, using defaults");
    }
  }
  loadDataType(filename, map, processor) {
    try {
      const dataPath = path.join(process.cwd(), "data");
      const filePath = path.join(dataPath, `${filename}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        data.forEach((item) => {
          const processedItem = processor(item);
          map.set(item.id, processedItem);
        });
      }
    } catch (error) {
      console.log(`Error loading ${filename}:`, error);
    }
  }
  persistData() {
    try {
      const dataPath = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      this.saveDataType("subjects", this.subjects);
      this.saveDataType("chapters", this.chapters);
      this.saveDataType("questions", this.questions);
      this.saveDataType("subtopics", this.subtopics);
      this.saveDataType("messages", this.messages);
      this.saveDataType("files", this.files);
      this.saveDataType("folders", this.folders);
      this.saveDataType("quizSessions", this.quizSessions);
      this.saveDataType("quizAnswers", this.quizAnswers);
      this.saveDataType("studySessions", this.studySessions);
      this.saveDataType("scheduleEvents", this.scheduleEvents);
      this.saveDataType("quizStats", this.quizStats);
    } catch (error) {
      console.error("Error persisting data:", error);
    }
  }
  saveDataType(filename, data) {
    try {
      const dataPath = path.join(process.cwd(), "data");
      const filePath = path.join(dataPath, `${filename}.json`);
      const arrayData = data instanceof Map ? Array.from(data.values()) : data;
      fs.writeFileSync(filePath, JSON.stringify(arrayData, null, 2));
    } catch (error) {
      console.error(`Error saving ${filename}:`, error);
    }
  }
  // API Methods
  // Subjects
  async getSubjects() {
    return Array.from(this.subjects.values());
  }
  async createSubject(subject) {
    const id = this.subjectIdCounter++;
    const newSubject = { ...subject, id };
    this.subjects.set(id, newSubject);
    this.persistData();
    return newSubject;
  }
  // Chapters
  async getChapters() {
    return Array.from(this.chapters.values());
  }
  async getChaptersBySubject(subjectId) {
    return Array.from(this.chapters.values()).filter((chapter) => chapter.subjectId === subjectId);
  }
  async getChapter(id) {
    return this.chapters.get(id);
  }
  async createChapter(chapter) {
    const id = this.chapterIdCounter++;
    const newChapter = {
      ...chapter,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      totalQuestions: 0,
      completedQuestions: 0
    };
    this.chapters.set(id, newChapter);
    this.persistData();
    return newChapter;
  }
  async updateChapter(id, chapter) {
    const existing = this.chapters.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...chapter };
    this.chapters.set(id, updated);
    this.persistData();
    return updated;
  }
  async deleteChapter(id) {
    const deleted = this.chapters.delete(id);
    if (deleted) {
      Array.from(this.questions.values()).filter((q) => q.chapterId === id).forEach((q) => this.questions.delete(q.id));
      Array.from(this.subtopics.values()).filter((s) => s.chapterId === id).forEach((s) => this.subtopics.delete(s.id));
      this.persistData();
    }
    return deleted;
  }
  // Questions
  async getQuestionsByChapter(chapterId) {
    return Array.from(this.questions.values()).filter((question) => question.chapterId === chapterId);
  }
  async getQuestionsBySubtopic(subtopicId) {
    return Array.from(this.questions.values()).filter((question) => question.subtopicId === subtopicId);
  }
  async getQuestion(id) {
    return this.questions.get(id);
  }
  async createQuestion(questionData) {
    const id = this.questionIdCounter++;
    const newQuestion = {
      ...questionData,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.questions.set(id, newQuestion);
    const chapter = this.chapters.get(questionData.chapterId);
    if (chapter) {
      chapter.totalQuestions++;
      this.chapters.set(chapter.id, chapter);
    }
    this.persistData();
    return newQuestion;
  }
  async createBulkQuestions(questions2) {
    const createdQuestions = [];
    for (const questionData of questions2) {
      const id = this.questionIdCounter++;
      const newQuestion = {
        ...questionData,
        id,
        createdAt: /* @__PURE__ */ new Date()
      };
      this.questions.set(id, newQuestion);
      createdQuestions.push(newQuestion);
      const chapter = this.chapters.get(questionData.chapterId);
      if (chapter) {
        chapter.totalQuestions++;
        this.chapters.set(chapter.id, chapter);
      }
    }
    this.persistData();
    return createdQuestions;
  }
  // Subtopics
  async getSubtopicsByChapter(chapterId) {
    return Array.from(this.subtopics.values()).filter((subtopic) => subtopic.chapterId === chapterId);
  }
  async createSubtopic(subtopic) {
    const id = this.subtopicIdCounter++;
    const newSubtopic = {
      ...subtopic,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.subtopics.set(id, newSubtopic);
    this.persistData();
    return newSubtopic;
  }
  async deleteSubtopic(id) {
    const deleted = this.subtopics.delete(id);
    if (deleted) {
      Array.from(this.questions.values()).filter((q) => q.subtopicId === id).forEach((q) => this.questions.delete(q.id));
      this.persistData();
    }
    return deleted;
  }
  // Messages
  async getMessages() {
    return Array.from(this.messages.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  async createMessage(message) {
    const id = this.messageIdCounter++;
    const newMessage = {
      ...message,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.messages.set(id, newMessage);
    this.persistData();
    return newMessage;
  }
  // Files
  async getFiles() {
    return Array.from(this.files.values());
  }
  async createFile(file) {
    const id = this.fileIdCounter++;
    const newFile = {
      ...file,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.files.set(id, newFile);
    this.persistData();
    return newFile;
  }
  async deleteFile(id) {
    const deleted = this.files.delete(id);
    if (deleted) this.persistData();
    return deleted;
  }
  // Folders
  async getFolders() {
    return Array.from(this.folders.values());
  }
  async createFolder(folder) {
    const id = this.folderIdCounter++;
    const newFolder = {
      ...folder,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.folders.set(id, newFolder);
    this.persistData();
    return newFolder;
  }
  async deleteFolder(id) {
    const deleted = this.folders.delete(id);
    if (deleted) this.persistData();
    return deleted;
  }
  // Quiz Sessions
  async createQuizSession(session) {
    const id = this.sessionIdCounter++;
    const newSession = {
      ...session,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.quizSessions.set(id, newSession);
    this.persistData();
    return newSession;
  }
  async getQuizSession(id) {
    return this.quizSessions.get(id);
  }
  async updateQuizSession(id, session) {
    const existing = this.quizSessions.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...session };
    this.quizSessions.set(id, updated);
    this.persistData();
    return updated;
  }
  async getAllQuizSessions() {
    return Array.from(this.quizSessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  // Quiz Answers
  async createQuizAnswer(answer) {
    const id = this.answerIdCounter++;
    const newAnswer = { ...answer, id };
    this.quizAnswers.set(id, newAnswer);
    this.persistData();
    return newAnswer;
  }
  async getQuizAnswersBySession(sessionId) {
    return Array.from(this.quizAnswers.values()).filter((answer) => answer.sessionId === sessionId);
  }
  // Study Sessions
  async createStudySession(session) {
    const id = this.studySessionIdCounter++;
    const newSession = {
      ...session,
      id,
      date: /* @__PURE__ */ new Date()
    };
    this.studySessions.set(id, newSession);
    this.persistData();
    return newSession;
  }
  async getStudySessionsByChapter(chapterId) {
    return Array.from(this.studySessions.values()).filter((session) => session.chapterId === chapterId);
  }
  // User Stats
  async getUserStats() {
    const totalQuestions = this.questions.length;
    const totalChapters = this.chapters.length;
    const totalSubtopics = this.subtopics.length;
    return {
      totalQuestions,
      totalChapters,
      totalSubtopics,
      recentActivity: this.studySessions.slice(-5),
      quizStats: this.quizStats.slice(-10).reverse()
      // Last 10 quiz attempts
    };
  }
  async updateUserStats(stats) {
    this.userStatsData = { ...this.userStatsData, ...stats };
    this.persistData();
    return this.userStatsData;
  }
  // Schedule Events
  async getScheduleEvents() {
    return Array.from(this.scheduleEvents.values());
  }
  async createScheduleEvent(event) {
    const id = this.eventIdCounter++;
    const newEvent = { ...event, id };
    this.scheduleEvents.set(id, newEvent);
    this.persistData();
    return newEvent;
  }
  async updateScheduleEvent(id, event) {
    const existing = this.scheduleEvents.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...event };
    this.scheduleEvents.set(id, updated);
    this.persistData();
    return updated;
  }
  async deleteScheduleEvent(id) {
    const deleted = this.scheduleEvents.delete(id);
    if (deleted) this.persistData();
    return deleted;
  }
  async createQuizStat(data) {
    const newStat = {
      id: this.quizStatIdCounter++,
      ...data
    };
    this.quizStats.push(newStat);
    this.saveDataType("quizStats", this.quizStats);
    return newStat;
  }
};
var storage = new LocalStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull()
});
var chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").notNull(),
  totalQuestions: integer("total_questions").default(0),
  completedQuestions: integer("completed_questions").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull(),
  subtopicId: integer("subtopic_id"),
  question: text("question").notNull(),
  options: jsonb("options").notNull(),
  // Array of option strings
  correctAnswer: integer("correct_answer").notNull(),
  // Index of correct option (0-3)
  explanation: text("explanation"),
  difficulty: text("difficulty").default("medium"),
  // easy, medium, hard
  createdAt: timestamp("created_at").defaultNow()
});
var quizSessions = pgTable("quiz_sessions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  currentQuestion: integer("current_question").default(0),
  score: integer("score").default(0),
  timeRemaining: integer("time_remaining"),
  // in seconds
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var quizAnswers = pgTable("quiz_answers", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  questionId: integer("question_id").notNull(),
  selectedAnswer: integer("selected_answer"),
  // null for unanswered
  isCorrect: boolean("is_correct"),
  timeSpent: integer("time_spent"),
  // in seconds
  markedForReview: boolean("marked_for_review").default(false)
});
var studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull(),
  duration: integer("duration").notNull(),
  // in minutes
  date: timestamp("date").defaultNow(),
  type: text("type").notNull()
  // quiz, practice, review
});
var userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  totalQuestionsSolved: integer("total_questions_solved").default(0),
  totalCorrectAnswers: integer("total_correct_answers").default(0),
  studyStreak: integer("study_streak").default(0),
  lastStudyDate: timestamp("last_study_date"),
  totalStudyTimeMinutes: integer("total_study_time_minutes").default(0)
});
var scheduleEvents = pgTable("schedule_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").notNull(),
  chapterId: integer("chapter_id"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isCompleted: boolean("is_completed").default(false)
});
var insertSubjectSchema = createInsertSchema(subjects).omit({ id: true });
var insertChapterSchema = createInsertSchema(chapters).omit({ id: true, createdAt: true });
var insertQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  optionA: z.string().min(1, "Option A is required"),
  optionB: z.string().optional().default(""),
  optionC: z.string().optional().default(""),
  optionD: z.string().optional().default(""),
  correctAnswer: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Correct answer must be A, B, C, or D" })
  }),
  explanation: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  chapterId: z.number().positive("Chapter ID must be a positive number"),
  subtopicId: z.number().optional()
});
var insertQuizSessionSchema = createInsertSchema(quizSessions).omit({ id: true, createdAt: true });
var insertQuizAnswerSchema = createInsertSchema(quizAnswers).omit({ id: true });
var insertStudySessionSchema = createInsertSchema(studySessions).omit({ id: true, date: true });
var insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({ id: true });

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/subjects", async (req, res) => {
    try {
      const subjects2 = await storage.getSubjects();
      res.json(subjects2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  });
  app2.get("/api/chapters", async (req, res) => {
    try {
      const chapters2 = await storage.getChapters();
      res.json(chapters2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chapters" });
    }
  });
  app2.get("/api/chapters/subject/:subjectId", async (req, res) => {
    try {
      const subjectId = parseInt(req.params.subjectId);
      const chapters2 = await storage.getChaptersBySubject(subjectId);
      res.json(chapters2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chapters" });
    }
  });
  app2.post("/api/chapters", async (req, res) => {
    try {
      const chapterData = {
        title: req.body.title,
        description: req.body.description || null,
        subjectId: req.body.subjectId
      };
      const validatedData = insertChapterSchema.parse(chapterData);
      const chapter = await storage.createChapter(validatedData);
      res.json(chapter);
    } catch (error) {
      console.error("Chapter creation error:", error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid chapter data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create chapter" });
      }
    }
  });
  app2.put("/api/chapters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const chapterData = insertChapterSchema.partial().parse(req.body);
      const chapter = await storage.updateChapter(id, chapterData);
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }
      res.json(chapter);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid chapter data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update chapter" });
      }
    }
  });
  app2.delete("/api/chapters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteChapter(id);
      if (!deleted) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete chapter" });
    }
  });
  app2.get("/api/questions/chapter/:chapterId", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const questions2 = await storage.getQuestionsByChapter(chapterId);
      res.json(questions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });
  app2.get("/api/questions/subtopic/:subtopicId", async (req, res) => {
    try {
      const subtopicId = parseInt(req.params.subtopicId);
      const questions2 = await storage.getQuestionsBySubtopic(subtopicId);
      res.json(questions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subtopic questions" });
    }
  });
  app2.post("/api/questions", async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid question data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create question" });
      }
    }
  });
  app2.post("/api/questions/import-csv", async (req, res) => {
    try {
      console.log("Received CSV import request:", req.body);
      if (!req.body.questions || !Array.isArray(req.body.questions)) {
        res.status(400).json({ error: "Invalid request format. Expected 'questions' array." });
        return;
      }
      const validatedQuestions = [];
      for (let i = 0; i < req.body.questions.length; i++) {
        const q = req.body.questions[i];
        try {
          const questionData = {
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            chapterId: q.chapterId,
            subtopicId: q.subtopicId
          };
          validatedQuestions.push(questionData);
        } catch (validationError) {
          console.log(`Question ${i + 1} validation failed:`, validationError);
        }
      }
      if (validatedQuestions.length === 0) {
        res.status(400).json({ error: "No valid questions found in the data" });
        return;
      }
      const questions2 = await storage.createBulkQuestions(validatedQuestions);
      res.json({ message: `Successfully imported ${questions2.length} questions`, questions: questions2 });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ error: "Failed to import questions", message: error.message });
    }
  });
  app2.get("/api/subtopics/chapter/:chapterId", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const subtopics = await storage.getSubtopicsByChapter(chapterId);
      res.json(subtopics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subtopics" });
    }
  });
  app2.post("/api/subtopics", async (req, res) => {
    try {
      const subtopic = await storage.createSubtopic(req.body);
      res.json(subtopic);
    } catch (error) {
      res.status(500).json({ error: "Failed to create subtopic" });
    }
  });
  app2.delete("/api/subtopics/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSubtopic(id);
      if (!deleted) {
        res.status(404).json({ error: "Subtopic not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subtopic" });
    }
  });
  app2.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  app2.post("/api/messages", async (req, res) => {
    try {
      const message = await storage.createMessage(req.body);
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to create message" });
    }
  });
  app2.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });
  app2.post("/api/files", async (req, res) => {
    try {
      const file = await storage.createFile(req.body);
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to create file" });
    }
  });
  app2.delete("/api/files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFile(id);
      if (!deleted) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });
  app2.get("/api/folders", async (req, res) => {
    try {
      const folders = await storage.getFolders();
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });
  app2.post("/api/folders", async (req, res) => {
    try {
      const folder = await storage.createFolder(req.body);
      res.json(folder);
    } catch (error) {
      res.status(500).json({ error: "Failed to create folder" });
    }
  });
  app2.delete("/api/folders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFolder(id);
      if (!deleted) {
        res.status(404).json({ error: "Folder not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });
  app2.post("/api/quiz-sessions", async (req, res) => {
    try {
      const sessionData = insertQuizSessionSchema.parse(req.body);
      const session = await storage.createQuizSession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid session data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create quiz session" });
      }
    }
  });
  app2.get("/api/quiz/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getQuizSession(sessionId);
      if (!session) {
        res.status(404).json({ error: "Quiz session not found" });
        return;
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quiz session" });
    }
  });
  app2.put("/api/quiz/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const sessionData = insertQuizSessionSchema.partial().parse(req.body);
      const session = await storage.updateQuizSession(sessionId, sessionData);
      if (!session) {
        res.status(404).json({ error: "Quiz session not found" });
        return;
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid session data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update quiz session" });
      }
    }
  });
  app2.post("/api/quiz/:sessionId/answer", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const answerData = insertQuizAnswerSchema.parse({ ...req.body, sessionId });
      const answer = await storage.saveQuizAnswer(answerData);
      res.json(answer);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid answer data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save answer" });
      }
    }
  });
  app2.get("/api/quiz/:sessionId/answers", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const answers = await storage.getQuizAnswers(sessionId);
      res.json(answers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quiz answers" });
    }
  });
  app2.get("/api/study-sessions", async (req, res) => {
    try {
      const sessions = await storage.getStudySessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch study sessions" });
    }
  });
  app2.post("/api/study-sessions", async (req, res) => {
    try {
      const sessionData = insertStudySessionSchema.parse(req.body);
      const session = await storage.createStudySession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid session data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create study session" });
      }
    }
  });
  app2.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });
  app2.post("/api/stats", async (req, res) => {
    try {
      const statData = {
        date: new Date(req.body.date),
        chapterTitle: req.body.chapterTitle,
        subtopicTitle: req.body.subtopicTitle || null,
        subjectTitle: req.body.subjectTitle || "General",
        score: req.body.score,
        totalQuestions: req.body.totalQuestions,
        percentage: req.body.percentage
      };
      const stat = await storage.createQuizStat(statData);
      res.json(stat);
    } catch (error) {
      console.error("Error saving quiz stat:", error);
      res.status(500).json({ error: "Failed to save quiz stat" });
    }
  });
  app2.put("/api/stats", async (req, res) => {
    try {
      const statsData = req.body;
      const stats = await storage.updateUserStats(statsData);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user stats" });
    }
  });
  app2.get("/api/schedule", async (req, res) => {
    try {
      const events = await storage.getScheduleEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedule events" });
    }
  });
  app2.get("/api/schedule/date/:date", async (req, res) => {
    try {
      const date = new Date(req.params.date);
      const events = await storage.getScheduleEventsByDate(date);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedule events" });
    }
  });
  app2.post("/api/schedule", async (req, res) => {
    try {
      const eventData = insertScheduleEventSchema.parse(req.body);
      const event = await storage.createScheduleEvent(eventData);
      res.json(event);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid event data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create schedule event" });
      }
    }
  });
  app2.put("/api/schedule/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const eventData = insertScheduleEventSchema.partial().parse(req.body);
      const event = await storage.updateScheduleEvent(id, eventData);
      if (!event) {
        res.status(404).json({ error: "Schedule event not found" });
        return;
      }
      res.json(event);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid event data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update schedule event" });
      }
    }
  });
  app2.delete("/api/schedule/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteScheduleEvent(id);
      if (!deleted) {
        res.status(404).json({ error: "Schedule event not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule event" });
    }
  });
  app2.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });
  app2.post("/api/files", async (req, res) => {
    try {
      const file = await storage.createFile(req.body);
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to create file" });
    }
  });
  app2.get("/api/folders", async (req, res) => {
    try {
      const folders = await storage.getFolders();
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });
  app2.post("/api/folders", async (req, res) => {
    try {
      const folder = await storage.createFolder(req.body);
      res.json(folder);
    } catch (error) {
      res.status(500).json({ error: "Failed to create folder" });
    }
  });
  app2.post("/api/questions/bulk", async (req, res) => {
    try {
      const { questions: questions2 } = req.body;
      const results = [];
      for (const question of questions2) {
        try {
          const result = await storage.createQuestion(question);
          results.push(result);
        } catch (error) {
          console.error("Error creating question:", error);
        }
      }
      res.json({ message: `${results.length} questions created successfully`, questions: results });
    } catch (error) {
      res.status(500).json({ error: "Failed to create bulk questions", message: error.message });
    }
  });
  app2.delete("/api/folders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFolder(id);
      if (!deleted) {
        res.status(404).json({ error: "Folder not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });
  app2.post("/api/upload-csv", async (req, res) => {
    try {
      const { questions: questions2 } = req.body;
      console.log("Received questions for upload:", questions2);
      if (!questions2 || !Array.isArray(questions2)) {
        return res.status(400).json({ error: "Invalid questions data" });
      }
      const transformedQuestions = questions2.map((q) => ({
        chapterId: q.chapterId,
        subtopicId: q.subtopicId || null,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || null,
        difficulty: q.difficulty || null
      }));
      console.log("Transformed questions:", transformedQuestions);
      const savedQuestions = await storage.createBulkQuestions(transformedQuestions);
      console.log("Saved questions:", savedQuestions);
      res.json({
        success: true,
        message: `Successfully uploaded ${savedQuestions.length} questions`,
        count: savedQuestions.length
      });
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({
        error: "Failed to upload questions",
        details: error.message
      });
    }
  });
  app2.post("/api/quiz-results", async (req, res) => {
    try {
      const { chapterId, subtopicId, score, totalQuestions, correct, incorrect, unanswered, quizType, chapterTitle, subtopicTitle, subjectName } = req.body;
      const newResult = {
        subject: subjectName || "Unknown",
        chapter: chapterTitle || "Unknown Chapter",
        subtopic: subtopicTitle || null,
        date: /* @__PURE__ */ new Date(),
        score: correct
      };
      await storage.createQuizStat(newResult);
      res.json({ message: "Quiz result saved successfully" });
    } catch (error) {
      console.error("Error saving quiz result:", error);
      res.status(500).json({ error: "Failed to save quiz result" });
    }
  });
  app2.get("/api/quiz-stats", async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats.quizStats || []);
    } catch (error) {
      console.error("Error getting quiz stats:", error);
      res.status(500).json({ error: "Failed to get quiz stats" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
dotenv.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
