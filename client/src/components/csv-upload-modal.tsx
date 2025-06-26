import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, AlertCircle, CheckCircle } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createBulkQuestions } from "@/lib/api-functions";

interface JSONUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: number;
  chapterTitle: string;
}

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

export function JSONUploadModal({ isOpen, onClose, chapterId, chapterTitle }: JSONUploadModalProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);

  const handleUploadQuestions = async (questions: ParsedQuestion[]) => {
    setIsUploading(true);
    try {
      const formattedQuestions = questions.map(q => {
        const correctAnswerIndex = q.correctAnswer === 'A' ? 0 : 
                                   q.correctAnswer === 'B' ? 1 : 
                                   q.correctAnswer === 'C' ? 2 : 3;

        return {
          question: q.question,
          options: [q.optionA, q.optionB, q.optionC, q.optionD],
          correctAnswer: correctAnswerIndex,
          explanation: q.explanation || "No explanation provided",
          difficulty: (q.difficulty?.toLowerCase() as "easy" | "medium" | "hard") || "medium"
        };
      });

      console.log('Uploading to chapter:', chapterId);
      console.log('Formatted questions before upload:', formattedQuestions.map(q => ({ 
        question: q.question.substring(0, 30), 
        options: q.options.length,
        correctAnswer: q.correctAnswer
      })));

      const result = await createBulkQuestions({
        chapterId,
        questions: formattedQuestions
      });

      console.log('Upload result:', result);

      toast({
        title: "Success!",
        description: `Successfully uploaded ${result.length} questions to ${chapterTitle}`,
      });

      handleClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your questions.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const parseJSON = (text: string): ParsedQuestion[] => {
    try {
      const jsonData = JSON.parse(text);
      console.log('Parsed JSON data:', jsonData);
      
      let questionsArray = [];
      
      // Handle different JSON structures
      if (Array.isArray(jsonData)) {
        questionsArray = jsonData;
      } else if (jsonData.questions && Array.isArray(jsonData.questions)) {
        questionsArray = jsonData.questions;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        questionsArray = jsonData.data;
      } else {
        throw new Error('JSON must contain an array of questions or have a "questions" property with an array');
      }

      console.log(`Total questions in JSON: ${questionsArray.length}`);

      const questions: ParsedQuestion[] = [];

      questionsArray.forEach((item: any, index: number) => {
        try {
          const question: ParsedQuestion = {
            question: item.question?.trim() || '',
            optionA: item.optionA?.trim() || item.options?.[0]?.trim() || '',
            optionB: item.optionB?.trim() || item.options?.[1]?.trim() || '',
            optionC: item.optionC?.trim() || item.options?.[2]?.trim() || '',
            optionD: item.optionD?.trim() || item.options?.[3]?.trim() || '',
            correctAnswer: item.correctAnswer?.toString().toUpperCase() || 'A',
            explanation: item.explanation?.trim() || '',
            difficulty: item.difficulty?.toLowerCase() || 'medium'
          };

          // Validate that all required fields are present
          if (question.question && 
              question.optionA && 
              question.optionB && 
              question.optionC && 
              question.optionD &&
              ['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
            questions.push(question);
            console.log(`Valid question ${questions.length} added: "${question.question.substring(0, 50)}..."`);
          } else {
            console.log(`Skipping invalid question ${index + 1}: missing or invalid fields`);
            console.log('Question data:', { 
              question: question.question?.substring(0, 30), 
              correctAnswer: question.correctAnswer,
              hasOptions: !!(question.optionA && question.optionB && question.optionC && question.optionD)
            });
          }
        } catch (error) {
          console.log(`Error processing question ${index + 1}:`, error);
        }
      });

      console.log(`Final questions count: ${questions.length}`);
      return questions;
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error('Failed to parse JSON file. Please ensure it contains valid JSON with questions.');
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      setParseError("Please select a JSON file");
      return;
    }

    setSelectedFile(file);
    setParseError(null);

    try {
      const text = await file.text();
      const questions = parseJSON(text);
      setParsedQuestions(questions);
      toast({
        title: "JSON Parsed Successfully",
        description: `Found ${questions.length} valid questions`,
      });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse JSON");
      setParsedQuestions([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParseError(null);
    setParsedQuestions([]);
    onClose();
  };

  const handleUpload = () => {
    if (parsedQuestions.length > 0) {
      handleUploadQuestions(parsedQuestions);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-jet border-glass-border max-w-[350px] w-[80%] rounded-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-3 pb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20">
              <Upload className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">Upload JSON</DialogTitle>
              <p className="text-gray-400 text-xs mt-0.5">
                {chapterTitle}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="w-6 h-6 p-0 hover:bg-gray-800 rounded"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-3 pb-2">
          <div className="mb-2">
            <p className="text-xs text-gray-300 mb-1">
              JSON format with questions array containing: question, optionA, optionB, optionC, optionD, correctAnswer
            </p>
          </div>

          {/* Upload Area */}
          <div
            className={cn(
              "mt-2 bg-transparent p-4 w-full flex flex-col items-center border border-dashed border-gray-600 rounded-lg transition-all duration-300 cursor-pointer",
              isDragOver && "border-green-400 bg-green-400/5",
              "hover:border-gray-500 hover:bg-gray-900/30"
            )}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={cn(
              "w-6 h-6 flex items-center justify-center rounded-full transition-transform duration-300",
              isDragOver ? "scale-110 text-green-400" : "text-green-400"
            )}>
              <Upload className="w-4 h-4" />
            </div>

            <span className="mt-2 block font-bold text-white text-center text-xs">
              {selectedFile ? selectedFile.name : "Choose JSON or drag & drop"}
            </span>

            <span className="block text-gray-400 text-xs text-center mt-1">
              <strong className="text-green-400 font-bold">Click to browse</strong>
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Status Messages */}
          {parseError && (
            <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded flex items-center space-x-2">
              <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-xs">{parseError}</span>
            </div>
          )}

          {parsedQuestions.length > 0 && (
            <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
              <span className="text-green-300 text-xs">
                Ready: {parsedQuestions.length} questions
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 pb-3 flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs px-2 py-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={parsedQuestions.length === 0 || isUploading}
            className="bg-green-600 hover:bg-green-500 text-white font-medium text-xs px-3 py-1"
          >
            {isUploading ? "Uploading..." : `Upload ${parsedQuestions.length}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}