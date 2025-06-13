const terminal = document.getElementById("terminal");
const input = document.getElementById("input");
const resetBtn = document.getElementById("resetBtn");

let wordList = [];
let possibleWords = [];
let currentGuess = "";

fetch('https://raw.githubusercontent.com/tabatkins/wordle-list/main/words')
  .then(res => res.text())
  .then(text => {
    wordList = text.split("\n").filter(word => word.length === 5);
    possibleWords = [...wordList];
    suggestNext();
  });

function print(text) {
  terminal.textContent += text + "\n";
  terminal.scrollTop = terminal.scrollHeight;
}

function scoreWords(words) {
  const freq = {};
  for (let word of words) {
    let unique = new Set(word);
    for (let ch of unique) {
      freq[ch] = (freq[ch] || 0) + 1;
    }
  }
  return words.sort((a, b) => {
    const score = w => [...new Set(w)].reduce((sum, l) => sum + (freq[l] || 0), 0);
    return score(b) - score(a);
  });
}

function updatePossibleWords(guess, result) {
  possibleWords = possibleWords.filter(word => {
    for (let i = 0; i < 5; i++) {
      const g = guess[i], r = result[i], w = word[i];
      if (r === 'G' && g !== w) return false;
      if (r === 'Y' && (g === w || !word.includes(g))) return false;
      if (r === 'B') {
        const guessCount = guess.split('').filter(c => c === g).length;
        const wordCount = word.split('').filter(c => c === g).length;
        const required = result.split('').filter((r, i2) => guess[i2] === g && r !== 'B').length;
        if (word.includes(g) && wordCount > required) return false;
      }
    }
    return true;
  });
}

function suggestNext() {
  const ranked = scoreWords(possibleWords);
  currentGuess = ranked[0] || "?????";
  print(`🧠 Try this guess: ${currentGuess.toUpperCase()}`);
  print(`Type feedback (e.g. GYBBG) and press Enter:\n`);
}

input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    const feedback = input.value.trim().toUpperCase();
    input.value = "";

    if (feedback.length !== 5 || !/^[GYB]+$/.test(feedback)) {
      print("❌ Invalid result format. Use only G, Y, B.");
      return;
    }

    print(`> Feedback: ${feedback}`);
    updatePossibleWords(currentGuess, feedback);
    if (feedback === "GGGGG") {
      print("🎉 Solved! Word was: " + currentGuess.toUpperCase());
    } else {
      suggestNext();
    }
  }
});

resetBtn.addEventListener("click", () => {
  possibleWords = [...wordList];
  terminal.textContent = "";
  print("🔄 Bot reset.\n");
  suggestNext();
});
