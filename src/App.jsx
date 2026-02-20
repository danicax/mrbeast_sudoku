import React from "react";

const baseSudokuUrl = new URL(
  "sudokus/",
  new URL(import.meta.env.BASE_URL, window.location.href)
);

function parsePuzzle(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rows = [];
  const errors = [];

  lines.forEach((line, index) => {
    const digitChars = line.match(/\d/g) || [];
    const groupedMatches = line.match(/\d+/g) || [];
    const groupedNumbers = groupedMatches.map((value) =>
      Number.parseInt(value, 10)
    );
    const numbers =
      digitChars.length > 0 && digitChars.length <= 9
        ? [
            ...digitChars.map((value) => Number.parseInt(value, 10)),
            ...Array.from({ length: 9 - digitChars.length }, () => 0),
          ]
        : groupedNumbers;

    if (numbers.length === 0) {
      return;
    }

    if (numbers.length !== 9) {
      errors.push(`Row ${index + 1} has ${numbers.length} values, expected 9.`);
    }

    rows.push(numbers);
  });

  if (rows.length !== 9) {
    errors.push(`Puzzle has ${rows.length} rows, expected 9.`);
  }

  return {
    rows,
    errors,
  };
}

function SudokuGrid({ rows, baseRows }) {
  const cells = [];

  for (let rowIndex = 0; rowIndex < 9; rowIndex += 1) {
    for (let colIndex = 0; colIndex < 9; colIndex += 1) {
      const value = rows?.[rowIndex]?.[colIndex] ?? 0;
      const baseValue = baseRows?.[rowIndex]?.[colIndex] ?? 0;
      const classes = ["cell"];

      if (!value) {
        classes.push("empty");
      }
      if (value && !baseValue) {
        classes.push("solved");
      }

      if (rowIndex % 3 === 0) {
        classes.push("thick-top");
      }
      if (colIndex % 3 === 0) {
        classes.push("thick-left");
      }
      if (rowIndex === 8) {
        classes.push("thick-bottom");
      }
      if (colIndex === 8) {
        classes.push("thick-right");
      }

      cells.push(
        <div key={`${rowIndex}-${colIndex}`} className={classes.join(" ")}>
          {value || ""}
        </div>
      );
    }
  }

  return <div className="grid">{cells}</div>;
}

function PuzzleCard({ puzzle, onOpen, isLowest, isHighest }) {
  return (
    <button
      className={`puzzle-card preview ${isLowest ? "low" : ""} ${
        isHighest ? "high" : ""
      }`}
      type="button"
      onClick={onOpen}
    >
      <h2 className="puzzle-title">{puzzle.name}</h2>
      <SudokuGrid rows={puzzle.rows} />
      {puzzle.errors.length > 0 && (
        <div className="error">{puzzle.errors.join(" ")}</div>
      )}
    </button>
  );
}

function isValid(board, row, col, value) {
  for (let index = 0; index < 9; index += 1) {
    if (board[row][index] === value) return false;
    if (board[index][col] === value) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if (board[r][c] === value) return false;
    }
  }

  return true;
}

function solveBoard(board) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) {
        for (let value = 1; value <= 9; value += 1) {
          if (isValid(board, row, col, value)) {
            board[row][col] = value;
            if (solveBoard(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }

  return true;
}

function solveSudoku(rows) {
  if (!Array.isArray(rows) || rows.length !== 9) {
    return { solution: null, error: "Puzzle must have 9 rows." };
  }

  const board = rows.map((row) => row.slice());

  for (let row = 0; row < 9; row += 1) {
    if (!Array.isArray(board[row]) || board[row].length !== 9) {
      return { solution: null, error: `Row ${row + 1} must have 9 values.` };
    }

    for (let col = 0; col < 9; col += 1) {
      const value = board[row][col];
      if (!Number.isFinite(value) || value < 0 || value > 9) {
        return { solution: null, error: "Values must be numbers 0-9." };
      }
      if (value !== 0) {
        board[row][col] = 0;
        if (!isValid(board, row, col, value)) {
          return { solution: null, error: "Puzzle has conflicting values." };
        }
        board[row][col] = value;
      }
    }
  }

  if (!solveBoard(board)) {
    return { solution: null, error: "No solution found." };
  }

  return { solution: board, error: null };
}

function renderSolutionPng({ solution, baseRows, name }) {
  if (!solution || solution.length !== 9) return;

  const cellSize = 40;
  const gridSize = cellSize * 9;
  const margin = 16;
  const canvasSize = gridSize + margin * 2;
  const ratio = window.devicePixelRatio || 1;

  const canvas = document.createElement("canvas");
  canvas.width = canvasSize * ratio;
  canvas.height = canvasSize * ratio;
  canvas.style.width = `${canvasSize}px`;
  canvas.style.height = `${canvasSize}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.translate(margin, margin);

  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "20px system-ui, -apple-system, sans-serif";

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = solution[row][col];
      const baseValue = baseRows?.[row]?.[col] ?? 0;
      if (!value) continue;

      ctx.fillStyle = baseValue ? "#111827" : "#1d4ed8";
      ctx.fillText(
        String(value),
        col * cellSize + cellSize / 2,
        row * cellSize + cellSize / 2
      );
    }
  }

  for (let i = 0; i <= 9; i += 1) {
    const isThick = i % 3 === 0;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = isThick ? 2 : 1;

    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(gridSize, i * cellSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, gridSize);
    ctx.stroke();
  }

  const link = document.createElement("a");
  link.download = `${name || "sudoku"}-solution.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function App() {
  const [manifest, setManifest] = React.useState([]);
  const [puzzles, setPuzzles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activePuzzleName, setActivePuzzleName] = React.useState(null);
  const [solutions, setSolutions] = React.useState({});
  const [solveErrors, setSolveErrors] = React.useState({});
  const [searchTerm, setSearchTerm] = React.useState("");
  const [useRegexSearch, setUseRegexSearch] = React.useState(false);
  const [regexError, setRegexError] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 60;
  const maxSearchResults = 200;
  const puzzleCacheRef = React.useRef(new Map());

  const searchConfig = React.useMemo(() => {
    const term = searchTerm.trim();
    if (!term) {
      return { predicate: () => true, error: "" };
    }

    if (!useRegexSearch) {
      const lower = term.toLowerCase();
      return {
        predicate: (entry) => entry.name.toLowerCase().includes(lower),
        error: "",
      };
    }

    try {
      const regex = new RegExp(term, "i");
      return { predicate: (entry) => regex.test(entry.name), error: "" };
    } catch (error) {
      return { predicate: () => false, error: String(error) };
    }
  }, [searchTerm, useRegexSearch]);

  React.useEffect(() => {
    setRegexError(searchConfig.error);
  }, [searchConfig.error]);

  const filteredManifest = React.useMemo(
    () => manifest.filter((entry) => searchConfig.predicate(entry)),
    [manifest, searchConfig]
  );
  const isSearching = searchTerm.trim().length > 0;
  const totalPages = Math.max(1, Math.ceil(filteredManifest.length / pageSize));

  React.useEffect(() => {
    let alive = true;

    async function loadManifest() {
      try {
        const manifestResponse = await fetch(
          new URL("index.json", baseSudokuUrl)
        );
        const manifestJson = await manifestResponse.json();

        if (alive) {
          setManifest(manifestJson);
        }
      } catch (error) {
        if (alive) {
          setManifest([]);
          setPuzzles([
            {
              name: "Load error",
              rows: [],
              errors: [String(error)],
            },
          ]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadManifest();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;

    async function loadPagePuzzles() {
      if (!manifest.length) return;
      setLoading(true);

      const safePage = Math.min(page, totalPages);
      if (safePage !== page) {
        setPage(safePage);
      }

      const entries = isSearching
        ? filteredManifest.slice(0, maxSearchResults)
        : filteredManifest.slice(
            (safePage - 1) * pageSize,
            safePage * pageSize
          );

      const loaded = await Promise.all(
        entries.map(async (entry) => {
          const cached = puzzleCacheRef.current.get(entry.name);
          if (cached) return cached;
          const response = await fetch(new URL(entry.file, baseSudokuUrl));
          const text = await response.text();
          const parsed = parsePuzzle(text);
          const result = { ...entry, ...parsed };
          puzzleCacheRef.current.set(entry.name, result);
          return result;
        })
      );

      if (alive) {
        setPuzzles(loaded);
        setLoading(false);
      }
    }

    loadPagePuzzles().catch((error) => {
      if (alive) {
        setPuzzles([
          {
            name: "Load error",
            rows: [],
            errors: [String(error)],
          },
        ]);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
    };
  }, [manifest, page, totalPages, isSearching, filteredManifest]);

  const uniquePuzzleCount = React.useMemo(() => {
    const seen = new Set();

    puzzles.forEach((puzzle) => {
      if (!Array.isArray(puzzle.rows) || puzzle.rows.length !== 9) return;
      if (puzzle.errors?.length) return;
      const key = puzzle.rows.map((row) => row.join("")).join("");
      if (key.length === 81) {
        seen.add(key);
      }
    });

    return seen.size;
  }, [puzzles]);

  const puzzleNames = manifest.map((puzzle) => puzzle.name);
  const numericNames = puzzleNames
    .map((name) => Number.parseInt(name, 10))
    .filter((value) => Number.isFinite(value));
  const lowestName =
    numericNames.length > 0
      ? String(Math.min(...numericNames))
      : puzzleNames.slice().sort()[0] || "";
  const highestName =
    numericNames.length > 0
      ? String(Math.max(...numericNames))
      : puzzleNames.slice().sort().slice(-1)[0] || "";

  const activePuzzle = puzzles.find(
    (puzzle) => puzzle.name === activePuzzleName
  );
  const activeSolution = activePuzzle
    ? solutions[activePuzzle.name]
    : undefined;
  const activeSolveError = activePuzzle
    ? solveErrors[activePuzzle.name]
    : undefined;

  const handleSolve = () => {
    if (!activePuzzle) return;
    const { solution, error } = solveSudoku(activePuzzle.rows);

    setSolutions((prev) => ({
      ...prev,
      [activePuzzle.name]: solution,
    }));
    setSolveErrors((prev) => ({
      ...prev,
      [activePuzzle.name]: error,
    }));
  };

  const handleDownloadSolution = () => {
    if (!activePuzzle) return;

    const existingSolution = solutions[activePuzzle.name];
    const { solution, error } = existingSolution
      ? { solution: existingSolution, error: null }
      : solveSudoku(activePuzzle.rows);

    if (error || !solution) {
      setSolveErrors((prev) => ({
        ...prev,
        [activePuzzle.name]: error || "No solution found.",
      }));
      return;
    }

    if (!existingSolution) {
      setSolutions((prev) => ({
        ...prev,
        [activePuzzle.name]: solution,
      }));
    }

    renderSolutionPng({
      solution,
      baseRows: activePuzzle.rows,
      name: activePuzzle.name,
    });
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Sudoku Viewer</h1>
        <p>For the Mr Beast challenge.</p>
        <p className="contribute-link">
          To contribute more sudokus, make a PR{" "}
          <a
            href="https://github.com/danicax/mrbeast_sudoku/tree/main/public/sudokus"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </p>
        <div className="stats-row">
          <span className="stat low">Lowest: {lowestName || "—"}</span>
          <span className="stat high">Highest: {highestName || "—"}</span>
          <span className="stat">
            Unique (page): {loading ? "—" : uniquePuzzleCount}
          </span>
          {isSearching ? (
            <span className="stat">Matches: {filteredManifest.length}</span>
          ) : (
            <span className="stat">
              Page: {page} / {totalPages}
            </span>
          )}
        </div>
        
        <input
          className="search-input"
          type="search"
          placeholder="Search by puzzle name..."
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
        />
        <label className="contribute-link">
          <input
            type="checkbox"
            checked={useRegexSearch}
            onChange={(event) => setUseRegexSearch(event.target.checked)}
          />{" "}
          Use regex
        </label>
        {regexError && (
          <div className="error">Regex error: {regexError}</div>
        )}
        {isSearching && filteredManifest.length > maxSearchResults && (
          <p className="contribute-link">
            Showing first {maxSearchResults} results. Refine your search to narrow
            the list.
          </p>
        )}
        
      </header>
      {loading && <div className="loading">Loading puzzles...</div>}
      {!isSearching && (
        <div className="pagination">
          <button
            className="solve-button"
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            className="solve-button"
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
      <section className="puzzle-list">
        {puzzles.map((puzzle) => (
          <PuzzleCard
            key={puzzle.name}
            puzzle={puzzle}
            onOpen={() => setActivePuzzleName(puzzle.name)}
            isLowest={puzzle.name === lowestName}
            isHighest={puzzle.name === highestName}
          />
        ))}
      </section>
      {activePuzzle && (
        <div
          className="modal-backdrop"
          onClick={() => setActivePuzzleName(null)}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-header">
              <div>
                <h2 className="puzzle-title">{activePuzzle.name}</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setActivePuzzleName(null)}
              >
                Close
              </button>
            </header>
            <SudokuGrid
              rows={activeSolution || activePuzzle.rows}
              baseRows={activePuzzle.rows}
            />
            {activePuzzle.errors.length > 0 && (
              <div className="error">{activePuzzle.errors.join(" ")}</div>
            )}
            {activeSolveError && <div className="error">{activeSolveError}</div>}
            <div className="modal-actions">
              <button
                className="solve-button"
                type="button"
                onClick={handleSolve}
                disabled={activePuzzle.errors.length > 0}
              >
                Solve Sudoku
              </button>
              <button
                className="solve-button"
                type="button"
                onClick={handleDownloadSolution}
                disabled={activePuzzle.errors.length > 0}
              >
                Download Solution PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

