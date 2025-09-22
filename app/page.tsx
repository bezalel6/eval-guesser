
import PuzzleService from "@/app/lib/puzzle-service";
import AppRouter from "@/app/components/AppRouter";

export default async function Page() {
  const puzzleService = PuzzleService.getInstance();
  const puzzle = await puzzleService.getRandomPuzzle();

  if (!puzzle || !puzzle.PuzzleId || !puzzle.FEN || puzzle.Rating === undefined || !puzzle.Moves) {
    return <div>Failed to load puzzle. Please try refreshing the page.</div>;
  }

  // Type assertion is safe after validation above
  const validPuzzle = {
    PuzzleId: puzzle.PuzzleId,
    FEN: puzzle.FEN,
    Moves: puzzle.Moves,
    Rating: puzzle.Rating,
    Themes: puzzle.Themes,
    OpeningTags: puzzle.OpeningTags
  };

  return <AppRouter initialPuzzle={validPuzzle} />;
}

// Force dynamic rendering to ensure a new puzzle is fetched on each visit
export const dynamic = "force-dynamic";
