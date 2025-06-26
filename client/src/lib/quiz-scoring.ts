export const NEET_SCORING = {
  CORRECT: 4,
  INCORRECT: -1,
  UNANSWERED: 0,
} as const;

export interface QuizResult {
  questionId: number;
  selectedAnswer: number | null;
  correctAnswer: number;
  isCorrect: boolean;
  points: number;
}

export interface QuizSummary {
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
}

export function calculateQuizScore(results: QuizResult[]): QuizSummary {
  const totalQuestions = results.length;
  const attempted = results.filter(r => r.selectedAnswer !== null).length;
  const correct = results.filter(r => r.isCorrect).length;
  const incorrect = results.filter(r => r.selectedAnswer !== null && !r.isCorrect).length;
  const unanswered = totalQuestions - attempted;
  
  const totalScore = results.reduce((sum, result) => sum + result.points, 0);
  const maxScore = totalQuestions * NEET_SCORING.CORRECT;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    totalQuestions,
    attempted,
    correct,
    incorrect,
    unanswered,
    totalScore,
    maxScore,
    percentage,
  };
}

export function calculateQuestionScore(
  selectedAnswer: number | null,
  correctAnswer: number
): { isCorrect: boolean; points: number } {
  if (selectedAnswer === null) {
    return { isCorrect: false, points: NEET_SCORING.UNANSWERED };
  }
  
  const isCorrect = selectedAnswer === correctAnswer;
  const points = isCorrect ? NEET_SCORING.CORRECT : NEET_SCORING.INCORRECT;
  
  return { isCorrect, points };
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 80) return "text-green-400";
  if (percentage >= 60) return "text-yellow-400";
  if (percentage >= 40) return "text-orange-400";
  return "text-red-400";
}

export function getScoreFeedback(percentage: number): string {
  if (percentage >= 90) return "Excellent! Outstanding performance!";
  if (percentage >= 80) return "Great job! Very good performance!";
  if (percentage >= 70) return "Good work! Keep it up!";
  if (percentage >= 60) return "Not bad! Room for improvement.";
  if (percentage >= 50) return "Average performance. More practice needed.";
  return "Need more practice. Don't give up!";
}
