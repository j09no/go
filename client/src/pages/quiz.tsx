import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Trophy,
  Pause,
  Home,
  RotateCcw,
  Play,
  LogOut
} from "lucide-react";
import { useTimer } from "@/hooks/use-timer";
import { calculateQuizScore, calculateQuestionScore, NEET_SCORING } from "@/lib/quiz-scoring";
import { cn, shuffleArray } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { neon } from "@neondatabase/serverless";

interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  difficulty?: string;
}

// Neon DB setup
const neonUrl = import.meta.env.VITE_DATABASE_URL;
const sql = neonUrl ? neon(neonUrl) : null;

export default function Quiz() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timerPaused, setTimerPaused] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [currentChapterTitle, setCurrentChapterTitle] = useState<string>("");
  const [currentChapterId, setCurrentChapterId] = useState<string>("");
  const [quizType, setQuizType] = useState<'normal' | 'wrongOnly'>('normal');

  const { timeRemaining: timeLeft, start: startTimer, pause: pauseTimer, reset: resetTimer, isRunning } = useTimer({
    initialTime: 30 * 60, // 30 minutes
    onTimeUp: () => handleQuizComplete(),
    autoStart: false
  });

  const handleQuizComplete = async () => {
    setShowResults(true);
    pauseTimer();

    // Save quiz result
    try {
      const results = calculateResults();
      await saveQuizResult(results);
    } catch (error) {
      console.error('Failed to save quiz result:', error);
    }
  };

  const saveQuizResult = async (results: any) => {
    try {
      const accuracy = Math.round((results.correct / questions.length) * 100);
      const currentDate = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      const quizData = {
        date: currentDate,
        chapterTitle: currentChapterTitle || 'Unknown Chapter',
        subjectTitle: 'NEET',
        score: results.score, // Use actual NEET scoring (4 points per correct, -1 per wrong)
        totalQuestions: questions.length,
        correct: results.correct,
        wrong: results.incorrect,
        percentage: accuracy,
        accuracy: accuracy
      };

      console.log('Saving quiz result with correct calculations:', {
        results,
        quizData,
        scoringUsed: `${results.correct} correct × 4 = ${results.correct * 4}, ${results.incorrect} wrong × (-1) = ${results.incorrect * -1}`
      });

      // Save quiz stats
      if (sql) {
        await sql(`
          CREATE TABLE IF NOT EXISTS quiz_stats (
            id SERIAL PRIMARY KEY,
            date TEXT NOT NULL,
            chapter_title TEXT NOT NULL,
            subject_title TEXT DEFAULT 'NEET',
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            correct_answers INTEGER NOT NULL,
            wrong_answers INTEGER NOT NULL,
            percentage INTEGER NOT NULL,
            accuracy INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        const insertResult = await sql(`
          INSERT INTO quiz_stats (date, chapter_title, subject_title, score, total_questions, correct_answers, wrong_answers, percentage, accuracy)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          quizData.date,
          quizData.chapterTitle,
          quizData.subjectTitle,
          quizData.score,
          quizData.totalQuestions,
          quizData.correct,
          quizData.wrong,
          quizData.percentage,
          quizData.accuracy
        ]);

        console.log('Successfully saved to database:', {
          insertedId: insertResult[0]?.id,
          savedData: quizData
        });

        console.log('Quiz result saved to Neon database with ID:', insertResult[0]?.id);

        // Update chapter completion progress (increment by 1)
        if (currentChapterId) {
          await sql(`
            UPDATE chapters 
            SET completed_questions = completed_questions + 1 
            WHERE id = $1 AND completed_questions < total_questions
          `, [parseInt(currentChapterId)]);
        }
      } else {
        // Fallback to localStorage
        const quizStats = JSON.parse(localStorage.getItem('quiz_stats') || '[]');
        quizStats.push({
          id: Date.now(),
          ...quizData,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('quiz_stats', JSON.stringify(quizStats));
        console.log('Quiz result saved to localStorage');

        // Update chapter completion progress in localStorage (increment by 1)
        if (currentChapterId) {
          const stored = localStorage.getItem('neon_chapters');
          if (stored) {
            const chapters = JSON.parse(stored);
            const chapterIndex = chapters.findIndex((c: any) => c.id === parseInt(currentChapterId));
            if (chapterIndex !== -1 && chapters[chapterIndex].completedQuestions < chapters[chapterIndex].totalQuestions) {
              chapters[chapterIndex].completedQuestions = (chapters[chapterIndex].completedQuestions || 0) + 1;
              localStorage.setItem('neon_chapters', JSON.stringify(chapters));
            }
          }
        }
      }

      toast({
        title: "Quiz Result Saved!",
        description: `Score: ${results.correct}/${questions.length} saved successfully`,
      });
    } catch (error) {
      console.error('Failed to save quiz result:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz result",
        variant: "destructive",
      });
    }
  };

  // Initialize database and load chapters
  useEffect(() => {
    const initDatabase = async () => {
      if (!sql) return;
      
      try {
        await sql(`
          CREATE TABLE IF NOT EXISTS chapters (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            subject_id INTEGER NOT NULL,
            total_questions INTEGER DEFAULT 0,
            completed_questions INTEGER DEFAULT 0,
            difficulty TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await sql(`
          CREATE TABLE IF NOT EXISTS quiz_stats (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            chapter_title TEXT NOT NULL,
            subject_title TEXT DEFAULT 'NEET',
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            percentage INTEGER NOT NULL
          )
        `);
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };

    const loadChapters = async () => {
      try {
        if (sql) {
          const result = await sql('SELECT * FROM chapters ORDER BY created_at DESC');
          setChapters(result);
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem('neon_chapters');
          const chaptersData = stored ? JSON.parse(stored) : [];
          setChapters(chaptersData);
        }
      } catch (error) {
        console.error('Error loading chapters:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('neon_chapters');
        const chaptersData = stored ? JSON.parse(stored) : [];
        setChapters(chaptersData);
      }
    };

    initDatabase();
    loadChapters();
  }, []);

  // Load questions from sessionStorage when component mounts
  useEffect(() => {
    const loadQuestionsFromSession = () => {
      const quizData = sessionStorage.getItem('current_quiz_data');
      const chapterId = sessionStorage.getItem('current_chapter_id');
      const chapterTitle = sessionStorage.getItem('current_chapter_title');

      console.log('Quiz data from sessionStorage:', { quizData, chapterId, chapterTitle });

      // Check if all required data is present and not null/undefined
      if (!quizData || quizData === 'undefined' || !chapterId || !chapterTitle) {
        console.log('Missing quiz data, redirecting to chapters');
        toast({
          title: "No Quiz Selected",
          description: "Please select a chapter and start a quiz from the chapters page.",
          variant: "destructive",
        });
        setLocation("/chapters");
        return;
      }

      try {
        // First try to parse the quiz data
        let parsedData;
        try {
          parsedData = JSON.parse(quizData);
        } catch (parseError) {
          console.error('Error parsing quiz data:', parseError);
          console.log('Raw quiz data:', quizData);
          throw new Error('Invalid JSON format - the stored quiz data is corrupted');
        }

        // Check if parsedData has questions array
        let questionsArray;
        if (parsedData && parsedData.questions && Array.isArray(parsedData.questions)) {
          questionsArray = parsedData.questions;
        } else if (Array.isArray(parsedData)) {
          questionsArray = parsedData;
        } else {
          throw new Error('No questions array found in data');
        }

        // Validate each question has required fields
        const validQuestions = questionsArray.filter(q => 
          q && q.question && q.optionA && q.optionB && q.optionC && q.optionD && q.correctAnswer
        );

        if (validQuestions.length === 0) {
          throw new Error('No valid questions found in the quiz data');
        }

        // Randomize questions order
        const randomizedQuestions = shuffleArray(validQuestions);
        setQuestions(randomizedQuestions);
        setCurrentChapterId(chapterId);
        setCurrentChapterTitle(chapterTitle);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowResults(false);
        setQuizStarted(false);

        console.log(`Successfully loaded ${validQuestions.length} questions for quiz`);
      } catch (error) {
        console.error('Error loading quiz data:', error);
        toast({
          title: "Error Loading Quiz",
          description: `Failed to load quiz questions: ${error.message}`,
          variant: "destructive",
        });
        // Clear the corrupted data
        sessionStorage.removeItem('current_quiz_data');
        sessionStorage.removeItem('current_chapter_id');
        sessionStorage.removeItem('current_chapter_title');
        setLocation("/chapters");
      }
    };

    loadQuestionsFromSession();
  }, [toast, setLocation]);



  // Clear sessionStorage when quiz is completed or user goes home
  const handleGoHome = () => {
    sessionStorage.removeItem('current_quiz_data');
    sessionStorage.removeItem('current_chapter_id');
    sessionStorage.removeItem('current_chapter_title');
    setLocation("/chapters");
  };

  // Show loading if no questions are loaded yet
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading quiz questions...</p>
          <Button 
            onClick={() => setLocation("/chapters")}
            className="mt-4 bg-gray-600 hover:bg-gray-500"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Chapters
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Show loading if currentQuestion is not available
  if (!currentQuestion && quizStarted && !showResults) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading question...</p>
        </div>
      </div>
    );
  }

  const handleAnswerSelect = (answer: string, optionLetter: string) => {
    const newSelectedAnswers = {
      ...selectedAnswers,
      [currentQuestionIndex]: optionLetter, // Store the letter (A, B, C, D) instead of full text
    };
    setSelectedAnswers(newSelectedAnswers);

    // Auto move to next question
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // Quiz completed
        handleQuizComplete();
      }
    }, 500);
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    startTimer();
  };

  const handlePauseTimer = () => {
    if (isRunning) {
      pauseTimer();
      setTimerPaused(true);
    } else {
      startTimer();
      setTimerPaused(false);
    }
  };

  const handleExitQuiz = () => {
    setShowResults(true);
    pauseTimer();
  };

  const handlePlayAgain = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setQuizStarted(false);
    setTimerPaused(false);
    resetTimer();
  };

  const handleWrongTry = () => {
    const wrongQuestions = questions.filter((question, index) => 
      selectedAnswers[index] && selectedAnswers[index].trim().toUpperCase() !== question.correctAnswer.trim().toUpperCase()
    );

    if (wrongQuestions.length === 0) {
      toast({
        title: "Perfect Score!",
        description: "You got all questions right. No wrong answers to practice!",
      });
      return;
    }

    // Randomize wrong questions order
    const randomizedWrongQuestions = shuffleArray(wrongQuestions);
    setQuestions(randomizedWrongQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setQuizStarted(false);
    setTimerPaused(false);
    setQuizType('wrongOnly');
    resetTimer();
  };

  

  const calculateResults = () => {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach((question, index) => {
      const userAnswer = selectedAnswers[index];
      if (!userAnswer) {
        unanswered++;
      } else if (userAnswer.trim().toUpperCase() === question.correctAnswer.trim().toUpperCase()) {
        correct++;
      } else {
        incorrect++;
      }
    });

    const score = (correct * NEET_SCORING.CORRECT) + (incorrect * NEET_SCORING.INCORRECT);
    console.log('Quiz Results Calculation:', {
      total: questions.length,
      correct,
      incorrect,
      unanswered,
      score,
      selectedAnswers
    });
    return { correct, incorrect, unanswered, score };
  };

  const { correct, incorrect, unanswered, score } = calculateResults();

  // Pre-quiz state
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Ready to Start?</h1>
          <p className="text-gray-400 mb-3">
            {currentChapterTitle || 'Chapter Quiz'}
          </p>
          <p className="text-sm text-gray-300 mb-6">
            {questions.length} Questions • 30 Minutes
          </p>
          <div className="space-y-3">
            <Button 
              onClick={handleStartQuiz}
              className="bg-green-600 hover:bg-green-500 px-8 py-2 w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Quiz
            </Button>
            <Button 
              onClick={() => setLocation("/chapters")}
              variant="outline"
              className="px-8 py-2 w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Chapters
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Results page
  if (showResults) {
    const accuracy = Math.round((correct / totalQuestions) * 100);
    
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-purple-950/20"></div>
          <div className="relative px-6 py-8 text-center">
            <div className="mb-6">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 drop-shadow-lg" />
              <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Quiz Complete!
              </h1>
              <p className="text-gray-400 font-semibold">
                {currentChapterTitle || 'Chapter Quiz'}
              </p>
            </div>
            
            {/* Score Display */}
            <div className="bg-black/60 backdrop-blur-xl rounded-3xl p-6 mx-auto max-w-sm border border-gray-800/50 shadow-2xl">
              <div className="text-center">
                <div className="text-5xl font-black text-white mb-2">{score}</div>
                <div className="text-lg font-bold text-gray-300 mb-4">Final Score</div>
                
                <div className="flex justify-center items-center space-x-6 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-400">{correct}</div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Correct</div>
                  </div>
                  <div className="w-px h-12 bg-gray-700"></div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-red-400">{incorrect}</div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Wrong</div>
                  </div>
                </div>
                
                <div className={cn(
                  "text-2xl font-black mb-2",
                  accuracy >= 90 ? "text-green-400" : 
                  accuracy >= 75 ? "text-blue-400" : 
                  accuracy >= 60 ? "text-yellow-400" : "text-red-400"
                )}>
                  {accuracy}% Accuracy
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Review Section */}
        <div className="px-6 py-6">
          <h2 className="text-xl font-black mb-4 text-white">Review Answers</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {questions.map((question, index) => {
              const userAnswer = selectedAnswers[index];
              const isCorrect = userAnswer && userAnswer.trim().toUpperCase() === question.correctAnswer.trim().toUpperCase();
              const correctOption = question[`option${question.correctAnswer}`];
              const userOption = userAnswer ? question[`option${userAnswer}`] : null;

              return (
                <div key={index} className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0",
                      !userAnswer ? "bg-gray-600 text-white" : 
                      isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm mb-3 leading-relaxed">
                        {question.question}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-green-400 font-bold text-xs uppercase tracking-wide">Correct:</span>
                            <p className="text-white font-semibold text-sm">{question.correctAnswer} - {correctOption}</p>
                          </div>
                        </div>
                        
                        {userAnswer && (
                          <div className="flex items-start space-x-2">
                            <div className={cn(
                              "w-4 h-4 mt-0.5 shrink-0",
                              isCorrect ? "text-green-400" : "text-red-400"
                            )}>
                              {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className={cn(
                                "font-bold text-xs uppercase tracking-wide",
                                isCorrect ? "text-green-400" : "text-red-400"
                              )}>
                                Your Answer:
                              </span>
                              <p className="text-white font-semibold text-sm">{userAnswer} - {userOption}</p>
                            </div>
                          </div>
                        )}
                        
                        {!userAnswer && (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-gray-500 rounded-full shrink-0"></div>
                            <span className="text-gray-400 font-semibold text-sm">Not answered</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-8">
          <div className="grid grid-cols-1 gap-3">
            <Button 
              onClick={handlePlayAgain}
              className="bg-red-800 hover:bg-red-700 text-white font-black py-4 rounded-2xl border-0 shadow-lg text-lg tracking-wide transition-all duration-200 transform hover:scale-105"
            >
              <RotateCcw className="w-5 h-5 mr-3" />
              Play Again
            </Button>
            
            {incorrect > 0 && (
              <Button 
                onClick={handleWrongTry}
                className="bg-red-800 hover:bg-red-700 text-white font-black py-4 rounded-2xl border-0 shadow-lg text-lg tracking-wide transition-all duration-200 transform hover:scale-105"
              >
                <XCircle className="w-5 h-5 mr-3" />
                Practice Wrong Answers
              </Button>
            )}
            
            <Button 
              onClick={handleGoHome}
              className="bg-red-800 hover:bg-red-700 text-white font-black py-4 rounded-2xl border-0 shadow-lg text-lg tracking-wide transition-all duration-200 transform hover:scale-105"
            >
              <Home className="w-5 h-5 mr-3" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation */}
      <div className="bg-gray-900 border-b border-gray-700 p-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            onClick={handlePauseTimer}
            className="bg-black hover:bg-gray-800 text-amber-200 border border-amber-200/20 text-sm px-4 py-2 h-9 rounded-xl font-medium transition-all duration-200 hover:border-amber-200/40"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </>
            )}
          </Button>

          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-400">Time Remaining</div>
          </div>

          <Button
            onClick={handleExitQuiz}
            className="bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-200/20 text-sm px-4 py-2 h-9 rounded-xl font-medium transition-all duration-200 hover:border-red-200/40"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-3">
        <div className="max-w-2xl mx-auto">
          <div className="mb-3 text-center">
            <div className="text-xs font-medium text-gray-400 mb-2">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <h2 className="text-sm font-medium mb-4 leading-relaxed">
                {currentQuestion.question}
              </h2>

              <div className="space-y-2">
                {[
                  { key: 'A', value: currentQuestion.optionA },
                  { key: 'B', value: currentQuestion.optionB },
                  { key: 'C', value: currentQuestion.optionC },
                  { key: 'D', value: currentQuestion.optionD }
                ].map((option) => {
                  const isSelected = selectedAnswers[currentQuestionIndex] === option.key;

                  return (
                    <button
                      key={`question-${currentQuestionIndex}-option-${option.key}`}
                      onClick={() => handleAnswerSelect(option.value, option.key)}
                      className={cn(
                        "w-full p-3 text-left rounded-lg border-2 transition-all duration-200",
                        "hover:border-blue-500 hover:bg-blue-500/10",
                        isSelected ? "border-blue-500 bg-blue-500/20" : "border-gray-600 bg-gray-800/50"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                          isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-500 text-gray-300"
                        )}>
                          {option.key}
                        </span>
                        <span className="flex-1 text-xs">
                          {option.value}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}