import type { PoseLandmark } from '@/hooks/usePoseDetection';

// 计算两点之间的角度
export function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

// 计算两点之间的距离
export function calculateDistance(a: PoseLandmark, b: PoseLandmark): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

// ========== 深蹲评估 ==========
export interface SquatAssessment {
  isSquatting: boolean;
  kneeAngle: number;
  hipAngle: number;
  depth: 'shallow' | 'parallel' | 'deep';
  score: number;
  feedback: string[];
}

export function assessSquat(landmarks: PoseLandmark[]): SquatAssessment {
  const leftHip = landmarks[23];
  const leftKnee = landmarks[25];
  const leftAnkle = landmarks[27];
  const rightHip = landmarks[24];
  const rightKnee = landmarks[26];
  const rightAnkle = landmarks[28];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
  const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);

  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
  const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

  const isSquatting = avgKneeAngle < 120;

  let depth: 'shallow' | 'parallel' | 'deep' = 'shallow';
  if (avgKneeAngle < 70) depth = 'deep';
  else if (avgKneeAngle < 100) depth = 'parallel';

  let score = 0;
  const feedback: string[] = [];

  if (isSquatting) {
    if (depth === 'deep') {
      score = 90;
      feedback.push('深蹲动作标准');
    } else if (depth === 'parallel') {
      score = 75;
      feedback.push('可以尝试蹲得更深');
    } else {
      score = 50;
      feedback.push('深蹲深度不足');
    }

    if (avgHipAngle < 80) {
      feedback.push('注意保持背部挺直');
      score -= 10;
    }

    if (Math.abs(leftKneeAngle - rightKneeAngle) > 15) {
      feedback.push('双膝角度不一致，注意平衡');
      score -= 10;
    }
  } else {
    feedback.push('未检测到深蹲动作');
  }

  return {
    isSquatting,
    kneeAngle: avgKneeAngle,
    hipAngle: avgHipAngle,
    depth,
    score: Math.max(0, score),
    feedback
  };
}

// ========== 俯卧撑评估 ==========
export interface PushUpAssessment {
  isDoingPushUp: boolean;
  elbowAngle: number;
  bodyAngle: number;
  depth: 'shallow' | 'standard' | 'deep';
  score: number;
  feedback: string[];
}

export function assessPushUp(landmarks: PoseLandmark[]): PushUpAssessment {
  const leftShoulder = landmarks[11];
  const leftElbow = landmarks[13];
  const leftWrist = landmarks[15];
  const rightShoulder = landmarks[12];
  const rightElbow = landmarks[14];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

  const bodyAngle = calculateAngle(
    { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2, z: 0, visibility: 1 },
    { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2, z: 0, visibility: 1 },
    { x: (leftAnkle.x + rightAnkle.x) / 2, y: (leftAnkle.y + rightAnkle.y) / 2, z: 0, visibility: 1 }
  );

  const isDoingPushUp = avgElbowAngle < 160 && bodyAngle > 150;

  let depth: 'shallow' | 'standard' | 'deep' = 'shallow';
  if (avgElbowAngle < 60) depth = 'deep';
  else if (avgElbowAngle < 90) depth = 'standard';

  let score = 0;
  const feedback: string[] = [];

  if (isDoingPushUp) {
    if (depth === 'deep') {
      score = 95;
      feedback.push('俯卧撑动作标准');
    } else if (depth === 'standard') {
      score = 80;
      feedback.push('动作良好');
    } else {
      score = 60;
      feedback.push('可以尝试下降更深');
    }

    if (bodyAngle < 160) {
      feedback.push('注意保持身体挺直');
      score -= 15;
    }

    if (Math.abs(leftElbowAngle - rightElbowAngle) > 15) {
      feedback.push('双臂用力不均');
      score -= 10;
    }
  } else {
    feedback.push('未检测到俯卧撑动作');
  }

  return {
    isDoingPushUp,
    elbowAngle: avgElbowAngle,
    bodyAngle,
    depth,
    score: Math.max(0, score),
    feedback
  };
}

// ========== 跳跃评估 ==========
export interface JumpAssessment {
  isJumping: boolean;
  jumpHeight: number;
  kneeAngle: number;
  score: number;
  feedback: string[];
}

export function assessJump(landmarks: PoseLandmark[], baselineY: number): JumpAssessment {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const jumpHeight = Math.max(0, baselineY - avgHipY);

  const leftKneeAngle = calculateAngle(landmarks[11], leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(landmarks[12], rightKnee, rightAnkle);
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  const isJumping = jumpHeight > 0.05;

  let score = 0;
  const feedback: string[] = [];

  if (isJumping) {
    if (jumpHeight > 0.15) {
      score = 90;
      feedback.push('跳跃高度优秀');
    } else if (jumpHeight > 0.08) {
      score = 70;
      feedback.push('跳跃高度良好');
    } else {
      score = 50;
      feedback.push('可以尝试跳得更高');
    }

    if (avgKneeAngle < 100) {
      feedback.push('起跳时膝盖弯曲充分');
    } else {
      feedback.push('起跳时可以更多弯曲膝盖');
      score -= 10;
    }
  } else {
    feedback.push('未检测到跳跃动作');
  }

  return {
    isJumping,
    jumpHeight,
    kneeAngle: avgKneeAngle,
    score: Math.max(0, score),
    feedback
  };
}

// ========== 高抬腿评估 ==========
export interface HighKneeAssessment {
  isDoingHighKnee: boolean;
  kneeHeight: number;
  hipAngle: number;
  score: number;
  feedback: string[];
}

export function assessHighKnee(landmarks: PoseLandmark[]): HighKneeAssessment {
  const leftHip = landmarks[23];
  const leftKnee = landmarks[25];
  const rightHip = landmarks[24];
  const rightKnee = landmarks[26];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const leftKneeHeight = leftHip.y - leftKnee.y;
  const rightKneeHeight = rightHip.y - rightKnee.y;
  const maxKneeHeight = Math.max(leftKneeHeight, rightKneeHeight);

  const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
  const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
  const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

  const isDoingHighKnee = maxKneeHeight > 0.1 && avgHipAngle > 60;

  let score = 0;
  const feedback: string[] = [];

  if (isDoingHighKnee) {
    if (maxKneeHeight > 0.2) {
      score = 90;
      feedback.push('抬腿高度优秀');
    } else if (maxKneeHeight > 0.15) {
      score = 75;
      feedback.push('抬腿高度良好');
    } else {
      score = 55;
      feedback.push('可以尝试抬得更高');
    }

    if (avgHipAngle > 80) {
      feedback.push('髋关节活动充分');
    } else {
      feedback.push('注意加大髋关节活动幅度');
      score -= 10;
    }
  } else {
    feedback.push('未检测到高抬腿动作');
  }

  return {
    isDoingHighKnee,
    kneeHeight: maxKneeHeight,
    hipAngle: avgHipAngle,
    score: Math.max(0, score),
    feedback
  };
}

// ========== 开合跳评估 ==========
export interface JumpingJackAssessment {
  isDoingJumpingJack: boolean;
  armSpread: number;
  legSpread: number;
  score: number;
  feedback: string[];
}

export function assessJumpingJack(landmarks: PoseLandmark[]): JumpingJackAssessment {
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const armSpread = Math.abs(leftWrist.x - rightWrist.x);
  const legSpread = Math.abs(leftAnkle.x - rightAnkle.x);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const hipWidth = Math.abs(leftHip.x - rightHip.x);

  const isArmsSpread = armSpread > shoulderWidth * 2;
  const isLegsSpread = legSpread > hipWidth * 1.5;
  const isDoingJumpingJack = isArmsSpread && isLegsSpread;

  let score = 0;
  const feedback: string[] = [];

  if (isDoingJumpingJack) {
    score = 80;
    feedback.push('开合跳动作正确');

    if (armSpread > shoulderWidth * 2.5) {
      feedback.push('手臂伸展充分');
      score += 10;
    } else {
      feedback.push('手臂可以再伸展一些');
    }

    if (legSpread > hipWidth * 2) {
      feedback.push('腿部开合到位');
      score += 10;
    } else {
      feedback.push('腿部开合可以更大');
    }
  } else {
    feedback.push('未检测到开合跳动作');
  }

  return {
    isDoingJumpingJack,
    armSpread,
    legSpread,
    score: Math.max(0, Math.min(100, score)),
    feedback
  };
}

// ========== 仰卧起坐评估 ==========
export interface SitUpAssessment {
  isDoingSitUp: boolean;
  torsoAngle: number;
  score: number;
  feedback: string[];
}

export function assessSitUp(landmarks: PoseLandmark[]): SitUpAssessment {
  const leftShoulder = landmarks[11];
  const leftHip = landmarks[23];
  const leftKnee = landmarks[25];
  const rightShoulder = landmarks[12];
  const rightHip = landmarks[24];
  const rightKnee = landmarks[26];

  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const avgKneeY = (leftKnee.y + rightKnee.y) / 2;

  const leftTorsoAngle = calculateAngle(leftKnee, leftHip, leftShoulder);
  const rightTorsoAngle = calculateAngle(rightKnee, rightHip, rightShoulder);
  const avgTorsoAngle = (leftTorsoAngle + rightTorsoAngle) / 2;

  const isLyingDown = avgShoulderY > avgHipY && avgHipY > avgKneeY;
  const isSittingUp = avgTorsoAngle > 60;
  const isDoingSitUp = isLyingDown || isSittingUp;

  let score = 0;
  const feedback: string[] = [];

  if (isDoingSitUp) {
    if (avgTorsoAngle > 80) {
      score = 95;
      feedback.push('仰卧起坐动作标准');
    } else if (avgTorsoAngle > 60) {
      score = 75;
      feedback.push('动作良好，可以尝试起身更多');
    } else {
      score = 55;
      feedback.push('起身幅度不足');
    }

    if (Math.abs(leftTorsoAngle - rightTorsoAngle) > 10) {
      feedback.push('注意保持身体平衡');
      score -= 10;
    }
  } else {
    feedback.push('未检测到仰卧起坐动作');
  }

  return {
    isDoingSitUp,
    torsoAngle: avgTorsoAngle,
    score: Math.max(0, score),
    feedback
  };
}

// ========== 平板支撑评估 ==========
export interface PlankAssessment {
  isDoingPlank: boolean;
  bodyStraightness: number;
  score: number;
  feedback: string[];
}

export function assessPlank(landmarks: PoseLandmark[]): PlankAssessment {
  const leftShoulder = landmarks[11];
  const leftHip = landmarks[23];
  const leftAnkle = landmarks[27];
  const rightShoulder = landmarks[12];
  const rightHip = landmarks[24];
  const rightAnkle = landmarks[28];

  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

  const bodyAngle = calculateAngle(
    { x: (leftShoulder.x + rightShoulder.x) / 2, y: avgShoulderY, z: 0, visibility: 1 },
    { x: (leftHip.x + rightHip.x) / 2, y: avgHipY, z: 0, visibility: 1 },
    { x: (leftAnkle.x + rightAnkle.x) / 2, y: avgAnkleY, z: 0, visibility: 1 }
  );

  const isHorizontal = Math.abs(avgShoulderY - avgAnkleY) < 0.2;
  const isDoingPlank = isHorizontal && bodyAngle > 160;

  let score = 0;
  const feedback: string[] = [];

  if (isDoingPlank) {
    if (bodyAngle > 170) {
      score = 95;
      feedback.push('平板支撑姿势完美，身体保持一条直线');
    } else if (bodyAngle > 160) {
      score = 80;
      feedback.push('姿势良好');
    } else {
      score = 60;
      feedback.push('注意保持身体挺直');
    }

    if (Math.abs(leftHip.y - rightHip.y) > 0.05) {
      feedback.push('注意保持髋部水平');
      score -= 10;
    }
  } else {
    feedback.push('未检测到平板支撑动作');
  }

  return {
    isDoingPlank,
    bodyStraightness: bodyAngle,
    score: Math.max(0, score),
    feedback
  };
}

// ========== 弓步蹲评估 ==========
export interface LungeAssessment {
  isDoingLunge: boolean;
  frontKneeAngle: number;
  backKneeAngle: number;
  score: number;
  feedback: string[];
}

export function assessLunge(landmarks: PoseLandmark[]): LungeAssessment {
  const leftHip = landmarks[23];
  const leftKnee = landmarks[25];
  const leftAnkle = landmarks[27];
  const rightHip = landmarks[24];
  const rightKnee = landmarks[26];
  const rightAnkle = landmarks[28];

  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

  const isLeftFront = leftAnkle.x < rightAnkle.x;
  const frontKneeAngle = isLeftFront ? leftKneeAngle : rightKneeAngle;
  const backKneeAngle = isLeftFront ? rightKneeAngle : leftKneeAngle;

  const isDoingLunge = frontKneeAngle < 110 && backKneeAngle < 110 && Math.abs(leftKneeAngle - rightKneeAngle) > 20;

  let score = 0;
  const feedback: string[] = [];

  if (isDoingLunge) {
    if (frontKneeAngle < 90) {
      score = 85;
      feedback.push('前腿下蹲到位');
    } else {
      score = 65;
      feedback.push('前腿可以再下蹲一些');
    }

    if (backKneeAngle < 90) {
      feedback.push('后腿膝盖接近地面，动作标准');
      score += 10;
    } else {
      feedback.push('后腿可以再下沉');
    }

    if (Math.abs(frontKneeAngle - backKneeAngle) > 30) {
      feedback.push('注意保持双腿协调');
      score -= 5;
    }
  } else {
    feedback.push('未检测到弓步蹲动作');
  }

  return {
    isDoingLunge,
    frontKneeAngle,
    backKneeAngle,
    score: Math.max(0, Math.min(100, score)),
    feedback
  };
}

// ========== 波比跳评估 ==========
export interface BurpeeAssessment {
  isDoingBurpee: boolean;
  phase: 'stand' | 'squat' | 'plank' | 'pushup';
  score: number;
  feedback: string[];
}

export function assessBurpee(landmarks: PoseLandmark[]): BurpeeAssessment {
  const leftShoulder = landmarks[11];
  const leftHip = landmarks[23];
  const leftKnee = landmarks[25];
  const leftAnkle = landmarks[27];
  const rightShoulder = landmarks[12];
  const rightHip = landmarks[24];
  const rightKnee = landmarks[26];
  const rightAnkle = landmarks[28];

  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

  const kneeAngle = calculateAngle(
    { x: (leftHip.x + rightHip.x) / 2, y: avgHipY, z: 0, visibility: 1 },
    { x: (leftKnee.x + rightKnee.x) / 2, y: avgKneeY, z: 0, visibility: 1 },
    { x: (leftAnkle.x + rightAnkle.x) / 2, y: avgAnkleY, z: 0, visibility: 1 }
  );

  let phase: 'stand' | 'squat' | 'plank' | 'pushup' = 'stand';
  let isDoingBurpee = false;

  if (avgShoulderY < avgHipY && avgHipY < avgKneeY) {
    phase = 'stand';
    isDoingBurpee = true;
  } else if (kneeAngle < 100 && avgShoulderY > avgHipY) {
    phase = 'squat';
    isDoingBurpee = true;
  } else if (Math.abs(avgShoulderY - avgAnkleY) < 0.3 && avgHipY > avgShoulderY) {
    phase = 'plank';
    isDoingBurpee = true;
  }

  let score = 0;
  const feedback: string[] = [];

  if (isDoingBurpee) {
    score = 75;
    feedback.push(`当前阶段: ${phase === 'stand' ? '站立' : phase === 'squat' ? '下蹲' : phase === 'plank' ? '平板' : '俯卧撑'}`);

    if (phase === 'squat' && kneeAngle < 90) {
      feedback.push('下蹲到位');
      score += 10;
    }

    if (phase === 'plank') {
      feedback.push('保持平板姿势稳定');
      score += 15;
    }
  } else {
    feedback.push('未检测到波比跳动作');
  }

  return {
    isDoingBurpee,
    phase,
    score: Math.max(0, Math.min(100, score)),
    feedback
  };
}

// ========== 综合运动类型识别 ==========
export type ExerciseType = 
  | 'squat' 
  | 'pushup' 
  | 'jump' 
  | 'highknee'
  | 'jumpingjack'
  | 'situp'
  | 'plank'
  | 'lunge'
  | 'burpee'
  | 'unknown';

export function detectExerciseType(landmarks: PoseLandmark[]): ExerciseType {
  const leftHip = landmarks[23];
  const leftKnee = landmarks[25];
  const leftAnkle = landmarks[27];
  const rightHip = landmarks[24];
  const rightKnee = landmarks[26];
  const rightAnkle = landmarks[28];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];

  const avgKneeAngle = (calculateAngle(leftHip, leftKnee, leftAnkle) + 
                       calculateAngle(rightHip, rightKnee, rightAnkle)) / 2;
  
  const avgElbowAngle = (calculateAngle(leftShoulder, landmarks[13], leftWrist) +
                        calculateAngle(rightShoulder, landmarks[14], rightWrist)) / 2;

  const hipY = (leftHip.y + rightHip.y) / 2;
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const isUpright = Math.abs(hipY - shoulderY) < 0.3;

  const armSpread = Math.abs(leftWrist.x - rightWrist.x);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const isArmsSpread = armSpread > shoulderWidth * 2;

  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  const isHorizontal = Math.abs(shoulderY - avgAnkleY) < 0.2;

  // 优先级顺序检测
  if (isHorizontal && avgElbowAngle < 140) {
    return 'pushup';
  }

  if (isHorizontal && avgElbowAngle > 150) {
    return 'plank';
  }

  if (isUpright && isArmsSpread && avgKneeAngle > 140) {
    return 'jumpingjack';
  }

  if (avgKneeAngle < 120 && isUpright) {
    return 'squat';
  }

  if (avgKneeAngle > 140 && !isUpright && shoulderY > hipY) {
    return 'situp';
  }

  if (isUpright && avgKneeAngle > 140) {
    const leftKneeHeight = leftHip.y - leftKnee.y;
    const rightKneeHeight = rightHip.y - rightKnee.y;
    if (Math.max(leftKneeHeight, rightKneeHeight) > 0.1) {
      return 'highknee';
    }
  }

  if (isUpright && avgKneeAngle > 130) {
    return 'jump';
  }

  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  if (Math.abs(leftKneeAngle - rightKneeAngle) > 20 && avgKneeAngle < 110) {
    return 'lunge';
  }

  if (avgKneeAngle < 100 && shoulderY > hipY && !isHorizontal) {
    return 'burpee';
  }

  return 'unknown';
}

// ========== 生成评估报告 ==========
export interface AssessmentReport {
  exerciseType: ExerciseType;
  timestamp: number;
  score: number;
  details: any;
  suggestions: string[];
}

export function generateAssessmentReport(
  exerciseType: ExerciseType,
  landmarks: PoseLandmark[],
  baselineY?: number
): AssessmentReport {
  let details: any = null;
  let score = 0;
  let suggestions: string[] = [];

  switch (exerciseType) {
    case 'squat':
      details = assessSquat(landmarks);
      score = details.score;
      suggestions = details.feedback;
      break;
    case 'pushup':
      details = assessPushUp(landmarks);
      score = details.score;
      suggestions = details.feedback;
      break;
    case 'jump':
      details = assessJump(landmarks, baselineY || landmarks[23].y);
      score = details.score;
      suggestions = details.feedback;
      break;
    case 'highknee':
      details = assessHighKnee(landmarks);
      score = details.score;
      suggestions = details.feedback;
      break;
    case 'jumpingjack':
      details = assessJumpingJack(landmarks);
      score = details.score;
      suggestions = details.feedback;
      break;
    case 'situp':
      details = assessSitUp(landmarks);
      score = details.score;
      suggestions = details.feedback;
      break;
    case 'plank':
      details = assessPlank(landmarks);
      score = details.score;
      suggestions = details.feedback;
      break;
    case 'lunge':
      details = assessLunge(landmarks);
      score = details.score;
      suggestions = details.feedback;
      break;
    case 'burpee':
      details = assessBurpee(landmarks);
      score = details.score;
      suggestions = details.feedback;
      break;
    default:
      suggestions = ['请开始运动', '尝试深蹲、俯卧撑、跳跃、高抬腿、开合跳、仰卧起坐、平板支撑、弓步蹲或波比跳'];
  }

  return {
    exerciseType,
    timestamp: Date.now(),
    score,
    details,
    suggestions
  };
}
