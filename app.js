// Game state
let currentQuestion = {};
let score = 0;
let questionsAnswered = 0;
const totalQuestions = 10;
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

    // Set up stop quiz button
    if (stopQuizButton) {
        stopQuizButton.onclick = initGame;
    }
    
    // Initialize the game
    initGame();
});

// Initialize the game
function initGame() {
    // Reset game state
    score = 0;
    questionsAnswered = 0;
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
    
    // Get 3 wrong answers from the same continent
    const wrongAnswers = [];
    const sameContinentCountries = filteredCountries.filter(c => c.name !== correctCountry.name);
    
    // If we don't have enough countries in the same continent, get some from other continents
    const otherCountries = availableCountries.filter(c => 
        c.continent !== correctCountry.continent && 
        c.name !== correctCountry.name
    );
    
    // Try to get as many same-continent countries as possible, then fill with others
    const sameContinentCount = Math.min(3, sameContinentCountries.length);
    const otherCount = 3 - sameContinentCount;
    
    // Shuffle and take needed count
    const shuffledSameContinent = [...sameContinentCountries].sort(() => 0.5 - Math.random());
    const shuffledOther = [...otherCountries].sort(() => 0.5 - Math.random());
    
    // Add same continent countries first
    for (let i = 0; i < sameContinentCount; i++) {
        wrongAnswers.push(shuffledSameContinent[i].name);
    }
    
    // Then add from other continents if needed
    for (let i = 0; i < otherCount; i++) {
        wrongAnswers.push(shuffledOther[i].name);
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
        errorMsg.textContent = 'Flag not available';
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
        scoreElement.textContent = score;
        feedbackElement.textContent = 'Correct!';
        feedbackElement.classList.add('correct');
        feedbackElement.classList.remove('wrong');
    } else {
        button.classList.add('wrong');
        feedbackElement.textContent = `Correct Answer: ${currentQuestion.correctAnswer}`;
        feedbackElement.classList.add('wrong');
        feedbackElement.classList.remove('correct');
    }
    
    // Show next button or finish quiz
    if (questionsAnswered < totalQuestions) {
        nextButton.classList.remove('hidden');
    } else {
        setTimeout(showResults, 1000);
    }
}


function showResults() {
    quizInterface.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    finalScoreElement.textContent = `${score} out of ${totalQuestions}`;
}

// Utility function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

