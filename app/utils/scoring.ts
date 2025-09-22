export interface ScoreBreakdown {
  basePoints: number;
  accuracyBonus: number;
  moveBonus: number;
  streakMultiplier: number;
  perfectStreakBonus: number;
  totalPoints: number;
  feedbackText: string;
  accuracyTier: 'perfect' | 'excellent' | 'great' | 'good' | 'okay' | 'miss';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

// Evaluation accuracy scoring
export function calculateEvaluationScore(difference: number): { base: number; bonus: number; tier: 'perfect' | 'excellent' | 'great' | 'good' | 'okay' | 'miss' } {
  const absDiff = Math.abs(difference);
  
  if (absDiff <= 25) {
    return { base: 1000, bonus: 200, tier: 'perfect' };
  } else if (absDiff <= 50) {
    return { base: 900 + Math.floor((50 - absDiff) * 4), bonus: 100, tier: 'excellent' };
  } else if (absDiff <= 100) {
    return { base: 700 + Math.floor((100 - absDiff) * 4), bonus: 50, tier: 'great' };
  } else if (absDiff <= 200) {
    return { base: 400 + Math.floor((200 - absDiff) * 3), bonus: 0, tier: 'good' };
  } else if (absDiff <= 400) {
    return { base: 100 + Math.floor((400 - absDiff) * 1.5), bonus: 0, tier: 'okay' };
  } else {
    return { base: Math.max(0, 100 - Math.floor((absDiff - 400) * 0.25)), bonus: 0, tier: 'miss' };
  }
}


// Streak multiplier calculation
export function calculateStreakMultiplier(streak: number): number {
  if (streak >= 20) return 3.0;
  if (streak >= 10) return 2.0;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

// Perfect streak bonus
export function calculatePerfectStreakBonus(perfectStreak: number): number {
  if (perfectStreak >= 5) return 2500;
  if (perfectStreak >= 3) return 1000;
  return 0;
}

// Move bonus for playing the best move
export function calculateMoveBonus(moveQuality: 'best' | 'good' | 'wrong' | null): number {
  if (moveQuality === 'best') return 500;
  if (moveQuality === 'good') return 250;
  return 0;
}

// Main scoring function
export function calculateTotalScore(
  evalDifference: number,
  streak: number,
  perfectStreak: number,
  moveQuality: 'best' | 'good' | 'wrong' | null = null
): ScoreBreakdown {
  const evalScore = calculateEvaluationScore(evalDifference);
  const basePoints = evalScore.base;
  const accuracyBonus = evalScore.bonus;
  const moveBonus = calculateMoveBonus(moveQuality);
  const streakMultiplier = calculateStreakMultiplier(streak);
  const perfectStreakBonus = calculatePerfectStreakBonus(perfectStreak);
  
  // Apply multiplier to base score components
  const multipliedBase = Math.floor((basePoints + accuracyBonus) * streakMultiplier);
  const totalPoints = multipliedBase + moveBonus + perfectStreakBonus;
  
  // Generate feedback text
  let feedbackText = '';
  switch (evalScore.tier) {
    case 'perfect':
      feedbackText = '🎯 PERFECT!';
      break;
    case 'excellent':
      feedbackText = '⭐ Excellent!';
      break;
    case 'great':
      feedbackText = '✨ Great!';
      break;
    case 'good':
      feedbackText = '👍 Good!';
      break;
    case 'okay':
      feedbackText = '👌 Okay';
      break;
    case 'miss':
      feedbackText = '💪 Keep trying!';
      break;
  }
  
  return {
    basePoints,
    accuracyBonus,
    moveBonus,
    streakMultiplier,
    perfectStreakBonus,
    totalPoints,
    feedbackText,
    accuracyTier: evalScore.tier
  };
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Accuracy achievements
  { id: 'first_perfect', name: 'First Perfect', description: 'Get your first perfect evaluation', icon: '🎯' },
  { id: 'perfect_10', name: 'Precision Expert', description: 'Get 10 perfect evaluations', icon: '🏆' },
  { id: 'perfect_100', name: 'Evaluation Master', description: 'Get 100 perfect evaluations', icon: '👑' },
  
  // Streak achievements
  { id: 'streak_5', name: 'On Fire', description: 'Get a 5 puzzle streak', icon: '🔥' },
  { id: 'streak_10', name: 'Unstoppable', description: 'Get a 10 puzzle streak', icon: '⚡' },
  { id: 'streak_20', name: 'Legendary', description: 'Get a 20 puzzle streak', icon: '🌟' },
  
  // Perfect streak achievements
  { id: 'perfect_streak_3', name: 'Triple Perfect', description: 'Get 3 perfect evaluations in a row', icon: '💎' },
  { id: 'perfect_streak_5', name: 'Flawless', description: 'Get 5 perfect evaluations in a row', icon: '💫' },
  
  // Move bonus achievements
  { id: 'best_move_1', name: 'Tactical Eye', description: 'Play the best move after evaluation', icon: '♟️' },
  { id: 'best_move_10', name: 'Chess Vision', description: 'Play 10 best moves after evaluation', icon: '👁️' },
  
  // Milestone achievements
  { id: 'puzzles_10', name: 'Getting Started', description: 'Solve 10 puzzles', icon: '🎮' },
  { id: 'puzzles_50', name: 'Dedicated', description: 'Solve 50 puzzles', icon: '📈' },
  { id: 'puzzles_100', name: 'Centurion', description: 'Solve 100 puzzles', icon: '💯' },
  { id: 'puzzles_500', name: 'Grandmaster Trainer', description: 'Solve 500 puzzles', icon: '🏅' },
  
  // Score achievements
  { id: 'score_10k', name: 'Point Collector', description: 'Reach 10,000 total points', icon: '💰' },
  { id: 'score_50k', name: 'High Scorer', description: 'Reach 50,000 total points', icon: '💸' },
  { id: 'score_100k', name: 'Score Legend', description: 'Reach 100,000 total points', icon: '🏆' },
];

// Check for newly unlocked achievements
export function checkAchievements(
  stats: {
    perfectCount: number;
    streak: number;
    perfectStreak: number;
    bestMoveCount: number;
    totalPuzzles: number;
    totalScore: number;
  },
  unlockedAchievementIds: string[]
): Achievement[] {
  const newAchievements: Achievement[] = [];
  
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedAchievementIds.includes(achievement.id)) continue;
    
    let unlocked = false;
    
    switch (achievement.id) {
      case 'first_perfect':
        unlocked = stats.perfectCount >= 1;
        break;
      case 'perfect_10':
        unlocked = stats.perfectCount >= 10;
        break;
      case 'perfect_100':
        unlocked = stats.perfectCount >= 100;
        break;
      case 'streak_5':
        unlocked = stats.streak >= 5;
        break;
      case 'streak_10':
        unlocked = stats.streak >= 10;
        break;
      case 'streak_20':
        unlocked = stats.streak >= 20;
        break;
      case 'perfect_streak_3':
        unlocked = stats.perfectStreak >= 3;
        break;
      case 'perfect_streak_5':
        unlocked = stats.perfectStreak >= 5;
        break;
      case 'best_move_1':
        unlocked = stats.bestMoveCount >= 1;
        break;
      case 'best_move_10':
        unlocked = stats.bestMoveCount >= 10;
        break;
      case 'puzzles_10':
        unlocked = stats.totalPuzzles >= 10;
        break;
      case 'puzzles_50':
        unlocked = stats.totalPuzzles >= 50;
        break;
      case 'puzzles_100':
        unlocked = stats.totalPuzzles >= 100;
        break;
      case 'puzzles_500':
        unlocked = stats.totalPuzzles >= 500;
        break;
      case 'score_10k':
        unlocked = stats.totalScore >= 10000;
        break;
      case 'score_50k':
        unlocked = stats.totalScore >= 50000;
        break;
      case 'score_100k':
        unlocked = stats.totalScore >= 100000;
        break;
    }
    
    if (unlocked) {
      newAchievements.push({ ...achievement, unlockedAt: Date.now() });
    }
  }
  
  return newAchievements;
}