// JÁTÉK INDÍTÁS
const play = document.querySelector("#play");
play.addEventListener("click", function () {
    const selectedDifficulty = document.querySelector("#difficulty").value;
    generateTable(selectedDifficulty);
});

let totalScore = 0;
let remainingTime = 0;
let timerInterval = null;

// TÁBLÁZAT GENERÁLÁS
function generateTable(difficulty) {
    const existingDraw = document.querySelector("#draw");
    if (existingDraw) existingDraw.remove();

    document.querySelector("#menu").style.display = "none";
    document.querySelector("h1").innerText = "";

    const playerName = document.querySelector("input[type='text']").value || "Névtelen";
    const level = levels[difficulty];

    localStorage.setItem("lastPlayerName", playerName);
    localStorage.setItem("lastDifficulty", difficulty);

    document.querySelector("#player-name-display").innerText = playerName;
    document.querySelector("#difficulty-display").innerText = levels[difficulty].name;
    document.querySelector("#score").innerText = "0";
    document.querySelector("#time-left").innerText = `${level.time} minutes`;
    document.querySelector("#game-ui").style.display = "flex";

    clearInterval(timerInterval);
    remainingTime = levels[difficulty].time * 60;
    document.querySelector("#time-left").innerText = formatTime(remainingTime);

    timerInterval = setInterval(() => {
        remainingTime--;
        document.querySelector("#time-left").innerText = formatTime(remainingTime);
    
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            endGame("timeout");
        }
    },1000)

    const table = document.querySelector("table");
    const availableTechs = getAvailableTechnologies(difficulty);

    const matrix = Array.from({ length: level.rows }, () =>
        Array.from({ length: level.cols }, () => "")
    );

    table.innerHTML = matrix.map(row =>
        `<tr>${row.map(() => `<td></td>`).join("")}</tr>`
    ).join("");

    const allCells = Array.from(table.querySelectorAll("td"));
    allCells.forEach(td => {
        td.addEventListener("click", () => {
            handleCellClick(td, difficulty);
        });
    });

    const startCount = {
        "easy": 4,
        "medium": 6,
        "hard": 8
    }[difficulty];

    const shuffledCells = allCells.sort(() => 0.5 - Math.random()).slice(0, startCount);

    shuffledCells.forEach(td => {
        const tech = availableTechs[Math.floor(Math.random() * availableTechs.length)];
        td.innerHTML = `
            <img 
                src="assets/logos/${tech.step1.img}"
                alt="${tech.step1.name}"
                class="tech-img"
                data-name="${tech.step1.name}"
                data-description="${tech.step1.description}"
                data-evolution="${tech.evolutionName}"
                data-tooltip="${tech.evolutionTooltip}"
            >
        `;
    });

    adjustCellSize(level.rows, level.cols);

    // DRAW GOMB DINAMIKUS LÉTREHOZÁSA

    const drawButton = document.createElement("button");
    drawButton.id = "draw";
    drawButton.innerText = "Draw";
    table.insertAdjacentElement('afterend', drawButton);

    drawButton.addEventListener("click", function () {
        generateNewTechRandom(difficulty);
    });
}

// CELLA MÉRETEZÉS

function adjustCellSize(rows, cols) {
    const table = document.querySelector("table");

    const screenHeight = window.innerHeight * 0.8;
    const screenWidth = window.innerWidth * 0.8;

    const cellHeight = screenHeight / rows;
    const cellWidth = screenWidth / cols;

    const cellSize = Math.min(cellHeight, cellWidth);

    const tds = document.querySelectorAll("td");
    tds.forEach(td => {
        td.style.width = `${cellSize}px`;
        td.style.height = `${cellSize}px`;
        td.style.fontSize = `${cellSize / 3}px`;
    });
}

// TECHNOLÓGIÁK SZŰRÉSE NEHÉZSÉG SZERINT

function getAvailableTechnologies(difficulty) {
    const difficulties = ["easy", "medium", "hard"];
    const currentIndex = difficulties.indexOf(difficulty);

    const availableTechs = [];

    evolutions.forEach(evo => {
        const evoDifficultyIndex = difficulties.indexOf(evo.difficulty);
        if (evoDifficultyIndex <= currentIndex) {
            const step1 = evo.steps.find(s => s.step === 1);
            if (step1) {
                availableTechs.push({
                    step1,
                    evolutionName: evo.name,
                    evolutionTooltip: evo.tooltip
                });
            }
        }
    });

    return availableTechs;
}

// TOOLTIP KEZELÉS

const tooltip = document.querySelector("#tooltip");
let tooltipTimeout = null;
let hideTimeout = null;
let currentImg = null;

document.addEventListener("mouseover", function (e) {
    const img = e.target.closest(".tech-img");
    if (img && img !== currentImg) {
        currentImg = img;

        clearTimeout(tooltipTimeout);
        clearTimeout(hideTimeout);

        tooltipTimeout = setTimeout(() => {
            const name = img.getAttribute("data-name");
            const description = img.getAttribute("data-description");
            const tooltipImage = img.getAttribute("data-tooltip");
    
            tooltip.innerHTML = `
                <strong>${name}</strong><br>
                <small>${description}</small><br>
                <img src="assets/evolutions/${tooltipImage}" alt="${name}" style="width: 370px;"><br>
            `;
            tooltip.style.opacity = 1;
        }, 3000);
    }
});

document.addEventListener("mousemove", function (e) {
    tooltip.style.left = `${e.pageX + 15}px`;
    tooltip.style.top = `${e.pageY + 15}px`;
});

document.addEventListener("mouseout", function (e) {
    const img = e.target.closest(".tech-img");

    if (img && img === currentImg) {
        clearTimeout(tooltipTimeout);
        hideTimeout = setTimeout(() => {
            tooltip.style.opacity = 0;
            currentImg = null;
        }, 500)
    }
});

// ÚJ TECHNOLÓGIA GENERÁLÁS

function getEmptyCells() {
    const allTds = document.querySelectorAll("td");
    if (!allTds || allTds.length === 0) return [];
    return Array.from(allTds).filter(td => td.innerHTML.trim() === "");
}

function generateNewTech(cell, difficulty) {
    const availableTechs = getAvailableTechnologies(difficulty);
    const tech = availableTechs[Math.floor(Math.random() * availableTechs.length)];

    cell.innerHTML = `
        <img 
            src="assets/logos/${tech.step1.img}"
            alt="${tech.step1.name}"
            class="tech-img"
            data-name="${tech.step1.name}"
            data-description="${tech.step1.description}"
            data-evolution="${tech.evolutionName}"
            data-tooltip="${tech.evolutionTooltip}"
        >
    `;

    checkGameOver();
}

function generateNewTechRandom(difficulty) {
    const emptyCells = getEmptyCells();
    if (emptyCells.length === 0) {
        if (!hasMergeablePair()) {
            clearInterval(timerInterval);
            endGame();
        }
        return;
    }

    const randomEmptyCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    generateNewTech(randomEmptyCell, difficulty);

    if (getEmptyCells().length === 0 && !hasMergeablePair()) {
        clearInterval(timerInterval);
        endGame();
    }
}


// CELLÁRA KATTINTÁS ESEMÉNY

let firstCell = null;
let secondCell = null;

function handleCellClick(td, difficulty) {
    if (td.innerHTML.trim() === "") {
        generateNewTech(td, difficulty);
    } else {
        if (!firstCell) {
            firstCell = td;
            firstCell.classList.add("selected-cell");
        } else {
            if (td === firstCell) return;

            secondCell = td;
            secondCell.classList.add("selected-cell");

            const firstName = firstCell.querySelector("img")?.getAttribute("data-name");
            const secondName = secondCell.querySelector("img")?.getAttribute("data-name");

            if (firstName && secondName && firstName === secondName) {
                mergeCells(firstCell, secondCell, difficulty);
            }

            firstCell.classList.remove("selected-cell");
            secondCell.classList.remove("selected-cell");
            firstCell = null;
            secondCell = null;
        }
    }
}

// ÖSSZEOLVASZTÁS

function mergeCells(firstCell, secondCell, difficulty) {
    const newTech = getMergedTechnology(firstCell, secondCell);

    if (!newTech) {
        return;
    }

    secondCell.innerHTML = `
        <img
            src="assets/logos/${newTech.img}"
            alt="${newTech.name}"
            class="tech-img merge-animation"
            class="tech-img"
            data-name="${newTech.name}"
            data-description="${newTech.description}"
            data-evolution="${newTech.evolutionName}"
            data-tooltip="${newTech.evolutionTooltip}"
        >
    `;

    firstCell.innerHTML = "";

    const evolution = evolutions.find(e => e.name === newTech.evolutionName);
    const lastStep = evolution?.steps.length;

    if (evolution && newTech.name === evolution.steps[lastStep - 1].name) {
        totalScore += evolution.points;
        document.querySelector("#score").innerText = totalScore;
    }

    checkGameOver()
}

function getMergedTechnology(firstCell, secondCell) {
    const img = firstCell.querySelector("img");
    const currentTechName = img.getAttribute("data-name");
    const evolutionName = img.getAttribute("data-evolution");

    const evolution = evolutions.find(e => e.name === evolutionName);
    const currentStep = evolution.steps.find(s => s.name === currentTechName);

    if (currentStep && currentStep.step < evolution.steps.length) {
        const nextStep = evolution.steps.find(s => s.step === currentStep.step + 1);
        return {
            ...nextStep,
            evolutionName: evolution.name,
            evolutionTooltip: evolution.tooltip
        };
    }

    return null;
}

function hasMergeablePair() {
    const allTds = Array.from(document.querySelectorAll("td"));

    for (let i = 0; i < allTds.length; i++) {
        const img1 = allTds[i].querySelector("img");
        if (!img1) continue;

        const name1 = img1.getAttribute("data-name");
        const evo1 = img1.getAttribute("data-evolution");

        const evolution = evolutions.find(e => e.name === evo1);
        const currentStep = evolution?.steps.find(s => s.name === name1);

        if (!currentStep || currentStep.step === evolution.steps.length) continue;

        for (let j = i + 1; j < allTds.length; j++) {
            const img2 = allTds[j].querySelector("img");
            if (!img2) continue;

            const name2 = img2.getAttribute("data-name");
            const evo2 = img2.getAttribute("data-evolution");

            if (name1 === name2 && evo1 === evo2) {
                return true;
            }
        }
    }
    return false;
}

// IDŐ

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// GAME OVER

function endGame(reason = "no-moves") {
    clearInterval(timerInterval);

    const playerName = document.querySelector("#player-name-display").innerText;
    const difficulty = document.querySelector("#difficulty-display").innerText.toLowerCase();

    let message = "";

    if (reason === "timeout") {
        message = `${playerName}, time is up! Total score: ${totalScore}`;
    } else if (reason === "no-moves") {
        message = `${playerName}, no more moves! Total score: ${totalScore}`;
    }

    document.querySelector("#final-message").innerText = message;
    
    const topScores = saveScore(difficulty, playerName, totalScore);
    const list = topScores.map((entry, i) => `<li>${i + 1}. ${entry.name} – ${entry.score}</li>`).join("");

    document.querySelector("#final-message").innerHTML += 
    `<h3>Top 5 (${difficulty}):</h3>
    <ol>${list}</ol>`;

    document.querySelector("#game-over").style.display = "flex";
}

document.querySelector("#restart").addEventListener("click", function () {
    const playerName = localStorage.getItem("lastPlayerName") || "N/A";
    const difficulty = localStorage.getItem("lastDifficulty") || "easy";

    document.querySelector("#game-over").style.display = "none";

    generateTable(difficulty);
});

document.querySelector("#back-to-menu").addEventListener("click", function () {
    location.reload();
});

function checkGameOver() {
    const empty = getEmptyCells();
    if (empty.length === 0 && !hasMergeablePair()) {
        clearInterval(timerInterval);
        endGame("no-moves");
    }
}

// RANGLISTA

function saveScore(difficulty, name, score) {
    const key = `highscores-${difficulty}`;
    const stored = JSON.parse(localStorage.getItem(key)) || [];

    stored.push({ name, score });
    stored.sort((a, b) => b.score - a.score);
    const top5 = stored.slice(0, 5);

    localStorage.setItem(key, JSON.stringify(top5));
    return top5;
}