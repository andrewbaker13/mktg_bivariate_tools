// API_BASE and WS_BASE are defined in api-config.js

// Get session data
const urlParams = new URLSearchParams(window.location.search);
let roomCode = urlParams.get('room');

// 🚧 DEV MODE: Use mock room code if in dev mode
if (window.DEV_MODE && !roomCode) {
    console.log('🚧 DEV MODE: Using mock room code');
    roomCode = 'DEV1';
}

if (!roomCode) {
    alert('No room code provided');
    window.location.href = 'game-join.html';
}

const gameSession = JSON.parse(sessionStorage.getItem('gameSession') || '{}');
const playerSession = JSON.parse(sessionStorage.getItem('playerSession') || '{}');
const isGuest = sessionStorage.getItem('isGuest') === 'true';
let isWaitingToEnter = sessionStorage.getItem('waitingToEnter') === 'true';

// Store the latest leaderboard globally so we can use it in final standings
let latestLeaderboard = [];
let leaderboardVisibility = 'always_show'; // Default

// WebSocket connection
let websocket = null;
let gameType = null;
let gameStartTime = null;
let nextGameType = null; // Store the upcoming game type for showing instructions
let timerInterval = null;
let numberlineMin = 0;
let numberlineMax = 100;
let submittedGuesses = []; // Track all submitted guesses for dynamic range
let initialNumberlineMin = 0; // Store initial config values
let initialNumberlineMax = 100;

let connectionAttemptStart = Date.now();
let progressMessageInterval = null;
