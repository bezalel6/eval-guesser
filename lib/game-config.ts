// Game configuration - easily modifiable
export const GAME_CONFIG = {
  // Evaluation threshold in centipawns (400 = 4 pawns)
  EVAL_THRESHOLD: 400,
  
  // Number of strikes allowed before game ends (0 = instant fail on wrong)
  MAX_STRIKES: 0,
  
  // Time limit for 5-minute mode in milliseconds
  FIVE_MINUTE_TIME: 5 * 60 * 1000,
  
  // Progressive difficulty settings
  BASE_RATING: 1500,
  RATING_INCREMENT_PER_PUZZLE: 25,
  RATING_RANGE: 200,
} as const;