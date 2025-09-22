
import PuzzleService from "@/app/lib/puzzle-service";
import Game from "@/app/components/Game";

export default async function Page() {
  const puzzleService = PuzzleService.getInstance();
  const puzzle = await puzzleService.getRandomPuzzle();

  if (!puzzle || !puzzle.PuzzleId || !puzzle.FEN || puzzle.Rating === undefined) {
    return <div>Failed to load puzzle. Please try refreshing the page.</div>;
  }

  return <Game initialPuzzle={puzzle as any} />;
}

// Force dynamic rendering to ensure a new puzzle is fetched on each visit
export const dynamic = "force-dynamic";
