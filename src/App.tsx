import { useState, useEffect, useRef } from 'react';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { 
  detectExerciseType, 
  generateAssessmentReport, 
  type ExerciseType,
  type AssessmentReport 
} from '@/utils/poseAnalysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Square, 
  Activity, 
  TrendingUp, 
  User, 
  Timer,
  Dumbbell,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

function App() {
  const { 
    videoRef, 
    canvasRef, 
    isLoading, 
    error, 
    poseData, 
    isDetecting, 
    startDetection, 
    stopDetection 
  } = usePoseDetection();

  const [currentExercise, setCurrentExercise] = useState<ExerciseType>('unknown');
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentReport[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  
  const baselineYRef = useRef(0);
  const lastExerciseRef = useRef<ExerciseType>('unknown');
  const repCountRef = useRef(0);

  // 计时器
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, sessionStartTime]);

  // 运动检测和评估
  useEffect(() => {
    if (poseData?.landmarks && isRecording) {
      const exerciseType = detectExerciseType(poseData.landmarks);
      
      // 检测动作变化，计数
      if (exerciseType !== 'unknown' && exerciseType !== lastExerciseRef.current) {
        if (lastExerciseRef.current !== 'unknown') {
          repCountRef.current += 1;
          setTotalReps(repCountRef.current);
        }
        lastExerciseRef.current = exerciseType;
      }

      setCurrentExercise(exerciseType);

      // 生成评估报告
      if (exerciseType !== 'unknown') {
        const report = generateAssessmentReport(
          exerciseType, 
          poseData.landmarks,
          baselineYRef.current
        );
        setCurrentScore(report.score);
        
        // 每5秒记录一次
        if (report.score > 0 && Date.now() % 5000 < 100) {
          setAssessmentHistory(prev => [...prev.slice(-9), report]);
        }
      }
    }
  }, [poseData, isRecording]);

  const handleStart = async () => {
    await startDetection();
    if (poseData?.landmarks) {
      baselineYRef.current = (poseData.landmarks[23].y + poseData.landmarks[24].y) / 2;
    }
    setIsRecording(true);
    setSessionStartTime(Date.now());
    toast.success('评估已开始，请站在摄像头前');
  };

  const handleStop = () => {
    stopDetection();
    setIsRecording(false);
    setSessionStartTime(null);
    toast.info('评估已结束');
  };

  const handleReset = () => {
    setAssessmentHistory([]);
    setCurrentScore(0);
    setSessionDuration(0);
    setTotalReps(0);
    repCountRef.current = 0;
    lastExerciseRef.current = 'unknown';
    toast.success('数据已重置');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getExerciseName = (type: ExerciseType) => {
    switch (type) {
      case 'squat': return '深蹲';
      case 'pushup': return '俯卧撑';
      case 'jump': return '跳跃';
      case 'highknee': return '高抬腿';
      case 'jumpingjack': return '开合跳';
      case 'situp': return '仰卧起坐';
      case 'plank': return '平板支撑';
      case 'lunge': return '弓步蹲';
      case 'burpee': return '波比跳';
      default: return '未识别';
    }
  };

  const getExerciseColor = (type: ExerciseType) => {
    switch (type) {
      case 'squat': return 'bg-blue-500';
      case 'pushup': return 'bg-green-500';
      case 'jump': return 'bg-orange-500';
      case 'highknee': return 'bg-purple-500';
      case 'jumpingjack': return 'bg-pink-500';
      case 'situp': return 'bg-yellow-500';
      case 'plank': return 'bg-cyan-500';
      case 'lunge': return 'bg-red-500';
      case 'burpee': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      {/* Header */}
      <header className="mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            体育课堂智能评估系统
          </h1>
          <p className="text-slate-400 mt-1">
            基于姿态估计与运动识别的中小学体育课堂智能评估模型
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-blue-400" />
                实时姿态检测
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute inset-0 w-full h-full"
                />
                
                {/* Overlay Info */}
                {isDetecting && (
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <Badge className={`${getExerciseColor(currentExercise)} text-white`}>
                      {getExerciseName(currentExercise)}
                    </Badge>
                    {currentScore > 0 && (
                      <Badge className="bg-purple-500 text-white">
                        评分: {currentScore}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Loading State */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                      <p className="text-slate-300">正在启动摄像头...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="text-center text-red-400">
                      <p>{error}</p>
                      <p className="text-sm mt-2 text-slate-400">请检查摄像头权限设置</p>
                    </div>
                  </div>
                )}

                {/* Standby State */}
                {!isDetecting && !isLoading && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-slate-400">
                      <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>点击开始按钮启动评估</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mt-4">
                {!isDetecting ? (
                  <Button 
                    onClick={handleStart}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    开始评估
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStop}
                    variant="destructive"
                    className="px-8"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    停止评估
                  </Button>
                )}
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置数据
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Exercise Instructions */}
          <Card className="mt-4 bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Dumbbell className="w-5 h-5 text-green-400" />
                支持的运动类型（9种）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Activity className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">深蹲</h3>
                  <p className="text-sm text-slate-400 mt-1">检测膝盖角度和深度</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white">俯卧撑</h3>
                  <p className="text-sm text-slate-400 mt-1">检测肘部角度和身体姿态</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-white">跳跃</h3>
                  <p className="text-sm text-slate-400 mt-1">检测跳跃高度和膝盖弯曲</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white">高抬腿</h3>
                  <p className="text-sm text-slate-400 mt-1">检测抬腿高度和髋关节活动</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-pink-400" />
                  </div>
                  <h3 className="font-semibold text-white">开合跳</h3>
                  <p className="text-sm text-slate-400 mt-1">检测手臂和腿部开合幅度</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h3 className="font-semibold text-white">仰卧起坐</h3>
                  <p className="text-sm text-slate-400 mt-1">检测躯干角度和起身幅度</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Activity className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-white">平板支撑</h3>
                  <p className="text-sm text-slate-400 mt-1">检测身体挺直度和稳定性</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-white">弓步蹲</h3>
                  <p className="text-sm text-slate-400 mt-1">检测前后腿膝盖角度</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-white">波比跳</h3>
                  <p className="text-sm text-slate-400 mt-1">检测多阶段动作连贯性</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Panel */}
        <div className="space-y-4">
          {/* Session Stats */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Timer className="w-5 h-5 text-purple-400" />
                训练统计
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {formatTime(sessionDuration)}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">训练时长</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {totalReps}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">动作次数</div>
                </div>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300">当前评分</span>
                  <span className="text-2xl font-bold text-purple-400">
                    {currentScore}
                  </span>
                </div>
                <Progress 
                  value={currentScore} 
                  className="h-2 bg-slate-600"
                />
              </div>

              {currentExercise !== 'unknown' && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-2">当前动作</div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getExerciseColor(currentExercise)} text-white text-lg px-3 py-1`}>
                      {getExerciseName(currentExercise)}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessment History */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-green-400" />
                评估记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assessmentHistory.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">暂无评估记录</p>
                ) : (
                  assessmentHistory.map((report, index) => (
                    <div 
                      key={index}
                      className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={`${getExerciseColor(report.exerciseType)} text-white`}>
                          {getExerciseName(report.exerciseType)}
                        </Badge>
                        <span className="text-sm text-slate-400">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-purple-400">
                        {report.score}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Feedback */}
          {assessmentHistory.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="w-5 h-5 text-yellow-400" />
                  实时建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assessmentHistory[assessmentHistory.length - 1]?.suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="bg-slate-700/50 rounded-lg p-3 flex items-start gap-2"
                    >
                      <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-yellow-400">{index + 1}</span>
                      </div>
                      <span className="text-sm text-slate-300">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-slate-500 text-sm">
        <p>基于姿态估计与运动识别的中小学体育课堂智能评估模型构建</p>
        <p className="mt-1">合肥谷远科技有限公司 © 2025</p>
      </footer>
    </div>
  );
}

export default App;
