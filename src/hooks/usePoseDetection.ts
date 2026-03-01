import { useEffect, useRef, useState, useCallback } from 'react';
import { Pose, type Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseData {
  landmarks: PoseLandmark[];
  worldLandmarks: PoseLandmark[];
}

export function usePoseDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poseData, setPoseData] = useState<PoseData | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const onResults = useCallback((results: Results) => {
    if (results.poseLandmarks) {
      setPoseData({
        landmarks: results.poseLandmarks,
        worldLandmarks: results.poseWorldLandmarks || []
      });
    }
  }, []);

  const drawPose = useCallback((ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[]) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // 绘制骨骼连接线
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // 手臂
      [11, 23], [12, 24], [23, 24], // 躯干
      [23, 25], [25, 27], [27, 29], [29, 31], // 左腿
      [24, 26], [26, 28], [28, 30], [30, 32], // 右腿
      [0, 11], [0, 12], // 头部到肩膀
    ];

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      if (startPoint && endPoint && (startPoint.visibility ?? 0) > 0.5 && (endPoint.visibility ?? 0) > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * width, startPoint.y * height);
        ctx.lineTo(endPoint.x * width, endPoint.y * height);
        ctx.stroke();
      }
    });

    // 绘制关键点
    landmarks.forEach((landmark, index) => {
      if ((landmark.visibility ?? 0) > 0.5) {
        const x = landmark.x * width;
        const y = landmark.y * height;

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制关键点编号
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(index.toString(), x + 8, y - 8);
      }
    });
  }, []);

  const startDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsLoading(true);

      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onResults);
      poseRef.current = pose;

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      await camera.start();
      cameraRef.current = camera;
      setIsDetecting(true);
      setIsLoading(false);
    } catch (err) {
      setError('启动摄像头失败，请检查权限设置');
      setIsLoading(false);
    }
  }, [onResults]);

  const stopDetection = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    setIsDetecting(false);
    setPoseData(null);
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  // 自动绘制
  useEffect(() => {
    if (canvasRef.current && poseData?.landmarks) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        drawPose(ctx, poseData.landmarks);
      }
    }
  }, [poseData, drawPose]);

  return {
    videoRef,
    canvasRef,
    isLoading,
    error,
    poseData,
    isDetecting,
    startDetection,
    stopDetection
  };
}
