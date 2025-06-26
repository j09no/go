import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, CheckCircle, AlertCircle, BarChart3, Target, Clock, Zap } from "lucide-react";
import { getUserStats } from "../lib/api-functions";

export default function Analytics() {
  const [stats, setStats] = useState({
    totalQuestionsSolved: 1247,
    totalCorrectAnswers: 1098
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const userStats = await getUserStats();
        setStats({
          totalQuestionsSolved: userStats.totalQuestionsSolved,
          totalCorrectAnswers: userStats.totalCorrectAnswers
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const accuracy = Math.round((stats.totalCorrectAnswers / stats.totalQuestionsSolved) * 100);

  return (
    <section className="mb-8 slide-up">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 gradient-text">Analytics</h2>
        <p className="text-gray-400 font-medium">Track your performance and improvement</p>
      </div>

      {/* Performance Overview */}
      <div className="space-y-6 mb-6">
        {/* Weekly Performance Chart */}
        <Card className="glass-card smooth-transition">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 glass-card-subtle rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <CardTitle className="text-lg font-semibold text-white">Weekly Performance</CardTitle>
              </div>
              <Select defaultValue="7days">
                <SelectTrigger className="w-32 glass-card-subtle border-0 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-0">
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 glass-card-subtle rounded-2xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
              <div className="text-center relative z-10">
                <div className="w-16 h-16 glass-card-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-gray-300 font-medium mb-2">Performance Chart</p>
                <p className="text-sm text-gray-400">Advanced analytics coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="glass-morphism">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg glass-morphism">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Physics - Mechanics</p>
                    <p className="text-sm text-gray-400">Completed 3 hours ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-400">18/20</div>
                  <div className="text-sm text-gray-400">90% Score</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg glass-morphism">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Biology - Genetics</p>
                    <p className="text-sm text-gray-400">Completed 6 hours ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-400">16/20</div>
                  <div className="text-sm text-gray-400">80% Score</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg glass-morphism">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Chemistry - Organic</p>
                    <p className="text-sm text-gray-400">Completed 1 day ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-yellow-400">14/20</div>
                  <div className="text-sm text-gray-400">70% Score</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-morphism">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{accuracy}%</div>
              <p className="text-sm text-gray-400">Overall Accuracy</p>
            </CardContent>
          </Card>
          <Card className="glass-morphism">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.totalQuestionsSolved.toLocaleString()}</div>
              <p className="text-sm text-gray-400">Questions Solved</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}