import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  date: string;
  color: string;
  completed: boolean;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem('calendar_tasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add previous month's days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Add current month's days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Fill remaining slots
    const remainingSlots = 42 - days.length;
    for (let day = 1; day <= remainingSlots; day++) {
      const date = new Date(year, month + 1, day);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const hasTask = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.some(task => task.date === dateStr);
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.date === dateStr);
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selected => 
      selected.toDateString() === date.toDateString()
    );
  };

  const handleDateClick = (date: Date) => {
    const isSelected = isDateSelected(date);
    if (isSelected) {
      setSelectedDates(prev => prev.filter(selected => 
        selected.toDateString() !== date.toDateString()
      ));
    } else {
      setSelectedDates(prev => [...prev, date]);
    }
  };

  const handleAddTask = () => {
    if (!taskTitle.trim() || selectedDates.length === 0) return;

    const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-red-500", "bg-yellow-500", "bg-pink-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newTasks: Task[] = selectedDates.map((date, index) => ({
      id: Date.now() + index,
      title: taskTitle,
      date: date.toISOString().split('T')[0],
      color: randomColor,
      completed: false
    }));

    const updatedTasks = [...tasks, ...newTasks];
    setTasks(updatedTasks);
    localStorage.setItem('calendar_tasks', JSON.stringify(updatedTasks));
    setTaskTitle("");
    setSelectedDates([]);
    setShowTaskModal(false);
  };

  const handleTaskToggle = (taskId: number) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    localStorage.setItem('calendar_tasks', JSON.stringify(updatedTasks));
  };

  const handleTaskDelete = (taskId: number) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem('calendar_tasks', JSON.stringify(updatedTasks));
  };

  const getAllTasks = () => {
    return tasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-black text-white slide-up">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 gradient-text">Study Calendar</h1>
            <p className="text-gray-400 font-medium text-sm">Plan and track your study schedule</p>
          </div>
          <Button 
            onClick={() => setShowTaskModal(true)}
            className="ios-button-primary px-4 py-2 font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Calendar Card */}
        <Card className="glass-card smooth-transition mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="w-9 h-9 p-0 glass-card-subtle hover:bg-white/10 rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-bold text-white">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="w-9 h-9 p-0 glass-card-subtle hover:bg-white/10 rounded-xl"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-bold text-gray-300 py-3">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((dayData, index) => {
                const { date, isCurrentMonth } = dayData;
                const dayTasks = getTasksForDate(date);
                const isSelected = isDateSelected(date);
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={cn(
                      "aspect-square p-2 rounded-xl cursor-pointer transition-all duration-200 relative text-sm font-semibold",
                      "hover:bg-gray-700 hover:scale-105",
                      !isCurrentMonth && "text-gray-600",
                      isCurrentMonth && "text-white",
                      isToday(date) && "bg-blue-600 border-2 border-blue-400",
                      isSelected && "bg-green-600 border-2 border-green-400",
                    )}
                  >
                    <div className="relative">
                      {date.getDate()}
                      {hasTask(date) && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
                          {dayTasks.slice(0, 3).map((task, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-1.5 h-1.5 rounded-full", 
                                task.color,
                                task.completed && "opacity-50"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedDates.length > 0 && (
              <div className="mt-6 p-4 bg-[#18181b] rounded-lg border border-gray-700">
                <p className="text-sm text-gray-300 mb-2">Selected dates:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map((date, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-full"
                    >
                      {date.toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#27272a] border-gray-800 w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-white flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2 text-blue-400" />
                  Add Task
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedDates([]);
                  }}
                  className="w-8 h-8 p-0 hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="task-title" className="text-sm font-medium text-gray-300">
                    Task Title
                  </Label>
                  <Input
                    id="task-title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="mt-1 bg-[#18181b] border-gray-700 text-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-300">
                    Selected Dates ({selectedDates.length})
                  </Label>
                  <div className="mt-1 p-3 bg-[#18181b] rounded-md border border-gray-700 min-h-[60px]">
                    {selectedDates.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedDates.map((date, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-600 text-white text-sm rounded-md"
                          >
                            {date.toLocaleDateString()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">Click on calendar dates to select them</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={handleAddTask}
                    disabled={!taskTitle.trim() || selectedDates.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold"
                  >
                    Add Task
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTaskModal(false);
                      setSelectedDates([]);
                    }}
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Tasks */}
        <Card className="bg-[#27272a] border-gray-800 shadow-2xl mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">All Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getAllTasks().length > 0 ? (
                getAllTasks().map((task) => (
                  <div key={task.id} className="flex items-center space-x-4 p-4 rounded-lg bg-[#18181b] border border-gray-700">
                    <label
                      className="relative flex cursor-pointer items-center justify-center gap-4"
                      htmlFor={`task-${task.id}`}
                    >
                      <input
                        className="peer appearance-none"
                        id={`task-${task.id}`}
                        name={`task-${task.id}`}
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleTaskToggle(task.id)}
                      />
                      <span className="absolute left-0 top-1/2 h-8 w-8 -translate-x-full -translate-y-1/2 rounded border border-gray-400 bg-[#27272a]"></span>
                      <img
                        src="/calendar-check-icon.png"
                        alt="Check Icon"
                        className={cn(
                          "absolute left-0 top-1/2 h-14 w-14 -translate-x-11 -translate-y-1/2 duration-500 ease-out opacity-0 scale-0",
                          "peer-checked:opacity-100 peer-checked:scale-100 transition-all"
                        )}
                      />
                      <div className="flex-1">
                        <p className={cn(
                          "font-bold text-white text-lg",
                          task.completed && "line-through opacity-50"
                        )}>
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-400 font-bold">
                          {new Date(task.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </label>
                    <div className={cn("w-1 h-16 rounded-full ml-auto", task.color)}></div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-red-600 hover:bg-red-500 text-white border-red-600"
                      onClick={() => handleTaskDelete(task.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tasks added yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
