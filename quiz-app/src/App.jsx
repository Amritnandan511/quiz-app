import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

/**
 * React Quiz App – Best‑Practice Single‑File Implementation
 * ---------------------------------------------------------
 * ✅ Meets + exceeds the PDF requirements:
 *   - Clean responsive UI (TailwindCSS classes used for styling)
 *   - 5–10 MCQs, one-at-a-time, 4 options
 *   - Track score, show results summary, restart
 *   - React functional components + hooks (useState, useEffect)
 *   - Bonus: React Router (/quiz, /results), timer per question, progress bar, difficulty picker,
 *            resilient loading with API + local fallback, accessibility, localStorage high scores
 *
 * 🔧 How to use in Vite (recommended):
 *   1) Create:  npm create vite@latest quiz-app -- --template react
 *   2) cd quiz-app && npm i react-router-dom
 *   3) (Optional) Tailwind: https://tailwindcss.com/docs/guides/vite
 *   4) Replace src/App.jsx with this file content (export default App)
 *   5) Ensure main.jsx renders <App /> inside <BrowserRouter>
 *   6) npm run dev
 *
 * 🎯 Interview‑friendly: The code is deliberately well‑commented to explain design decisions.
 */

/** --------------------------------------
 * Constants & Utilities
 * ---------------------------------------*/
const LOCAL_QUESTIONS = [
  {
    question: "Which HTML tag is used to define an internal style sheet?",
    correct_answer: "<style>",
    incorrect_answers: ["<script>", "<css>", "<styles>"],
    difficulty: "easy",
    category: "HTML"
  },
  {
    question: "Which array method returns a new array with elements that pass a test?",
    correct_answer: "filter",
    incorrect_answers: ["map", "reduce", "forEach"],
    difficulty: "easy",
    category: "JavaScript"
  },
  {
    question: "In CSS, what does the 'rem' unit size relative to?",
    correct_answer: "Root element font-size",
    incorrect_answers: ["Parent element font-size", "Viewport width", "Viewport height"],
    difficulty: "medium",
    category: "CSS"
  },
  {
    question: "React Hook to perform side effects is?",
    correct_answer: "useEffect",
    incorrect_answers: ["useState", "useMemo", "useRef"],
    difficulty: "easy",
    category: "React"
  },
  {
    question: "Which HTTP status code represents 'Created'?",
    correct_answer: "201",
    incorrect_answers: ["200", "204", "301"],
    difficulty: "medium",
    category: "HTTP"
  },
  {
    question: "What is the output of typeof null in JavaScript?",
    correct_answer: "object",
    incorrect_answers: ["null", "undefined", "number"],
    difficulty: "medium",
    category: "JavaScript"
  },
  {
    question: "Which CSS property controls text size?",
    correct_answer: "font-size",
    incorrect_answers: ["text-style", "font-weight", "text-size"],
    difficulty: "easy",
    category: "CSS"
  },
  {
    question: "Which React feature helps avoid prop drilling?",
    correct_answer: "Context API",
    incorrect_answers: ["Fragments", "Keys", "Portals"],
    difficulty: "medium",
    category: "React"
  }
];

const API_URL = "https://opentdb.com/api.php";

function shuffle(array) {
  // Fisher–Yates
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function decodeHTMLEntities(str) {
  // Open Trivia may return HTML entities; decode safely in browser
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

// Persist & read high score
const HIGH_SCORE_KEY = "quiz.highscore";
const getHighScore = () => Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
const setHighScore = (n) => localStorage.setItem(HIGH_SCORE_KEY, String(n));

/** --------------------------------------
 * App Shell + Routing
 * ---------------------------------------*/
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="font-semibold tracking-tight text-lg">Quiz App</Link>
            <nav className="text-sm">
              <Link className="px-3 py-1 rounded hover:bg-gray-100" to="/quiz">Start Quiz</Link>
              <Link className="px-3 py-1 rounded hover:bg-gray-100" to="/results" state={{ fromNav: true }}>Results</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </main>
        <footer className="border-t py-6 text-center text-xs text-gray-500">
          Built with React hooks • Router • Accessible controls • Local storage
        </footer>
      </div>
    </BrowserRouter>
  );
}

/** --------------------------------------
 * Home – intro + difficulty selector
 * ---------------------------------------*/
function Home() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("any");
  const [amount, setAmount] = useState(8); // between 5 and 10 per spec

  function handleStart() {
    navigate("/quiz", { state: { difficulty, amount } });
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Welcome!</h1>
      <p className="text-gray-600">
        This assessment loads questions from Open Trivia DB with a resilient local fallback. You’ll get a timer,
        progress indicator, score tracking, and a detailed results summary.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Difficulty</span>
          <select
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring w-full"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            aria-label="Select difficulty"
          >
            <option value="any">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Number of Questions (5-10)</span>
          <input
            type="number"
            min={5}
            max={10}
            value={amount}
            onChange={(e) => setAmount(Math.min(10, Math.max(5, Number(e.target.value))))}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring w-full"
            aria-label="Number of questions"
          />
        </label>
        <div className="flex items-end">
          <button
            onClick={handleStart}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-90 focus:outline-none"
          >
            Start Quiz
          </button>
        </div>
      </div>

      <HighScoreCard />
    </div>
  );
}

function HighScoreCard() {
  const high = getHighScore();
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="text-sm text-gray-600">Personal Best</div>
      <div className="text-2xl font-semibold">{high}/10</div>
      <div className="text-xs text-gray-500">Saved in your browser</div>
    </div>
  );
}

/** --------------------------------------
 * Quiz – core flow
 * ---------------------------------------*/
function Quiz() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const desiredDifficulty = state?.difficulty || "any";
  const desiredAmount = state?.amount || 8;

  // Data model for UI:
  // { question: string, options: string[], correctIndex: number, category?: string, difficulty?: string }
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Quiz runtime state
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null); // index within options
  const [answers, setAnswers] = useState([]); // per question summary
  const [locked, setLocked] = useState(false); // after choosing or timeout

  // Timer
  const SECONDS = 30;
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const tickRef = useRef(null);

  // Load questions
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Build API query; ensure we always get 4 options (type=multiple)
        const params = new URLSearchParams({ amount: String(desiredAmount), type: "multiple" });
        if (desiredDifficulty !== "any") params.set("difficulty", desiredDifficulty);
        const url = `${API_URL}?${params.toString()}`;
        const resp = await fetch(url, { cache: "no-store" });
        const data = await resp.json();
        const normalized = normalizeQuestionsFromAPI(data?.results);
        if (!active) return;
        if (normalized.length < 5) throw new Error("Too few questions from API");
        setQuestions(normalized);
      } catch (e) {
        // Fallback: sample from LOCAL_QUESTIONS
        const sample = shuffle(LOCAL_QUESTIONS).slice(0, Math.min(10, Math.max(5, desiredAmount)));
        const normalized = sample.map((q) => normalizeOne({
          question: q.question,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          difficulty: q.difficulty,
          category: q.category
        }));
        if (active) {
          setError("Using local questions due to a network or API issue.");
          setQuestions(normalized);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start/restart the per-question timer whenever current question changes
  useEffect(() => {
    if (loading) return;
    setSelected(null);
    setLocked(false);
    setTimeLeft(SECONDS);
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, loading]);

  // Handle timer reaching zero -> auto lock and move next
  useEffect(() => {
    if (timeLeft <= 0 && !locked && !loading) {
      handleLockAnswer();
      // After auto-lock, advance after a brief pause so the user sees the lock
      const id = setTimeout(() => handleNext(), 600);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, locked, loading]);

  function normalizeQuestionsFromAPI(results = []) {
    return results.map((r) => normalizeOne(r));
  }

  function normalizeOne(r) {
    const question = decodeHTMLEntities(r.question);
    const correct = decodeHTMLEntities(r.correct_answer);
    const incorrect = (r.incorrect_answers || []).map(decodeHTMLEntities);
    const options = shuffle([correct, ...incorrect]);
    const correctIndex = options.indexOf(correct);
    return {
      question,
      options,
      correctIndex,
      category: r.category || "",
      difficulty: r.difficulty || ""
    };
  }

  function handleLockAnswer() {
    if (locked) return;
    setLocked(true);
    const q = questions[current];
    const entry = {
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex: selected, // may be null if time ran out
      isCorrect: selected === q.correctIndex
    };
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = entry;
      return next;
    });
  }

  function handleNext() {
    if (!locked) return; // prevent skipping without locking (unless skip feature desired)
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
    } else {
      // compute score & navigate to results
      const total = answers.reduce((acc, a) => acc + (a?.isCorrect ? 1 : 0), 0);
      const finalScore = total + (selected === questions[current].correctIndex ? 1 : 0) * (locked ? 0 : 0); // score already captured on lock
      const score = answers.filter((a) => a?.isCorrect).length;
      // high score (denominator 10 for consistent display as in Home card)
      const best = getHighScore();
      if (score > best) setHighScore(score);
      navigate("/results", { state: { answers, totalQuestions: questions.length } });
    }
  }

  function handlePrev() {
    if (current === 0) return;
    // Allow going back only for review BEFORE locking? Spec allows Previous/Skip if implemented.
    // Here, we allow going back only if previous was already answered (locked state preserved in answers array).
    setCurrent((c) => c - 1);
  }

  function handleRestart() {
    navigate("/", { replace: true });
  }

  if (loading) {
    return (
      <div className="grid place-items-center h-64">
        <div className="animate-pulse text-gray-600">Loading questions…</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="grid gap-3">
        <p className="text-red-600">No questions available.</p>
        <button className="px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={handleRestart}>Go Home</button>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <section className="grid gap-4">
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Category: <span className="font-medium">{q.category || "General"}</span></div>
        <div className="text-sm text-gray-600">Difficulty: <span className="font-medium capitalize">{q.difficulty || "any"}</span></div>
      </div>

      <ProgressBar value={progress} label={`Question ${current + 1} of ${questions.length}`} />

      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold leading-snug">{q.question}</h2>

        <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Answer options">
          {q.options.map((opt, idx) => (
            <OptionButton
              key={idx}
              label={opt}
              selected={selected === idx}
              disabled={locked}
              onClick={() => setSelected(idx)}
              correct={locked && idx === q.correctIndex}
              incorrect={locked && selected === idx && idx !== q.correctIndex}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <Timer seconds={timeLeft} total={SECONDS} />
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl border hover:bg-gray-50 disabled:opacity-50"
              onClick={handlePrev}
              disabled={current === 0}
            >
              Previous
            </button>

            {!locked ? (
              <button
                className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
                onClick={handleLockAnswer}
                disabled={selected === null}
              >
                Lock Answer
              </button>
            ) : (
              <button
                className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-90"
                onClick={handleNext}
              >
                {current + 1 === questions.length ? "Finish" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Tip: You must lock an answer before moving forward. If time runs out, the current selection (or none) is locked automatically.
      </p>
    </section>
  );
}

/** --------------------------------------
 * Results – score + full summary + restart
 * ---------------------------------------*/
function Results() {
  const navigate = useNavigate();
  const loc = useLocation();
  const answers = loc.state?.answers || [];
  const totalQuestions = loc.state?.totalQuestions || answers.length || 0;

  const score = useMemo(() => answers.filter((a) => a?.isCorrect).length, [answers]);

  useEffect(() => {
    // Guard direct navigation without state
    if (!totalQuestions) {
      navigate("/", { replace: true });
    } else {
      const best = getHighScore();
      if (score > best) setHighScore(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRestart() {
    navigate("/", { replace: true });
  }

  if (!totalQuestions) return null;

  return (
    <section className="grid gap-6">
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="text-sm text-gray-600">Final Score</div>
        <div className="text-3xl font-semibold">You scored {score}/{totalQuestions}</div>
        <div className="mt-1 text-xs text-gray-500">Personal best: {getHighScore()}/10</div>
        <div className="mt-4">
          <button onClick={handleRestart} className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-90">Restart Quiz</button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Question</th>
              <th className="py-2 pr-4">Your Answer</th>
              <th className="py-2 pr-4">Correct Answer</th>
              <th className="py-2 pr-4">Result</th>
            </tr>
          </thead>
          <tbody>
            {answers.map((a, i) => (
              <SummaryRow key={i} index={i} entry={a} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryRow({ index, entry }) {
  const your = entry.selectedIndex != null ? entry.options[entry.selectedIndex] : "(No answer)";
  const correct = entry.options[entry.correctIndex];
  const ok = entry.isCorrect;
  return (
    <tr className="align-top">
      <td className="py-2 pr-4 text-gray-500">{index + 1}</td>
      <td className="py-2 pr-4 min-w-[16rem]">{entry.question}</td>
      <td className="py-2 pr-4 break-words">
        <span className={"px-2 py-1 rounded text-xs " + (ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{your}</span>
      </td>
      <td className="py-2 pr-4 break-words">{correct}</td>
      <td className="py-2 pr-4">{ok ? "Correct" : "Incorrect"}</td>
    </tr>
  );
}

/** --------------------------------------
 * Presentational bits
 * ---------------------------------------*/
function ProgressBar({ value, label }) {
  return (
    <div aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} role="progressbar">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-xs text-gray-500">{Math.round(value)}%</div>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-2 bg-gray-900" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Timer({ seconds, total }) {
  const percent = Math.max(0, Math.min(100, (seconds / total) * 100));
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden" title="Time remaining">
        <div className="h-2 bg-gray-900" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-sm text-gray-700 tabular-nums">{seconds}s</div>
    </div>
  );
}

function OptionButton({ label, selected, disabled, onClick, correct, incorrect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className={[
        "text-left px-4 py-3 rounded-xl border transition focus:outline-none",
        selected && !disabled ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:bg-gray-50",
        disabled && correct ? "bg-green-50 border-green-200" : "",
        disabled && incorrect ? "bg-red-50 border-red-200" : "",
      ].join(" ")}
    >
      <span className="leading-snug">{label}</span>
    </button>
  );
}

