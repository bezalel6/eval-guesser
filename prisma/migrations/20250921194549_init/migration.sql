-- CreateTable
CREATE TABLE "puzzles" (
    "PuzzleId" TEXT NOT NULL PRIMARY KEY,
    "FEN" TEXT,
    "Moves" TEXT,
    "Rating" INTEGER,
    "RatingDeviation" INTEGER,
    "Popularity" INTEGER,
    "NbPlays" INTEGER,
    "Themes" TEXT,
    "GameUrl" TEXT,
    "OpeningTags" TEXT
);

-- CreateIndex
CREATE INDEX "idx_popularity" ON "puzzles"("Popularity");

-- CreateIndex
CREATE INDEX "idx_themes" ON "puzzles"("Themes");

-- CreateIndex
CREATE INDEX "idx_rating" ON "puzzles"("Rating");
