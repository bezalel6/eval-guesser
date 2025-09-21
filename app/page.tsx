import PuzzleService from "@/app/lib/puzzle-service";
import PuzzleDisplay from "@/app/components/PuzzleDisplay";

export default async function Page() {
  const puzzleService = PuzzleService.getInstance();
  const puzzle = await puzzleService.getRandomPuzzle();

  if (!puzzle) {
    return <div>Failed to load puzzle.</div>;
  }

  return <PuzzleDisplay puzzle={puzzle} />;
}