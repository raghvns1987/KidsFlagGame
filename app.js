// Game state
let currentQuestion = {};
let score = 0;
let questionsAnswered = 0;
let streak = 0;
let bestStreak = 0;
let selectedContinent = 'All';
let availableCountries = [];

// DOM elements
const flagImage = document.getElementById('flag-image');
const optionsContainer = document.getElementById('options');
const nextButton = document.getElementById('next-btn');
const scoreElement = document.getElementById('score-value');
const quizInterface = document.getElementById('quiz-interface');
const resultContainer = document.getElementById('result');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-btn');
const continentSelection = document.getElementById('continent-selection');
const continentSelect = document.getElementById('continent-select');
const stopQuizButton = document.getElementById('stop-quiz-btn');
const feedbackElement = document.getElementById('feedback');
const themeToggle = document.getElementById('theme-toggle');

// Get unique continents for the filter
const continents = [...new Set(countries.map(country => country.continent))].sort();

// Check for available flags when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-quiz');

    availableCountries = countries;

    if (startButton) {
        startButton.disabled = false;
        startButton.textContent = 'Start Quiz';
        startButton.onclick = startQuiz; // Assign click handler here
    }

    // Populate continent select dropdown
    if (continentSelect) {
        continentSelect.innerHTML = '<option value="All">All Continents</option>';
        continents.forEach(continent => {
            const option = document.createElement('option');
            option.value = continent;
            option.textContent = continent;
            continentSelect.appendChild(option);
        });
    }
    
    // Set up restart button
    if (restartButton) {
        restartButton.onclick = initGame;
    }
    
    // Set up change continent button
    const changeContinentBtn = document.getElementById('change-continent-btn');
    if (changeContinentBtn) {
        changeContinentBtn.onclick = initGame;
    }
    
    // Set up next button
    if (nextButton) {
        nextButton.onclick = loadQuestion;
    }

    // Set up stop quiz button → shows results in endless mode
    if (stopQuizButton) {
        stopQuizButton.onclick = showResults;
    }

    // Set up theme toggle
    applySavedTheme();
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Initialize the game
    initGame();
});

// ── Theme Toggle (Light / Dark Mode) ──

function applySavedTheme() {
    const savedTheme = localStorage.getItem('flag-quiz-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeAria(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('flag-quiz-theme', next);
    updateThemeAria(next);
}

function updateThemeAria(theme) {
    if (themeToggle) {
        themeToggle.setAttribute(
            'aria-label',
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        );
    }
}

// Initialize the game
function initGame() {
    // Reset game state
    score = 0;
    questionsAnswered = 0;
    streak = 0;
    bestStreak = 0;
    scoreElement.textContent = score;

    // Show continent selection and hide other sections
    continentSelection.classList.remove('hidden');
    quizInterface.classList.add('hidden');
    resultContainer.classList.add('hidden');

    // Reset the continent select to default
    if (continentSelect) {
        continentSelect.value = 'All';
    }
}

// Start the quiz with selected continent
function startQuiz() {
    // Get selected continent
    selectedContinent = continentSelect ? continentSelect.value : 'All';

    // Update UI
    score = 0;
    questionsAnswered = 0;
    streak = 0;
    bestStreak = 0;
    scoreElement.textContent = score;

    // Show quiz interface and hide other sections
    continentSelection.classList.add('hidden');
    quizInterface.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    // Update continent indicator
    const continentIndicator = document.getElementById('current-continent');
    if (continentIndicator) {
        continentIndicator.textContent = selectedContinent === 'All' ? 'All Continents' : selectedContinent;
    }

    // Update streak display
    const streakElement = document.getElementById('streak-value');
    if (streakElement) streakElement.textContent = 0;

    // Load the first question
    nextButton.classList.add('hidden');
    loadQuestion();
}

// Load a new question
function loadQuestion() {
    // Clear feedback and button styles from the previous question
    feedbackElement.textContent = '';
    feedbackElement.classList.remove('correct', 'wrong');
    nextButton.classList.add('hidden');

    // Clear any stale flag error message from previous question
    const existingError = flagImage.parentNode.querySelector('.flag-error');
    if (existingError) existingError.remove();
    flagImage.style.display = '';

    // Filter countries by selected continent if needed
    let filteredCountries = availableCountries;
    if (selectedContinent !== 'All') {
        filteredCountries = availableCountries.filter(country => country.continent === selectedContinent);
    }

    if (filteredCountries.length < 4) {
        alert('Not enough countries in this category. Please select a different continent.');
        initGame();
        return;
    }

    // Get a random country from filtered list
    const randomIndex = Math.floor(Math.random() * filteredCountries.length);
    const correctCountry = filteredCountries[randomIndex];

    // Get 3 wrong answers — deduplicated by name to avoid duplicates
    // (some countries like Armenia, Russia appear in both Asia and Europe)
    const wrongAnswers = [];
    const usedNames = new Set([correctCountry.name]);
    const sameContinentCandidates = shuffleArray(
        [...filteredCountries].filter(c => c.name !== correctCountry.name)
    );
    const otherCandidates = shuffleArray(
        [...availableCountries].filter(c =>
            c.continent !== correctCountry.continent &&
            c.name !== correctCountry.name
        )
    );

    // Try to get as many same-continent countries as possible, then fill with others
    let sameContinentCount = Math.min(3, sameContinentCandidates.length);
    let otherCount = 3 - sameContinentCount;

    // Add same continent countries, skipping any already used by name
    for (let i = 0; i < sameContinentCandidates.length && sameContinentCount > 0; i++) {
        const name = sameContinentCandidates[i].name;
        if (!usedNames.has(name)) {
            wrongAnswers.push(name);
            usedNames.add(name);
            sameContinentCount--;
        }
    }

    // Fill remaining from other continents, also deduplicated by name
    for (let i = 0; i < otherCandidates.length && otherCount > 0; i++) {
        const name = otherCandidates[i].name;
        if (!usedNames.has(name)) {
            wrongAnswers.push(name);
            usedNames.add(name);
            otherCount--;
        }
    }

    // Combine and shuffle options
    const options = [correctCountry.name, ...wrongAnswers];
    shuffleArray(options);

    // Update the UI
    flagImage.src = `https://flagcdn.com/w160/${correctCountry.code}.png`;
    flagImage.alt = `Flag of ${correctCountry.name}`;
    flagImage.onerror = function() {
        this.style.display = 'none';
        const errorMsg = document.createElement('div');
        errorMsg.className = 'flag-error';
        errorMsg.textContent = '🌍 Flag not available — guess anyway!';
        this.parentNode.appendChild(errorMsg);
    };

    // Clear previous options
    optionsContainer.innerHTML = '';

    // Create option buttons
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.addEventListener('click', () => selectAnswer(option === correctCountry.name, button));
        optionsContainer.appendChild(button);
    });

    // Store the correct answer
    currentQuestion = {
        correctAnswer: correctCountry.name,
        answered: false
    };

    nextButton.classList.add('hidden');
}

// Handle answer selection
function selectAnswer(isCorrect, button) {
    if (currentQuestion.answered) return;

    currentQuestion.answered = true;
    questionsAnswered++;

    // Disable all option buttons
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
        btn.disabled = true;
        // Highlight the correct answer
        if (btn.textContent === currentQuestion.correctAnswer) {
            btn.classList.add('correct');
        }
    });

    if (isCorrect) {
        button.classList.add('correct');
        score++;
        streak++;
        if (streak > bestStreak) bestStreak = streak;
        scoreElement.textContent = score;

        // Update streak display
        const streakElement = document.getElementById('streak-value');
        if (streakElement) streakElement.textContent = streak;

        // Fun emoji feedback with streak bonus
        const streakEmojis = ['', ' 🔥', ' ⭐⭐', ' 🌟🌟🌟', ' 🎉🎉🎉🎉', ' 🏆👑🌈🎊🎉'];
        const streakEmoji = streak < streakEmojis.length ? streakEmojis[streak] : ' 🏆👑🌈🎊🎉✨';
        feedbackElement.textContent = streak >= 2
            ? `Correct!${streakEmoji}`
            : `Correct! Great job! 🎉`;
        feedbackElement.classList.add('correct');
        feedbackElement.classList.remove('wrong');
    } else {
        button.classList.add('wrong');
        streak = 0;
        feedbackElement.textContent = `Correct Answer: ${currentQuestion.correctAnswer} 📚`;
        feedbackElement.classList.add('wrong');
        feedbackElement.classList.remove('correct');
    }

    // In endless mode, always show the next button
    nextButton.classList.remove('hidden');
}


function showResults() {
    quizInterface.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const accuracy = questionsAnswered > 0 ? Math.round((score / questionsAnswered) * 100) : 0;

    // Fun message based on performance
    let message = '🌟 Keep practicing!';
    if (accuracy >= 90) message = '🏆 You\'re a Flag Master! 🏆';
    else if (accuracy >= 70) message = '🌟 Amazing job, Explorer!';
    else if (accuracy >= 50) message = '⭐ Great effort, Keep going!';

    finalScoreElement.innerHTML =
        `<p class="result-message">${message}</p>
         <p>🎯 ${score} out of ${questionsAnswered} correct (${accuracy}%)</p>
         <p>🔥 Best streak: ${bestStreak} in a row</p>`;
}

// Utility function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

