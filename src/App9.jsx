import React, { useState, useEffect, useRef } from 'react';
import { rawQuestions } from './questions.js';

// --- Helper Functions ---
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Dynamically find all unique assignment numbers from the data for the dropdown
const availableAssignments = [...new Set(rawQuestions.map(q => q.assignment))].sort((a, b) => a - b);

// --- Main App Component ---
export default function App() {
  const [gameState, setGameState] = useState('setup'); // 'setup', 'active', 'finished'
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  
  const timeoutRef = useRef(null);

  // Effect to clear any running timer when the component unmounts or the question changes
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, [currentQuestionIndex]);

  const handleStartQuiz = (settings) => {
    let questions;
    if (settings.week === 'all') {
      questions = [...rawQuestions];
    } else {
      // Filter the flat array based on the selected assignment number
      questions = rawQuestions.filter(q => q.assignment === parseInt(settings.week, 10));
    }

    if (settings.shuffleQuestions) {
      questions = shuffleArray(questions);
    }

    // Prepare questions with potentially shuffled options
    const preparedQuestions = questions.map(q => ({
      ...q,
      options: settings.shuffleOptions ? shuffleArray(q.options) : q.options
    }));

    setActiveQuestions(preparedQuestions);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setScore(0);
    setGameState('active');
  };

  const handleReset = () => {
    clearTimeout(timeoutRef.current);
    setGameState('setup');
  };
  
  const handleAnswerSelect = (selectedOption) => {
    // Prevent answering the same question multiple times
    if (userAnswers[currentQuestionIndex] !== undefined) return;

    const isCorrect = selectedOption === activeQuestions[currentQuestionIndex].answer;
    
    setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedOption }));

    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    // Set a timeout to automatically advance to the next question
    timeoutRef.current = setTimeout(() => {
      if (currentQuestionIndex < activeQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setGameState('finished');
      }
    }, 300);
  };
  
  const navigateQuestion = (direction) => {
    clearTimeout(timeoutRef.current); // Stop auto-advance if navigating manually
    const newIndex = currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < activeQuestions.length) {
      setCurrentQuestionIndex(newIndex);
    }
  };

  const renderContent = () => {
    switch (gameState) {
      case 'active':
        return <QuizScreen 
          questions={activeQuestions} 
          currentIndex={currentQuestionIndex}
          onAnswerSelect={handleAnswerSelect}
          userAnswers={userAnswers}
          score={score}
          onReset={handleReset}
          onNavigate={navigateQuestion}
          />;
      case 'finished':
        return <ResultScreen score={score} total={activeQuestions.length} onReset={handleReset} />;
      case 'setup':
      default:
        return <SetupScreen onStart={handleStartQuiz} />;
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen w-screen flex flex-col items-center justify-center p-4 font-sans">
       <div className="w-full max-w-2xl">{renderContent()}</div>
    </div>
  );
}

// --- Screen Components ---

function SetupScreen({ onStart }) {
  const [settings, setSettings] = useState({
    week: availableAssignments[0] || 'all',
    shuffleQuestions: true,
    shuffleOptions: true,
  });

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center">
      <h1 className="text-4xl font-bold mb-2 text-cyan-400">Geography Quiz Setup</h1>
      <p className="text-gray-400 mb-8">Choose your options and start the quiz!</p>
      
      <div className="space-y-6 text-left">
        <div>
          <label htmlFor="week" className="block mb-2 text-lg font-medium text-gray-300">Select Quiz Topic:</label>
          <select 
            name="week" 
            id="week" 
            value={settings.week} 
            onChange={handleSettingChange}
            className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            {availableAssignments.map(weekNum => (
              <option key={weekNum} value={weekNum}>Assignment {weekNum}</option>
            ))}
            <option value="all">All Assignments</option>
          </select>
        </div>
        
        <div className="flex flex-col space-y-4 pt-2">
            <label className="flex items-center cursor-pointer text-lg">
                <input type="checkbox" name="shuffleQuestions" checked={settings.shuffleQuestions} onChange={handleSettingChange} className="form-checkbox h-6 w-6 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"/>
                <span className="ml-3 text-gray-300">Randomize Question Order</span>
            </label>
            <label className="flex items-center cursor-pointer text-lg">
                <input type="checkbox" name="shuffleOptions" checked={settings.shuffleOptions} onChange={handleSettingChange} className="form-checkbox h-6 w-6 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"/>
                <span className="ml-3 text-gray-300">Randomize Answer Order</span>
            </label>
        </div>
      </div>
      
      <button 
        onClick={() => onStart(settings)}
        className="mt-10 w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-8 rounded-lg text-xl transition-transform transform hover:scale-105"
      >
        Start Quiz
      </button>
    </div>
  );
}

function QuizScreen({ questions, currentIndex, onAnswerSelect, userAnswers, score, onReset, onNavigate }) {
  if (!questions || questions.length === 0) {
    return <div className="text-center text-xl text-red-400">No questions found for this topic. Please reset.</div>;
  }
  const currentQ = questions[currentIndex];
  const userAnswer = userAnswers[currentIndex];
  
  const getButtonClass = (option) => {
    if (userAnswer === undefined) {
      return "bg-gray-700 hover:bg-gray-600";
    }
    const isCorrect = option === currentQ.answer;
    const isSelected = option === userAnswer;
    if (isCorrect) return "bg-green-600";
    if (isSelected && !isCorrect) return "bg-red-600";
    return "bg-gray-700 opacity-50";
  };
  
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <span className="font-semibold text-cyan-400">Question {currentIndex + 1} of {questions.length}</span>
        <span className="font-semibold text-green-400">Score: {score}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
        <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
      </div>

      <h2 className="text-2xl mb-6 text-gray-200 min-h-[6rem] flex items-center">{currentQ.question}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQ.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswerSelect(option)}
            disabled={userAnswer !== undefined}
            className={`w-full p-4 rounded-lg text-left transition-colors duration-200 text-lg ${getButtonClass(option)}`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mt-8">
        <button onClick={onReset} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition">Reset</button>
        <div className="flex gap-2">
            <button onClick={() => onNavigate(-1)} disabled={currentIndex === 0} className="bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition">Prev</button>
            <button onClick={() => onNavigate(1)} disabled={currentIndex === questions.length - 1} className="bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition">Next</button>
        </div>
      </div>
    </div>
  );
}

function ResultScreen({ score, total, onReset }) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  return (
    <div className="bg-gray-800 text-center p-8 rounded-lg shadow-2xl">
      <h2 className="text-3xl font-bold mb-4 text-cyan-400">Quiz Complete!</h2>
      <p className="text-xl mb-2 text-gray-300">Your final score is:</p>
      <p className="text-6xl font-extrabold text-green-400 mb-2">{score} / {total}</p>
      <p className="text-3xl font-bold text-cyan-300 mb-8">({percentage}%)</p>
      <button
        onClick={onReset}
        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
      >
        Try Another Quiz
      </button>
    </div>
  );
}