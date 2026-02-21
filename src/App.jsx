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

function SudokuGrid({
  rows,
  baseRows,
  overlayRows,
  highlightBorder,
  highlightedMask,
  onCellClick,
}) {
  const cells = [];

  for (let rowIndex = 0; rowIndex < 9; rowIndex += 1) {
    for (let colIndex = 0; colIndex < 9; colIndex += 1) {
      const value = rows?.[rowIndex]?.[colIndex] ?? 0;
      const baseValue = baseRows?.[rowIndex]?.[colIndex] ?? 0;
      const overlayValue = overlayRows?.[rowIndex]?.[colIndex] ?? 0;
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
      if (highlightedMask?.[rowIndex]?.[colIndex]) {
        classes.push("cell-linked-highlight");
      }

      cells.push(
        <div
          key={`${rowIndex}-${colIndex}`}
          className={classes.join(" ")}
          onClick={
            onCellClick
              ? () => onCellClick({ rowIndex, colIndex, value })
              : undefined
          }
        >
          {overlayRows && (
            <span className="cell-corner">{overlayValue || ""}</span>
          )}
          <span className="cell-main">{value || ""}</span>
        </div>
      );
    }
  }

  return <div className={`grid ${highlightBorder ? "grid-match" : ""}`}>{cells}</div>;
}

function PuzzleCard({
  puzzle,
  onOpen,
  isLowest,
  isHighest,
  displayRows,
  baseRows,
  meta,
}) {
  return (
    <button
      className={`puzzle-card preview ${isLowest ? "low" : ""} ${
        isHighest ? "high" : ""
      }`}
      type="button"
      onClick={onOpen}
    >
      <h2 className="puzzle-title">{puzzle.name}</h2>
      {meta && <p className="puzzle-meta">{meta}</p>}
      <SudokuGrid rows={displayRows ?? puzzle.rows} baseRows={baseRows} />
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

function cloneBoard(rows) {
  return rows.map((row) => row.slice());
}

function applyShift(rows, shiftAmount) {
  const normalizedShift = ((shiftAmount % 9) + 9) % 9;
  if (!normalizedShift) return cloneBoard(rows);

  return rows.map((row) =>
    row.map((value) => {
      if (!value) return 0;
      return ((value - 1 + normalizedShift) % 9) + 1;
    })
  );
}

function applyManualMapping(rows, pairs) {
  if (!pairs.length) return cloneBoard(rows);
  const digitMap = new Map(pairs.map((pair) => [pair.from, pair.to]));
  return rows.map((row) =>
    row.map((value) => {
      if (!value) return 0;
      return digitMap.get(value) ?? value;
    })
  );
}

function applyRowMapping(rows, pairs) {
  if (!pairs.length) return cloneBoard(rows);
  const source = cloneBoard(rows);
  const result = cloneBoard(rows);
  pairs.forEach(({ from, to }) => {
    result[to - 1] = source[from - 1].slice();
  });
  return result;
}

function applyColumnMapping(rows, pairs) {
  if (!pairs.length) return cloneBoard(rows);
  const source = cloneBoard(rows);
  const result = cloneBoard(rows);
  pairs.forEach(({ from, to }) => {
    for (let row = 0; row < 9; row += 1) {
      result[row][to - 1] = source[row][from - 1];
    }
  });
  return result;
}

function rotateBoard(rows, degrees) {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized === 0) return cloneBoard(rows);

  const board = Array.from({ length: 9 }, () => Array(9).fill(0));

  if (normalized === 90) {
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        board[row][col] = rows[8 - col][row];
      }
    }
    return board;
  }

  if (normalized === 180) {
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        board[row][col] = rows[8 - row][8 - col];
      }
    }
    return board;
  }

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      board[row][col] = rows[col][8 - row];
    }
  }
  return board;
}

function transposeBoard(rows) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      board[row][col] = rows[col][row];
    }
  }
  return board;
}

function flipBoard(rows, flipMode) {
  if (flipMode === "none") return cloneBoard(rows);

  if (flipMode === "horizontal") {
    return rows.map((row) => row.slice().reverse());
  }

  return cloneBoard(rows).reverse();
}

function parsePairs(text) {
  const trimmed = text.trim();
  if (!trimmed) return { pairs: [], error: "" };

  const chunks = trimmed
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!chunks.length) {
    return { pairs: [], error: "Use comma-separated pairs like 1 2,3-4." };
  }

  const pairs = [];
  for (const chunk of chunks) {
    const match = chunk.match(/^([1-9])(?:\s+|-)([1-9])$/);
    if (!match) {
      return {
        pairs: [],
        error: "Use comma-separated pairs like 1 2,3-4.",
      };
    }
    pairs.push({
      from: Number.parseInt(match[1], 10),
      to: Number.parseInt(match[2], 10),
    });
  }

  return { pairs, error: "" };
}

function parseCycleNotation(text) {
  const trimmed = text.trim();
  if (!trimmed) return { pairs: [], error: "" };

  const cycles = [];
  const cycleRegex = /\(([^)]+)\)/g;
  let match = cycleRegex.exec(trimmed);

  while (match) {
    cycles.push(match[1]);
    match = cycleRegex.exec(trimmed);
  }

  const errorMessage = "Use cycle notation like (1 2 3)(4 5).";
  if (!cycles.length) {
    return { pairs: [], error: errorMessage };
  }

  const leftover = trimmed.replace(cycleRegex, "").trim();
  if (leftover.replace(/[,\s]/g, "") !== "") {
    return { pairs: [], error: errorMessage };
  }

  const pairs = [];
  for (const cycleText of cycles) {
    const parts = cycleText.trim().split(/[\s,]+/).filter(Boolean);
    if (!parts.length) {
      return { pairs: [], error: errorMessage };
    }

    const values = [];
    for (const part of parts) {
      if (!/^[1-9]$/.test(part)) {
        return { pairs: [], error: errorMessage };
      }
      values.push(Number.parseInt(part, 10));
    }

    if (values.length < 2) {
      continue;
    }

    for (let index = 0; index < values.length; index += 1) {
      pairs.push({
        from: values[index],
        to: values[(index + 1) % values.length],
      });
    }
  }

  return { pairs, error: "" };
}

function validatePermutationPairs(pairs) {
  const fromSet = new Set();
  const toSet = new Set();

  for (const pair of pairs) {
    if (fromSet.has(pair.from)) {
      return "Each source index can only appear once.";
    }
    if (toSet.has(pair.to)) {
      return "Each destination index can only appear once.";
    }
    fromSet.add(pair.from);
    toSet.add(pair.to);
  }

  return "";
}

function applyBoardTransforms(rows, options) {
  let board = cloneBoard(rows);

  board = applyShift(board, options.shiftValue);
  board = applyManualMapping(board, options.manualPairs);
  board = applyRowMapping(board, options.rowPairs);
  board = applyColumnMapping(board, options.colPairs);
  board = rotateBoard(board, options.rotationDegrees);
  if (options.useTranspose) {
    board = transposeBoard(board);
  }
  board = flipBoard(board, options.flipMode);

  return board;
}

function applySpatialTransforms(rows, options) {
  let board = cloneBoard(rows);
  board = applyRowMapping(board, options.rowPairs);
  board = applyColumnMapping(board, options.colPairs);
  board = rotateBoard(board, options.rotationDegrees);
  if (options.useTranspose) {
    board = transposeBoard(board);
  }
  board = flipBoard(board, options.flipMode);
  return board;
}

function boardsAreEqual(first, second) {
  if (!first || !second || first.length !== 9 || second.length !== 9) return false;
  for (let row = 0; row < 9; row += 1) {
    if (!first[row] || !second[row] || first[row].length !== 9 || second[row].length !== 9) {
      return false;
    }
    for (let col = 0; col < 9; col += 1) {
      if (first[row][col] !== second[row][col]) return false;
    }
  }
  return true;
}

function buildValueMask(rows, targetValue) {
  if (!rows || !targetValue) return null;
  return rows.map((row) => row.map((value) => value === targetValue));
}

export default function App() {
  const [manifest, setManifest] = React.useState([]);
  const [puzzles, setPuzzles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activePuzzleName, setActivePuzzleName] = React.useState(null);
  const [activeView, setActiveView] = React.useState("browse");
  const [solutions, setSolutions] = React.useState({});
  const [solveErrors, setSolveErrors] = React.useState({});
  const [searchTerm, setSearchTerm] = React.useState("");
  const [useRegexSearch, setUseRegexSearch] = React.useState(false);
  const [regexError, setRegexError] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [showSolved, setShowSolved] = React.useState(false);
  const [shiftInput, setShiftInput] = React.useState("0");
  const [manualMapInput, setManualMapInput] = React.useState("");
  const [rowMapInput, setRowMapInput] = React.useState("");
  const [colMapInput, setColMapInput] = React.useState("");
  const [rotationDegrees, setRotationDegrees] = React.useState("0");
  const [useTranspose, setUseTranspose] = React.useState(false);
  const [flipMode, setFlipMode] = React.useState("none");
  const [compareInput, setCompareInput] = React.useState("");
  const [compareName, setCompareName] = React.useState("");
  const [compareLoading, setCompareLoading] = React.useState(false);
  const [compareError, setCompareError] = React.useState("");
  const [selectedPrimaryValue, setSelectedPrimaryValue] = React.useState(null);
  const pageSize = activeView === "solved_mod25" ? 18 : 60;
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

  const mod25Manifest = React.useMemo(() => {
    return manifest.filter((entry) => {
      const value = Number.parseInt(entry.name, 10);
      return Number.isFinite(value) && value % 25 === 0;
    });
  }, [manifest]);

  const viewManifest = activeView === "solved_mod25" ? mod25Manifest : manifest;

  const filteredManifest = React.useMemo(() => {
    return viewManifest.filter((entry) => searchConfig.predicate(entry));
  }, [viewManifest, searchConfig]);

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
      if (!viewManifest.length) return;
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
  }, [viewManifest.length, page, totalPages, isSearching, filteredManifest]);

  React.useEffect(() => {
    setShowSolved(activeView === "solved_mod25");
    setShiftInput("0");
    setManualMapInput("");
    setRowMapInput("");
    setColMapInput("");
    setRotationDegrees("0");
    setUseTranspose(false);
    setFlipMode("none");
    setCompareInput("");
    setCompareName("");
    setCompareError("");
    setCompareLoading(false);
    setSelectedPrimaryValue(null);
  }, [activePuzzleName, activeView]);

  React.useEffect(() => {
    setPage(1);
  }, [activeView]);

  const uniquePuzzleCount = manifest.length;

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

  const activePuzzle = activePuzzleName
    ? puzzleCacheRef.current.get(activePuzzleName) ||
      puzzles.find((puzzle) => puzzle.name === activePuzzleName)
    : null;
  const activeSolution = activePuzzle
    ? solutions[activePuzzle.name]
    : undefined;
  const activeSolveError = activePuzzle
    ? solveErrors[activePuzzle.name]
    : undefined;
  const comparePuzzle = compareName ? puzzleCacheRef.current.get(compareName) : null;
  const compareSolution =
    comparePuzzle && solutions[comparePuzzle.name]
      ? solutions[comparePuzzle.name]
      : undefined;
  const compareSolveError =
    comparePuzzle && solveErrors[comparePuzzle.name]
      ? solveErrors[comparePuzzle.name]
      : undefined;
  const shiftValue = Number.parseInt(shiftInput, 10) || 0;

  const parsedManualMapping = React.useMemo(
    () => parsePairs(manualMapInput),
    [manualMapInput]
  );
  const parsedRowMapping = React.useMemo(
    () => parseCycleNotation(rowMapInput),
    [rowMapInput]
  );
  const parsedColMapping = React.useMemo(
    () => parseCycleNotation(colMapInput),
    [colMapInput]
  );

  const rowMapError = parsedRowMapping.error
    ? parsedRowMapping.error
    : validatePermutationPairs(parsedRowMapping.pairs);
  const colMapError = parsedColMapping.error
    ? parsedColMapping.error
    : validatePermutationPairs(parsedColMapping.pairs);

  const baseDisplayRows =
    activePuzzle && showSolved && activeSolution ? activeSolution : activePuzzle?.rows;
  const canApplyTransforms =
    activePuzzle &&
    activePuzzle.errors.length === 0 &&
    !parsedManualMapping.error &&
    !rowMapError &&
    !colMapError;
  const hasActiveTransforms =
    shiftValue !== 0 ||
    parsedManualMapping.pairs.length > 0 ||
    parsedRowMapping.pairs.length > 0 ||
    parsedColMapping.pairs.length > 0 ||
    (Number.parseInt(rotationDegrees, 10) || 0) !== 0 ||
    useTranspose ||
    flipMode !== "none";

  const transformOptions = React.useMemo(
    () => ({
      shiftValue,
      manualPairs: parsedManualMapping.pairs,
      rowPairs: parsedRowMapping.pairs,
      colPairs: parsedColMapping.pairs,
      rotationDegrees: Number.parseInt(rotationDegrees, 10) || 0,
      useTranspose,
      flipMode,
    }),
    [
      shiftValue,
      parsedManualMapping.pairs,
      parsedRowMapping.pairs,
      parsedColMapping.pairs,
      rotationDegrees,
      useTranspose,
      flipMode,
    ]
  );

  const transformedRows = React.useMemo(() => {
    if (!baseDisplayRows) return [];
    if (!canApplyTransforms) return cloneBoard(baseDisplayRows);
    return applyBoardTransforms(baseDisplayRows, transformOptions);
  }, [baseDisplayRows, canApplyTransforms, transformOptions]);

  const transformedBaseRows = React.useMemo(() => {
    if (!activePuzzle) return [];
    if (!canApplyTransforms) return cloneBoard(activePuzzle.rows);
    return applyBoardTransforms(activePuzzle.rows, transformOptions);
  }, [activePuzzle, canApplyTransforms, transformOptions]);

  const transformedOriginalOverlayRows = React.useMemo(() => {
    if (!baseDisplayRows || !hasActiveTransforms) return undefined;
    return applySpatialTransforms(baseDisplayRows, transformOptions);
  }, [baseDisplayRows, hasActiveTransforms, transformOptions]);
  const linkedHighlightMask = React.useMemo(
    () => buildValueMask(transformedRows, selectedPrimaryValue),
    [transformedRows, selectedPrimaryValue]
  );
  const compareBaseRows =
    comparePuzzle && showSolved && compareSolution
      ? compareSolution
      : comparePuzzle?.rows;
  const isMatchWithCompare =
    hasActiveTransforms &&
    compareBaseRows &&
    comparePuzzle?.errors.length === 0 &&
    boardsAreEqual(transformedRows, compareBaseRows);

  const handleToggleShowSolved = () => {
    if (!activePuzzle) return;

    setShowSolved((prev) => {
      const next = !prev;
      if (next && !solutions[activePuzzle.name]) {
        const { solution, error } = solveSudoku(activePuzzle.rows);
        setSolutions((existing) => ({
          ...existing,
          [activePuzzle.name]: solution,
        }));
        setSolveErrors((existing) => ({
          ...existing,
          [activePuzzle.name]: error,
        }));
      }
      return next;
    });
  };

  const handlePrimaryCellClick = ({ value }) => {
    if (!value) {
      setSelectedPrimaryValue(null);
      return;
    }
    setSelectedPrimaryValue((prev) => (prev === value ? null : value));
  };

  React.useEffect(() => {
    if (!showSolved || !comparePuzzle || solutions[comparePuzzle.name]) return;
    const { solution, error } = solveSudoku(comparePuzzle.rows);
    setSolutions((existing) => ({
      ...existing,
      [comparePuzzle.name]: solution,
    }));
    setSolveErrors((existing) => ({
      ...existing,
      [comparePuzzle.name]: error,
    }));
  }, [showSolved, comparePuzzle, solutions]);

  React.useEffect(() => {
    if (activeView !== "solved_mod25") return;
    if (!puzzles.length) return;

    const nextSolutions = {};
    const nextErrors = {};

    for (const puzzle of puzzles) {
      if (puzzle.errors.length > 0) continue;
      if (solutions[puzzle.name] || solveErrors[puzzle.name]) continue;
      const { solution, error } = solveSudoku(puzzle.rows);
      nextSolutions[puzzle.name] = solution;
      nextErrors[puzzle.name] = error;
    }

    if (Object.keys(nextSolutions).length) {
      setSolutions((existing) => ({ ...existing, ...nextSolutions }));
    }
    if (Object.keys(nextErrors).length) {
      setSolveErrors((existing) => ({ ...existing, ...nextErrors }));
    }
  }, [activeView, puzzles, solutions, solveErrors]);

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

  const loadComparePuzzle = async () => {
    const requestedName = compareInput.trim();
    if (!requestedName) {
      setCompareName("");
      setCompareError("");
      return;
    }

    const entry = manifest.find((item) => item.name === requestedName);
    if (!entry) {
      setCompareName("");
      setCompareError("Could not find that sudoku id.");
      return;
    }

    const cached = puzzleCacheRef.current.get(entry.name);
    if (cached) {
      setCompareName(entry.name);
      setCompareError("");
      return;
    }

    setCompareLoading(true);
    setCompareError("");
    try {
      const response = await fetch(new URL(entry.file, baseSudokuUrl));
      const text = await response.text();
      const parsed = parsePuzzle(text);
      const result = { ...entry, ...parsed };
      puzzleCacheRef.current.set(entry.name, result);
      setCompareName(entry.name);
    } catch (error) {
      setCompareName("");
      setCompareError(String(error));
    } finally {
      setCompareLoading(false);
    }
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
            Unique: {loading ? "—" : uniquePuzzleCount}
          </span>
          <span className="stat">
            Showing: {loading ? "—" : filteredManifest.length}
            {activeView === "solved_mod25" ? " (id % 25 = 0)" : ""}
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
          placeholder={
            activeView === "solved_mod25"
              ? "Search within id % 25 = 0..."
              : "Search by puzzle name..."
          }
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
      <div
        className={`pagination-row ${isSearching ? "pagination-row--solo" : ""}`}
      >
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
        <div className="view-tabs">
          <button
            type="button"
            className={`solve-button view-tab ${activeView === "browse" ? "active" : ""}`}
            aria-pressed={activeView === "browse"}
            onClick={() => setActiveView("browse")}
          >
            Browse
          </button>
          <button
            type="button"
            className={`solve-button view-tab ${activeView === "solved_mod25" ? "active" : ""}`}
            aria-pressed={activeView === "solved_mod25"}
            onClick={() => setActiveView("solved_mod25")}
          >
            Solved (id % 25 = 0)
          </button>
        </div>
      </div>
      <section className="puzzle-list">
        {puzzles.map((puzzle) => (
          <PuzzleCard
            key={puzzle.name}
            puzzle={puzzle}
            onOpen={() => setActivePuzzleName(puzzle.name)}
            isLowest={puzzle.name === lowestName}
            isHighest={puzzle.name === highestName}
            displayRows={
              activeView === "solved_mod25"
                ? solutions[puzzle.name] || puzzle.rows
                : undefined
            }
            baseRows={activeView === "solved_mod25" ? puzzle.rows : undefined}
            meta={
              activeView === "solved_mod25"
                ? solveErrors[puzzle.name]
                : undefined
            }
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
            <div className="modal-body">
              <div className="modal-grid-panel">
                <div className="compare-controls">
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Load 2nd sudoku by id..."
                    value={compareInput}
                    onChange={(event) => setCompareInput(event.target.value)}
                  />
                  <button
                    className="solve-button"
                    type="button"
                    onClick={loadComparePuzzle}
                    disabled={compareLoading}
                  >
                    {compareLoading ? "Loading..." : "Load"}
                  </button>
                </div>
                {compareError && <div className="error">{compareError}</div>}
                <div className="compare-grids">
                  <div>
                    <p className="puzzle-meta">Primary (transformed)</p>
                    <SudokuGrid
                      rows={transformedRows}
                      baseRows={transformedBaseRows}
                      overlayRows={transformedOriginalOverlayRows}
                      highlightBorder={isMatchWithCompare}
                      highlightedMask={linkedHighlightMask}
                      onCellClick={handlePrimaryCellClick}
                    />
                  </div>
                  <div>
                    <p className="puzzle-meta">
                      {comparePuzzle ? `Compare: ${comparePuzzle.name}` : "Compare board"}
                    </p>
                    {comparePuzzle ? (
                      <SudokuGrid
                        rows={compareBaseRows || comparePuzzle.rows}
                        baseRows={comparePuzzle.rows}
                        highlightBorder={isMatchWithCompare}
                        highlightedMask={linkedHighlightMask}
                      />
                    ) : (
                      <div className="compare-placeholder">
                        Load another sudoku id to compare.
                      </div>
                    )}
                  </div>
                </div>
                {activePuzzle.errors.length > 0 && (
                  <div className="error">{activePuzzle.errors.join(" ")}</div>
                )}
                {activeSolveError && <div className="error">{activeSolveError}</div>}
                {compareSolveError && <div className="error">{compareSolveError}</div>}
              </div>
              <aside className="transform-panel">
                <h3>Transformations</h3>
                <label className="transform-field">
                  Shift numbers
                  <input
                    type="number"
                    value={shiftInput}
                    onChange={(event) => setShiftInput(event.target.value)}
                    disabled={activePuzzle.errors.length > 0}
                  />
                </label>
                <label className="transform-field">
                  Relabel (e.g. 6 8,5-7)
                  <input
                    type="text"
                    value={manualMapInput}
                    onChange={(event) => setManualMapInput(event.target.value)}
                    disabled={activePuzzle.errors.length > 0}
                  />
                </label>
                {parsedManualMapping.error && (
                  <div className="error">{parsedManualMapping.error}</div>
                )}
                <label className="transform-field">
                  Row map (e.g. (1 2 3)(4 5))
                  <input
                    type="text"
                    value={rowMapInput}
                    onChange={(event) => setRowMapInput(event.target.value)}
                    disabled={activePuzzle.errors.length > 0}
                  />
                </label>
                {rowMapError && <div className="error">{rowMapError}</div>}
                <label className="transform-field">
                  Column map (e.g. (1 2 3)(4 5))
                  <input
                    type="text"
                    value={colMapInput}
                    onChange={(event) => setColMapInput(event.target.value)}
                    disabled={activePuzzle.errors.length > 0}
                  />
                </label>
                {colMapError && <div className="error">{colMapError}</div>}
                <label className="transform-field">
                  Rotation
                  <select
                    value={rotationDegrees}
                    onChange={(event) => setRotationDegrees(event.target.value)}
                    disabled={activePuzzle.errors.length > 0}
                  >
                    <option value="0">0°</option>
                    <option value="90">90°</option>
                    <option value="180">180°</option>
                    <option value="270">270°</option>
                  </select>
                </label>
                <label className="transform-toggle">
                  <input
                    type="checkbox"
                    checked={useTranspose}
                    onChange={(event) => setUseTranspose(event.target.checked)}
                    disabled={activePuzzle.errors.length > 0}
                  />{" "}
                  Transpose
                </label>
                <label className="transform-field">
                  Mirror
                  <select
                    value={flipMode}
                    onChange={(event) => setFlipMode(event.target.value)}
                    disabled={activePuzzle.errors.length > 0}
                  >
                    <option value="none">None</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </label>
              </aside>
            </div>
            <div className="modal-actions">
              <button
                className="solve-button"
                type="button"
                onClick={handleToggleShowSolved}
                disabled={activePuzzle.errors.length > 0}
              >
                {showSolved ? "Hide solved" : "Show solved"}
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

