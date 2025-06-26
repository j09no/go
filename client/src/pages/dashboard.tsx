import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { Target, CheckCircle, BookOpen, Clock, Flame, PlayCircle, BarChart3, Zap, Trophy, TrendingUp, Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { neon } from "@neondatabase/serverless";

// Neon database setup
const neonUrl = import.meta.env.VITE_DATABASE_URL;
const sql = neonUrl ? neon(neonUrl) : null;

// Database functions
const initBgiTable = async () => {
  if (!sql) {
    console.log('Neon not configured, using localStorage');
    return;
  }
  
  try {
    await sql(`
      CREATE TABLE IF NOT EXISTS bgi (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('BGI table initialized successfully');
  } catch (error) {
    console.error('Error initializing BGI table:', error);
  }
};

const getBackgroundImages = async (): Promise<string[]> => {
  if (!sql) {
    const stored = localStorage.getItem('bg_images');
    return stored ? JSON.parse(stored) : ['/bg.jpg', '/bgg.jpg'];
  }

  try {
    const result = await sql('SELECT image_url FROM bgi ORDER BY uploaded_at ASC');
    const images = result.map((row: any) => row.image_url);
    return images.length > 0 ? images : ['/bg.jpg', '/bgg.jpg'];
  } catch (error) {
    console.error('Error fetching background images:', error);
    return ['/bg.jpg', '/bgg.jpg'];
  }
};

const addBackgroundImage = async (imageUrl: string): Promise<void> => {
  if (!sql) {
    const stored = localStorage.getItem('bg_images');
    const images = stored ? JSON.parse(stored) : ['/bg.jpg', '/bgg.jpg'];
    images.push(imageUrl);
    localStorage.setItem('bg_images', JSON.stringify(images));
    return;
  }

  try {
    await sql('INSERT INTO bgi (image_url) VALUES ($1)', [imageUrl]);
    console.log('Background image added successfully');
  } catch (error) {
    console.error('Error adding background image:', error);
    throw error;
  }
};

// Interactive 3D Card Component
const InteractiveCard = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Array of background images from database and fallback to local
  const [backgroundImages, setBackgroundImages] = useState<string[]>([
    '/bg.jpg',
    '/bgg.jpg'
  ]);

  // Load background images from database
  useEffect(() => {
    const loadBackgroundImages = async () => {
      try {
        await initBgiTable();
        const dbImages = await getBackgroundImages();
        if (dbImages.length > 0) {
          setBackgroundImages(dbImages);
        }
      } catch (error) {
        console.error('Error loading background images:', error);
      }
    };
    
    loadBackgroundImages();

    // Listen for background image updates
    const handleBackgroundUpdate = (event: CustomEvent) => {
      const { images } = event.detail;
      setBackgroundImages(images);
    };

    window.addEventListener('backgroundImagesUpdated', handleBackgroundUpdate as EventListener);
    
    return () => {
      window.removeEventListener('backgroundImagesUpdated', handleBackgroundUpdate as EventListener);
    };
  }, []);

  // Background image slideshow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      );
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    
    if (!container || !card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;
      
      const rotateX = (mouseY / rect.height) * -30;
      const rotateY = (mouseX / rect.width) * 30;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const touchX = touch.clientX - centerX;
      const touchY = touch.clientY - centerY;
      
      const rotateX = (touchY / rect.height) * -30;
      const rotateY = (touchX / rect.width) * 30;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleTouchEnd = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef} className="container">
      <div className="canvas">
        <div className="tr-1"></div>
        <div className="tr-2"></div>
        <div className="tr-3"></div>
        <div className="tr-4"></div>
        <div className="tr-5"></div>
        <div className="tr-6"></div>
        <div className="tr-7"></div>
        <div className="tr-8"></div>
        <div className="tr-9"></div>
        <div className="tr-10"></div>
        <div className="tr-11"></div>
        <div className="tr-12"></div>
        <div className="tr-13"></div>
        <div className="tr-14"></div>
        <div className="tr-15"></div>
        <div className="tr-16"></div>
        <div className="tr-17"></div>
        <div className="tr-18"></div>
        <div className="tr-19"></div>
        <div className="tr-20"></div>
        <div className="tr-21"></div>
        <div className="tr-22"></div>
        <div className="tr-23"></div>
        <div className="tr-24"></div>
        <div className="tr-25"></div>
      </div>
      
      <div className="tracker"></div>
      
      <div id="card" ref={cardRef}>
        {/* Card background with slideshow */}
        <div 
          className="card-background"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${backgroundImages[currentImageIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transition: 'background-image 2s ease-in-out, opacity 0.8s ease-in-out'
          }}
        ></div>
        
        <div className="card-content">
          <div className="title noselect">𝐂onsistency</div>
          <div id="prompt" className="noselect">
            𝐊𝐄𝐄𝐏 𝐈𝐓 𝐔𝐏
          </div>
          <div className="subtitle noselect">
            Experience the
            <span className="highlight">𝐃iscipline</span>
          </div>
          
          <div className="glowing-elements">
            <div className="glow-1"></div>
            <div className="glow-2"></div>
            <div className="glow-3"></div>
          </div>
          
          <div className="card-particles">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          <div className="card-glare"></div>
          
          <div className="cyber-lines">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          <div className="corner-elements">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          <div className="scan-line"></div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [showStats, setShowStats] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<string[]>(['/bg.jpg', '/bgg.jpg']);

  // Listen for custom events from navigation
  useEffect(() => {
    const handleShowStats = () => {
      setShowStats(true);
      setShowSettings(false);
    };

    const handleShowSettings = () => {
      setShowSettings(true);
      setShowStats(false);
    };

    // Check URL parameters on mount
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    
    if (view === 'stats') {
      handleShowStats();
    } else if (view === 'settings') {
      handleShowSettings();
    }

    // Listen for custom events
    window.addEventListener('showStats', handleShowStats);
    window.addEventListener('showSettings', handleShowSettings);
    
    return () => {
      window.removeEventListener('showStats', handleShowStats);
      window.removeEventListener('showSettings', handleShowSettings);
    };
  }, []);

  // Load background images on component mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        await initBgiTable();
        const images = await getBackgroundImages();
        setBackgroundImages(images);
      } catch (error) {
        console.error('Error loading background images:', error);
      }
    };
    loadImages();
  }, []);

  // Handle image upload with loading state and better error handling
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      console.log('Starting image upload:', file.name, file.type);
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          console.log('File converted to base64, uploading...');
          
          await addBackgroundImage(base64);
          console.log('Image added to database successfully');
          
          // Reload images for both components
          const updatedImages = await getBackgroundImages();
          setBackgroundImages(updatedImages);
          
          // Force re-render of InteractiveCard by updating its background images
          window.dispatchEvent(new CustomEvent('backgroundImagesUpdated', { 
            detail: { images: updatedImages } 
          }));
          
          console.log('Background images updated:', updatedImages.length);
          
          alert('Image uploaded successfully!');
          
          // Reset file input
          event.target.value = '';
        } catch (error) {
          console.error('Error in upload process:', error);
          alert('Failed to upload image. Please try again.');
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        alert('Error reading file. Please try again.');
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
      setIsUploading(false);
    }
  };

  // Static dashboard data - no database calls needed
  const stats = {
    totalQuestionsSolved: 1247,
    totalCorrectAnswers: 1098,
    studyStreak: 12,
    totalStudyTimeMinutes: 850
  };

  const accuracy = Math.round((stats.totalCorrectAnswers / stats.totalQuestionsSolved) * 100);
  const studyTimeHours = Math.round((stats.totalStudyTimeMinutes / 60) * 10) / 10;

  // Direct Neon database fetch
  const fetchQuizStats = async () => {
    if (!showStats) return;

    setStatsLoading(true);
    try {
      const neonUrl = import.meta.env.VITE_DATABASE_URL;
      if (!neonUrl) {
        console.log('No Neon URL found, checking localStorage');
        // Fallback to localStorage
        const localStats = JSON.parse(localStorage.getItem('quiz_stats') || '[]');
        const formattedLocalStats = localStats.map((stat: any) => ({
          id: stat.id,
          date: stat.date,
          chapterTitle: stat.chapterTitle,
          subjectTitle: stat.subjectTitle || 'NEET',
          score: stat.score,
          correct: stat.correct,
          wrong: stat.wrong,
          totalQuestions: stat.totalQuestions,
          accuracy: stat.accuracy,
          percentage: stat.percentage
        }));
        setQuizHistory(formattedLocalStats);
        setStatsLoading(false);
        return;
      }

      const sql = neon(neonUrl);

      // Create table if not exists with consistent column names
      await sql(`
        CREATE TABLE IF NOT EXISTS quiz_stats (
          id SERIAL PRIMARY KEY,
          date TEXT NOT NULL,
          chapter_title TEXT NOT NULL,
          subject_title TEXT DEFAULT 'NEET',
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          correct_answers INTEGER DEFAULT 0,
          wrong_answers INTEGER DEFAULT 0,
          percentage INTEGER NOT NULL,
          accuracy INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Check if we need to add missing columns to existing table
      try {
        await sql(`
          ALTER TABLE quiz_stats 
          ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS wrong_answers INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS accuracy INTEGER DEFAULT 0
        `);
      } catch (alterError) {
        console.log('Table already has all required columns or alter failed:', alterError);
      }

      // First check if table exists and get its structure
      const tableCheck = await sql(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'quiz_stats'
      `);
      
      console.log('Available columns in quiz_stats table:', tableCheck.map(col => col.column_name));

      let results;
      if (tableCheck.length === 0) {
        console.log('quiz_stats table does not exist');
        results = [];
      } else {
        results = await sql('SELECT * FROM quiz_stats ORDER BY id DESC LIMIT 50');
      }
      
      console.log('Direct fetch quiz stats:', results);

      const formattedStats = results.map(stat => {
        // Ensure date is always a string
        let formattedDate;
        if (typeof stat.date === 'string' && stat.date.includes('T')) {
          // If it's an ISO string, format it
          formattedDate = new Date(stat.date).toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        } else if (stat.created_at) {
          // Use created_at if available
          formattedDate = new Date(stat.created_at).toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        } else if (stat.date) {
          // Use date as is if it's already a string
          formattedDate = typeof stat.date === 'string' ? stat.date : stat.date.toString();
        } else {
          // Fallback to current date
          formattedDate = new Date().toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        }

        // Calculate correct and wrong answers properly
        const score = stat.score || 0;
        const totalQuestions = stat.total_questions || stat.totalQuestions || 0;
        const correct = stat.correct_answers || stat.correct || score;
        const wrong = stat.wrong_answers || stat.wrong || Math.max(0, totalQuestions - correct);
        const accuracy = stat.accuracy || stat.percentage || Math.round((correct / Math.max(1, totalQuestions)) * 100);

        return {
          id: stat.id,
          date: formattedDate,
          chapterTitle: stat.chapter_title || 'Unknown Chapter',
          subjectTitle: stat.subject_title || 'NEET',
          score: score,
          correct: correct,
          wrong: wrong,
          totalQuestions: totalQuestions,
          accuracy: accuracy,
          percentage: accuracy
        };
      });

      setQuizHistory(formattedStats);
      console.log('Formatted quiz history:', formattedStats);
    } catch (error) {
      console.error('Error fetching quiz stats directly:', error);
      // Fallback to localStorage on error
      try {
        const localStats = JSON.parse(localStorage.getItem('quiz_stats') || '[]');
        const formattedLocalStats = localStats.map((stat: any) => ({
          id: stat.id,
          date: stat.date,
          chapterTitle: stat.chapterTitle,
          subjectTitle: stat.subjectTitle || 'NEET',
          score: stat.score,
          correct: stat.correct,
          wrong: stat.wrong,
          totalQuestions: stat.totalQuestions,
          accuracy: stat.accuracy,
          percentage: stat.percentage
        }));
        setQuizHistory(formattedLocalStats);
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
        setQuizHistory([]);
      }
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (showStats) {
      fetchQuizStats();
    }
  }, [showStats]);

  if (showStats) {
    return (
      <section className="mb-8 slide-up">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 gradient-text">Quiz Statistics</h2>
            <p className="text-gray-400 font-medium">Your complete quiz history</p>
          </div>
          <Button 
            onClick={() => setShowStats(false)}
            className="glass-button text-white px-4 py-2 font-medium"
          >
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-4">
          {statsLoading ? (
            <Card className="glass-card smooth-transition">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 glass-card-subtle rounded-full flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-gray-400 animate-pulse" />
                </div>
                <p className="text-gray-300 font-medium mb-2">Loading your quiz history...</p>
                <p className="text-gray-500 text-sm">Please wait while we fetch your stats.</p>
              </CardContent>
            </Card>
          ) : quizHistory.length === 0 ? (
            <Card className="glass-card smooth-transition">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 glass-card-subtle rounded-full flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-300 font-medium mb-2">No quiz history available yet.</p>
                <p className="text-gray-500 text-sm">Start practicing to see your stats here!</p>
              </CardContent>
            </Card>
          ) : quizHistory.map((quiz, index) => (
            <Card key={quiz.id || index} className="bg-black/60 backdrop-filter backdrop-blur-xl border border-gray-800/50 hover:bg-black/70 smooth-transition rounded-xl shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold bg-gradient-to-r from-red-900 to-black bg-clip-text text-transparent">
                        {quiz.date}
                      </span>
                    </div>

                    <h3 className="font-bold text-xl mb-4 bg-gradient-to-r from-red-900 via-red-700 to-black bg-clip-text text-transparent">
                      {quiz.chapterTitle}
                    </h3>

                    <div className="bg-black/70 backdrop-filter backdrop-blur-lg rounded-xl p-4 border border-red-900/30">
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                          <div className="text-3xl font-bold bg-gradient-to-r from-red-800 to-black bg-clip-text text-transparent">{quiz.score}</div>
                          <div className="text-xs text-red-900/80 uppercase tracking-wide font-semibold">Score</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">{quiz.correct || quiz.score}</div>
                          <div className="text-xs text-red-900/80 uppercase tracking-wide font-semibold">Correct</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold bg-gradient-to-r from-red-900 to-black bg-clip-text text-transparent">{quiz.wrong || (quiz.totalQuestions - quiz.score)}</div>
                          <div className="text-xs text-red-900/80 uppercase tracking-wide font-semibold">Wrong</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center text-sm mt-4">
                      <span className="bg-gradient-to-r from-red-900 to-black bg-clip-text text-transparent font-bold">
                        Total Questions: {quiz.totalQuestions}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 slide-up">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 gradient-text"></h2>
          <p className="text-gray-400 font-medium"></p>
        </div>
      </div>

      {/* Interactive 3D Card from z folder */}
      <InteractiveCard />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Background Images</h4>
                <div className={`custum-file-upload ${isUploading ? 'uploading' : ''}`} onClick={() => document.getElementById('bg-file')?.click()}>
                  <div className="icon">
                    {isUploading ? (
                      <div className="ios-spinner"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                        <g strokeWidth="0" id="SVGRepo_bgCarrier"></g>
                        <g strokeLinejoin="round" strokeLinecap="round" id="SVGRepo_tracerCarrier"></g>
                        <g id="SVGRepo_iconCarrier">
                          <path fill="currentColor" d="M10 1C9.73478 1 9.48043 1.10536 9.29289 1.29289L3.29289 7.29289C3.10536 7.48043 3 7.73478 3 8V20C3 21.6569 4.34315 23 6 23H7C7.55228 23 8 22.5523 8 22C8 21.4477 7.55228 21 7 21H6C5.44772 21 5 20.5523 5 20V9H10C10.5523 9 11 8.55228 11 8V3H18C18.5523 3 19 3.44772 19 4V9C19 9.55228 19.4477 10 20 10C20.5523 10 21 9.55228 21 9V4C21 2.34315 19.6569 1 18 1H10ZM9 7H6.41421L9 4.41421V7ZM14 15.5C14 14.1193 15.1193 13 16.5 13C17.8807 13 19 14.1193 19 15.5V16V17H20C21.1046 17 22 17.8954 22 19C22 20.1046 21.1046 21 20 21H13C11.8954 21 11 20.1046 11 19C11 17.8954 11.8954 17 13 17H14V16V15.5ZM16.5 11C14.142 11 12.2076 12.8136 12.0156 15.122C10.2825 15.5606 9 17.1305 9 19C9 21.2091 10.7909 23 13 23H20C22.2091 23 24 21.2091 24 19C24 17.1305 22.7175 15.5606 20.9844 15.122C20.7924 12.8136 18.858 11 16.5 11Z" clipRule="evenodd" fillRule="evenodd"></path>
                        </g>
                      </svg>
                    )}
                  </div>
                  <div className="text">
                    <span>{isUploading ? 'Uploading...' : 'Click to upload image'}</span>
                  </div>
                </div>
                <input
                  type="file"
                  id="bg-file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Current images: {backgroundImages.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}