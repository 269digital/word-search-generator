import React, { useState, useCallback } from 'react';
import { Upload, Download, Eye, EyeOff, RotateCcw } from 'lucide-react';

const WordSearchGenerator = () => {
  const [words, setWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [grid, setGrid] = useState([]);
  const [wordPlacements, setWordPlacements] = useState([]);
  const [showSolution, setShowSolution] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [puzzleName, setPuzzleName] = useState('');

  const GRID_SIZE = 15;
  const DIRECTIONS = [
    [0, 1],   // horizontal right
    [0, -1],  // horizontal left
    [1, 0],   // vertical down
    [-1, 0],  // vertical up
    [1, 1],   // diagonal down-right
    [-1, -1], // diagonal up-left
    [1, -1],  // diagonal down-left
    [-1, 1]   // diagonal up-right
  ];

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const Papa = await import('papaparse');
      
      // Read the file content using FileReader
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
      
      const result = Papa.default.parse(fileContent, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: true
      });

      // Extract words from two-column format: [word, TRUE/FALSE]
      const extractedWords = [];
      const preSelectedWords = new Set();
      
      result.data.forEach((row, index) => {
        // Skip header row if it exists
        if (index === 0 && row[0] && typeof row[0] === 'string' && row[0].toLowerCase().includes('word')) {
          return;
        }
        
        if (row.length >= 2) {
          const word = row[0];
          const shouldSelect = row[1];
          
          if (word && typeof word === 'string') {
            const cleanWord = word.trim().toUpperCase();
            if (cleanWord.length > 1 && /^[A-Z]+$/.test(cleanWord)) {
              extractedWords.push(cleanWord);
              
              // Check if this word should be pre-selected (TRUE)
              let isSelected = false;
              if (shouldSelect === true) {
                isSelected = true;
              } else if (typeof shouldSelect === 'string') {
                const cleanSelect = shouldSelect.trim().toUpperCase();
                isSelected = cleanSelect === 'TRUE' || cleanSelect === '1';
              } else if (typeof shouldSelect === 'boolean') {
                isSelected = shouldSelect;
              }
              
              if (isSelected) {
                preSelectedWords.add(cleanWord);
              }
            }
          }
        }
      });
      
      // Remove duplicates and sort
      const uniqueWords = [...new Set(extractedWords)].sort();
      setWords(uniqueWords);
      setSelectedWords(preSelectedWords);
      setIsGenerated(false);
    } catch (error) {
      console.log('Error reading file. Please make sure it\'s a valid CSV file.');
    }
  };

  const toggleWordSelection = (word) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(word)) {
      newSelected.delete(word);
    } else {
      newSelected.add(word);
    }
    setSelectedWords(newSelected);
  };

  const canPlaceWord = (grid, word, row, col, direction) => {
    const [dRow, dCol] = direction;
    
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      
      if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE) {
        return false;
      }
      
      // Prevent any overlapping - cell must be completely empty
      const currentCell = grid[newRow][newCol];
      if (currentCell !== '' && currentCell !== word[i]) {
  return false;
}
    }
    return true;
  };

  const placeWord = (grid, word, row, col, direction) => {
    const [dRow, dCol] = direction;
    const placement = { word, positions: [], direction }; // Store direction
    
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * dRow;
      const newCol = col + i * dCol;
      grid[newRow][newCol] = word[i];
      placement.positions.push([newRow, newCol]);
    }
    
    return placement;
  };

  const generateWordSearch = () => {
    // Clear previous state
    setWordPlacements([]);
    setGrid([]);
    
    // Initialize empty grid
    const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(''));
    const placements = [];
    const unplacedWords = [];

    // Separate selected words from other words
    const selectedWordsArray = Array.from(selectedWords);
    const otherWords = words.filter(word => !selectedWords.has(word));
    
    // Sort each group by length (longest first for better placement)
    const sortedSelectedWords = selectedWordsArray.sort((a, b) => b.length - a.length);
    const sortedOtherWords = otherWords.sort((a, b) => b.length - a.length);
    
    // Limit other words to prevent grid overcrowding without overlapping
    const limitedOtherWords = sortedOtherWords.slice(0, 20);
    
    // Combine arrays: selected words first, then limited other words
    const wordsToPlace = [...sortedSelectedWords, ...limitedOtherWords];

    // Try to place each word
    for (const word of wordsToPlace) {
      let placed = false;
      // Give selected words more attempts to ensure they get placed
      const attempts = selectedWords.has(word) ? 500 : 100;

      for (let attempt = 0; attempt < attempts && !placed; attempt++) {
        const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);

        if (canPlaceWord(newGrid, word, row, col, direction)) {
          const placement = placeWord(newGrid, word, row, col, direction);
          placements.push(placement);
          placed = true;
        }
      }

      if (!placed) {
        unplacedWords.push(word);
      }
    }

    // Fill empty cells with random letters
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newGrid[i][j] === '') {
          newGrid[i][j] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    // Update state with new data
    setGrid(newGrid);
    setWordPlacements(placements);
    setIsGenerated(true);
  };

const getWordOutline = (row, col) => {
  if (!showSolution) return '';
  
  let borderStyle = '';
  
  // Find which selected word(s) this cell belongs to
  wordPlacements.forEach(placement => {
    if (!selectedWords.has(placement.word)) return;
    
    const cellIndex = placement.positions.findIndex(([r, c]) => r === row && c === col);
    if (cellIndex === -1) return;
    
    // Add a colored border around each word
    borderStyle += 'border-4 border-red-600 bg-yellow-200 ';
  });
  
  return borderStyle;
};

  const getSelectedWordsList = () => {
    // Only return words that were both selected AND successfully placed
    const placedSelectedWords = wordPlacements
      .filter(placement => selectedWords.has(placement.word))
      .map(placement => placement.word);
    
    return placedSelectedWords.sort();
  };

  const downloadPuzzleImage = () => {
    if (!isGenerated || grid.length === 0) {
      alert('Please generate a word search first!');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size for high quality
    canvas.width = 800;
    canvas.height = 1000;
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    const title = puzzleName || 'Word Search Puzzle';
    ctx.fillStyle = 'black';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 50);
    
    // Draw grid
    const cellSize = 40;
    const gridStartX = (canvas.width - (GRID_SIZE * cellSize)) / 2;
    const gridStartY = 100;
    
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = gridStartX + j * cellSize;
        const y = gridStartY + i * cellSize;
        
        // Draw cell border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
        
        // Draw letter
        ctx.fillStyle = 'black';
        if (grid[i] && grid[i][j]) {
          ctx.fillText(grid[i][j], x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
    
    // Draw word list
    const selectedWordsList = getSelectedWordsList();
    const wordsStartY = gridStartY + (GRID_SIZE * cellSize) + 60;
    
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Find these words:', 50, wordsStartY);
    
    ctx.font = '18px Arial';
    const wordsPerColumn = Math.ceil(selectedWordsList.length / 3);
    const columnWidth = (canvas.width - 100) / 3;
    
    selectedWordsList.forEach((word, index) => {
      const column = Math.floor(index / wordsPerColumn);
      const row = index % wordsPerColumn;
      const x = 50 + column * columnWidth;
      const y = wordsStartY + 40 + row * 30;
      ctx.fillText(word, x, y);
    });
    
    // Download the image
    const link = document.createElement('a');
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_puzzle.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadSolutionImage = () => {
    if (!isGenerated || grid.length === 0) {
      alert('Please generate a word search first!');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size for high quality
    canvas.width = 800;
    canvas.height = 1000;
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    const title = puzzleName ? `${puzzleName} - Solution` : 'Word Search Solution';
    ctx.fillStyle = 'black';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 50);
    
    // Draw grid
    const cellSize = 40;
    const gridStartX = (canvas.width - (GRID_SIZE * cellSize)) / 2;
    const gridStartY = 100;
    
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = gridStartX + j * cellSize;
        const y = gridStartY + i * cellSize;
        
        // Check if this cell is part of a selected word
        const isHighlighted = wordPlacements.some(placement => {
          if (!selectedWords.has(placement.word)) return false;
          return placement.positions.some(([r, c]) => r === i && c === j);
        });
        
        // Draw highlighted background if needed
        if (isHighlighted) {
          ctx.fillStyle = '#ffeb3b';
          ctx.fillRect(x, y, cellSize, cellSize);
        }
        
        // Draw cell border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
        
        // Draw letter
        ctx.fillStyle = 'black';
        if (grid[i] && grid[i][j]) {
          ctx.fillText(grid[i][j], x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
    
    // Draw word list
    const selectedWordsList = getSelectedWordsList();
    const wordsStartY = gridStartY + (GRID_SIZE * cellSize) + 60;
    
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'black';
    ctx.fillText('Words found:', 50, wordsStartY);
    
    ctx.font = '18px Arial';
    const wordsPerColumn = Math.ceil(selectedWordsList.length / 3);
    const columnWidth = (canvas.width - 100) / 3;
    
    selectedWordsList.forEach((word, index) => {
      const column = Math.floor(index / wordsPerColumn);
      const row = index % wordsPerColumn;
      const x = 50 + column * columnWidth;
      const y = wordsStartY + 40 + row * 30;
      ctx.fillText(word, x, y);
    });
    
    // Download the image
    const link = document.createElement('a');
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_solution.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Word Search Generator
      </h1>

      {/* File Upload Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">1. Upload CSV File</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
            <Upload size={20} />
            Choose CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <span className="text-gray-600">
            {words.length > 0 ? `${words.length} words loaded` : 'No file selected'}
          </span>
        </div>
      </div>

      {/* Word Selection Section */}
      {words.length > 0 && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              2. Select Words to Find ({selectedWords.size} selected)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedWords(new Set(words))}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedWords(new Set())}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {words.map(word => (
              <label key={word} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded">
                <input
                  type="checkbox"
                  checked={selectedWords.has(word)}
                  onChange={() => toggleWordSelection(word)}
                  className="rounded"
                />
                <span className="text-sm">{word}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Puzzle Name Section */}
      {words.length > 0 && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">3. Name Your Puzzle</h2>
          <input
            type="text"
            value={puzzleName}
            onChange={(e) => setPuzzleName(e.target.value)}
            placeholder="Enter puzzle name (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Generate Button */}
      {words.length > 0 && (
        <div className="mb-8 text-center">
          <button
            onClick={generateWordSearch}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
          >
            <RotateCcw size={20} />
            Generate Word Search
          </button>
        </div>
      )}

      {/* Generated Puzzle Section */}
      {isGenerated && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setShowSolution(!showSolution)}
              className={`flex items-center gap-2 px-4 py-2 rounded ${
                showSolution 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              {showSolution ? <EyeOff size={20} /> : <Eye size={20} />}
              {showSolution ? 'Hide Solution' : 'Show Solution'}
            </button>
            <button
              onClick={downloadPuzzleImage}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              <Download size={20} />
              Download Puzzle
            </button>
            <button
              onClick={downloadSolutionImage}
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
            >
              <Download size={20} />
              Download Solution
            </button>
          </div>

          {/* Word Search Grid */}
          <div className="flex justify-center">
            <div 
              className="gap-1 p-4 bg-white border-2 border-gray-300 rounded-lg"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(15, 32px)',
                gridTemplateRows: 'repeat(15, 32px)'
              }}
            >
              {grid.map((row, i) =>
                row.map((cell, j) => (
                  <div
                    key={`${i}-${j}`}
                className={`border border-gray-300 flex items-center justify-center text-sm font-bold bg-white ${
                  getWordOutline(i, j)
                }`}
                  >
                    {cell}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Word List */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Words to Find ({getSelectedWordsList().length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {getSelectedWordsList().map(word => (
                <div key={word} className="bg-white p-2 rounded border text-sm font-medium">
                  {word}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordSearchGenerator;
