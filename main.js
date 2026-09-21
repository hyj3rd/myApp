// 격자 설정: 400x400 캔버스를 20x20 칸으로 나눔 (셀 하나 = 20px)
const GRID_SIZE = 20;
const CELL_SIZE = 400 / GRID_SIZE;
// 난이도별 시작 틱 간격(ms). select의 value와 그대로 매칭됨
const DIFFICULTY_TICK_MS = { easy: 200, normal: 150, hard: 100, veryhard: 50 };
const DEFAULT_DIFFICULTY = "normal";
// 레벨업에 필요한 점수 기준: 레벨 1->2는 LEVEL_UP_BASE_POINTS점, 그 다음부터는 레벨이 오를 때마다
// 다음 레벨업에 필요한 점수가 LEVEL_UP_STEP_POINTS씩 더 늘어남 (50 -> 60 -> 70 -> 80 ...점씩 필요,
// 누적 기준으로는 50, 110, 180, 260 ...). 후반으로 갈수록 레벨업이 점점 어려워짐
const LEVEL_UP_BASE_POINTS = 50;
const LEVEL_UP_STEP_POINTS = 10;
// 레벨업 1회당 틱 간격에 곱하는 배율(0.95 = 5%씩 빨라짐)
// 고정 ms를 빼는 대신 비율로 줄여야 간격이 작아진 후반에도 체감 속도 증가폭이 초반과 비슷하게 유지됨
// (같은 10ms라도 150ms에서 빼면 7% 증가지만 30ms에서 빼면 33% 증가라 후반에 확 빨라지는 것처럼 느껴졌음)
const LEVEL_SPEED_FACTOR = 0.95;
// 속도 하한선. 레벨이 계속 올라도 이 값보다 빨라지지 않음(레벨 표시 자체는 계속 증가)
const MIN_TICK_MS = 20;
// 최고 점수를 저장할 때 쓰는 localStorage 키 이름
const HIGH_SCORE_KEY = "snake-high-score";

// 퀘스트 모드에서 문구를 먹이 칸들로 표현할 때 쓰는 4x6 픽셀 폰트.
// 각 문자는 6행 x 4열 문자열 배열이며 "1"이 켜진(=먹이가 배치될) 칸을 뜻함.
const FONT = {
  " ": ["0000", "0000", "0000", "0000", "0000", "0000"],
  0: ["0110", "1001", "1001", "1001", "1001", "0110"],
  1: ["0010", "0110", "0010", "0010", "0010", "0111"],
  2: ["0110", "1001", "0001", "0010", "0100", "1111"],
  3: ["1110", "0001", "0110", "0001", "0001", "1110"],
  4: ["0011", "0101", "1001", "1111", "0001", "0001"],
  5: ["1111", "1000", "1110", "0001", "0001", "1110"],
  6: ["0110", "1000", "1110", "1001", "1001", "0110"],
  7: ["1111", "0001", "0010", "0100", "0100", "0100"],
  8: ["0110", "1001", "0110", "1001", "1001", "0110"],
  9: ["0110", "1001", "1001", "0111", "0001", "0110"],
  A: ["0110", "1001", "1001", "1111", "1001", "1001"],
  B: ["1110", "1001", "1110", "1001", "1001", "1110"],
  C: ["0111", "1000", "1000", "1000", "1000", "0111"],
  D: ["1110", "1001", "1001", "1001", "1001", "1110"],
  E: ["1111", "1000", "1110", "1000", "1000", "1111"],
  F: ["1111", "1000", "1110", "1000", "1000", "1000"],
  G: ["0111", "1000", "1000", "1011", "1001", "0111"],
  H: ["1001", "1001", "1111", "1001", "1001", "1001"],
  I: ["1110", "0100", "0100", "0100", "0100", "1110"],
  J: ["0111", "0001", "0001", "0001", "1001", "0110"],
  K: ["1001", "1010", "1100", "1100", "1010", "1001"],
  L: ["1000", "1000", "1000", "1000", "1000", "1111"],
  M: ["1001", "1111", "1001", "1001", "1001", "1001"],
  N: ["1001", "1101", "1011", "1001", "1001", "1001"],
  O: ["0110", "1001", "1001", "1001", "1001", "0110"],
  P: ["1110", "1001", "1110", "1000", "1000", "1000"],
  Q: ["0110", "1001", "1001", "1001", "1011", "0111"],
  R: ["1110", "1001", "1110", "1010", "1001", "1001"],
  S: ["0111", "1000", "0110", "0001", "0001", "1110"],
  T: ["1111", "0100", "0100", "0100", "0100", "0100"],
  U: ["1001", "1001", "1001", "1001", "1001", "0110"],
  V: ["1001", "1001", "1001", "1001", "0110", "0110"],
  W: ["1001", "1001", "1001", "1111", "1111", "1001"],
  X: ["1001", "1001", "0110", "0110", "1001", "1001"],
  Y: ["1001", "1001", "0110", "0100", "0100", "0100"],
  Z: ["1111", "0001", "0010", "0100", "1000", "1111"],
  // 다른 글자보다 넓은 6칸짜리 글리프: 맨 위 두 봉우리 -> 6칸 -> 4칸 -> 2칸으로 좁아지는 하트.
  // 너비가 짝수라 정중앙 칸이 따로 없지만, 매 줄을 가운데 기준으로 대칭으로 채워서 비대칭을 피함
  "♥": ["010010", "111111", "011110", "001100", "000000", "000000"],
};
const FONT_CHAR_W = 4; // 하트를 제외한 기본 글자 너비. 하트처럼 예외적인 글자는 glyphWidth()로 실제 폭을 따로 계산함
const FONT_CHAR_H = 6;
const FONT_GAP_X = 1;
const FONT_GAP_Y = 1;
// 하트 앞에는 보통 글자 사이 간격(FONT_GAP_X)보다 더 띄워서, 하트가 바로 앞 글자에 들러붙어
// 뭉개져 보이지 않고 독립된 장식처럼 보이게 함
const HEART_EXTRA_GAP_X = 2;
const QUEST_CHARS_PER_ROW = Math.floor((GRID_SIZE + FONT_GAP_X) / (FONT_CHAR_W + FONT_GAP_X)); // 20x20 격자에 4x6 폰트 기준 한 줄에 들어가는 글자 수 (=4)

// 화면 요소 참조 (한 번만 조회해서 재사용)
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d"); // 2D 그리기 컨텍스트
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const highScoreEl = document.getElementById("high-score");
const resetHighScoreBtn = document.getElementById("reset-highscore-btn");
const difficultySelect = document.getElementById("difficulty");
const snakeColorInput = document.getElementById("snake-color");
const modeButtons = document.querySelectorAll(".mode-btn"); // 일반/퀘스트 토글 버튼 두 개
const questSelect = document.getElementById("quest-phrase");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const pauseBtn = document.getElementById("pause-btn");
const overlay = document.getElementById("game-over-overlay"); // 게임오버/퀘스트 성공 시 보여줄 오버레이
const overlayMessage = document.getElementById("overlay-message");
const successIcon = document.getElementById("success-icon");

// 게임 상태 (좌표는 모두 격자 단위 정수: 0~19)
let snake = []; // 뱀 몸통. snake[0]이 머리, 배열 순서대로 몸통이 이어짐
let direction = { x: 1, y: 0 }; // 현재 실제로 적용 중인 이동 방향
let nextDirection = { x: 1, y: 0 }; // 키 입력으로 예약된 다음 이동 방향 (다음 tick에 반영)
let food = { x: 0, y: 0 }; // 먹이의 격자 좌표
let score = 0;
let level = 1; // 현재 레벨 (50점마다 1씩 상승)
let isPaused = false; // 일시정지 여부
let baseTickMs = DIFFICULTY_TICK_MS[DEFAULT_DIFFICULTY]; // 이번 판 시작 시 고정되는 난이도 기준 간격
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0; // 저장된 값이 없으면 0
let loopId = null; // setInterval의 타이머 id (게임 루프 제어용, 없으면 null)

// 퀘스트 모드 상태 (일반 모드에서는 계속 빈 값으로 유지됨)
let selectedMode = "normal"; // "normal" | "quest" - 모드 토글 버튼으로 현재 골라둔 값 (시작 전까지는 바뀔 수 있음)
let gameMode = "normal"; // "normal" | "quest" - 이번 판 시작 시 selectedMode를 고정해둔 값
let questCells = []; // 문구를 이루는 전체 목표 칸 (고정)
let questRemaining = []; // 아직 먹지 않은 목표 칸 = 지금 화면에 동시에 떠 있는 먹이들

highScoreEl.textContent = highScore;

// 문구 문자열을 받아 4x6 폰트 기준으로 격자에 중앙 정렬된 목표 칸 좌표 배열을 만듦.
// 띄어쓰기 단위로 줄바꿈한다(단어마다 한 줄). 한 줄에 다 못 들어갈 만큼 긴 단어만 예외적으로
// QUEST_CHARS_PER_ROW 기준으로 추가 줄바꿈. 각 줄은 그 줄의 글자 수 기준으로 가로 중앙 정렬, 전체는 세로 중앙 정렬한다.
function buildQuestCells(text) {
  const words = text.toUpperCase().split(" ").filter((word) => word.length > 0);
  const rows = [];
  words.forEach((word) => {
    const chars = word.split("").filter((char) => FONT[char]);
    for (let i = 0; i < chars.length; i += QUEST_CHARS_PER_ROW) {
      rows.push(chars.slice(i, i + QUEST_CHARS_PER_ROW));
    }
  });
  if (rows.length === 0) {
    return [];
  }

  // 글자 대부분은 FONT_CHAR_W(4칸)지만 하트처럼 그보다 넓은 글리프도 있어 실제 글리프 폭을 사용
  const glyphWidth = (char) => FONT[char][0].length;
  // 각 글자 사이 간격(하트 앞이면 더 넓게)을 더해 줄 폭을 계산
  const gapBefore = (char) => FONT_GAP_X + (char === "♥" ? HEART_EXTRA_GAP_X : 0);
  const rowWidths = rows.map((rowChars) =>
    rowChars.reduce((sum, char, i) => sum + glyphWidth(char) + (i > 0 ? gapBefore(char) : 0), 0)
  );

  const totalHeight = rows.length * FONT_CHAR_H + (rows.length - 1) * FONT_GAP_Y;
  const offsetY = Math.floor((GRID_SIZE - totalHeight) / 2);

  const cells = [];
  rows.forEach((rowChars, rowIndex) => {
    const offsetX = Math.floor((GRID_SIZE - rowWidths[rowIndex]) / 2);
    const rowY = offsetY + rowIndex * (FONT_CHAR_H + FONT_GAP_Y);

    let charX = offsetX;
    rowChars.forEach((char, charIndex) => {
      if (charIndex > 0) {
        charX += gapBefore(char);
      }
      FONT[char].forEach((bits, py) => {
        for (let px = 0; px < bits.length; px++) {
          if (bits[px] === "1") {
            cells.push({ x: charX + px, y: rowY + py });
          }
        }
      });
      charX += glyphWidth(char);
    });
  });

  return cells;
}

// targetLevel(예: 3)에 도달하는 데 필요한 누적 점수.
// 레벨업 간 필요 점수가 50, 60, 70...으로 점점 늘어나므로 등차수열 합 공식으로 계산
function pointsRequiredForLevel(targetLevel) {
  const gapCount = targetLevel - 1; // 레벨 1에서 targetLevel까지 거쳐야 할 레벨업 횟수
  return LEVEL_UP_BASE_POINTS * gapCount + (LEVEL_UP_STEP_POINTS * gapCount * (gapCount - 1)) / 2;
}

// 난이도(baseTickMs)와 레벨을 반영한 실제 틱 간격 계산 (MIN_TICK_MS 밑으로 내려가지 않음)
function effectiveTickMs() {
  return Math.max(MIN_TICK_MS, baseTickMs * Math.pow(LEVEL_SPEED_FACTOR, level - 1));
}

// 현재 effectiveTickMs() 기준으로 게임 루프를 (재)가동
// 게임 시작 시 / 레벨업으로 속도가 바뀔 때 공통으로 사용
// (setInterval은 간격을 즉석에서 바꿀 수 없어 매번 clear 후 재생성해야 함)
function restartLoop() {
  if (loopId) {
    clearInterval(loopId);
  }
  loopId = setInterval(tick, effectiveTickMs());
}

// 퀘스트 모드에서 뱀이 시작할 안전한 칸을 찾음: questCells와 안 겹치면서, 오른쪽으로 최소
// SAFE_SPAWN_RUNWAY칸은 더 이동해도 글자와 안 부딪히는 자리. 화면 왼쪽 위부터 훑어서
// 그런 조건을 만족하는 첫 칸을 찾고, 혹시 못 찾으면(글자가 화면을 거의 다 채우는 극단적 경우)
// questCells와 안 겹치는 아무 칸이나 사용
function findSafeQuestSpawn() {
  const SAFE_SPAWN_RUNWAY = 4;
  const isQuestCell = (x, y) => questCells.some((cell) => cell.x === x && cell.y === y);

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x <= GRID_SIZE - SAFE_SPAWN_RUNWAY; x++) {
      let hasRunway = true;
      for (let step = 0; step < SAFE_SPAWN_RUNWAY; step++) {
        if (isQuestCell(x + step, y)) {
          hasRunway = false;
          break;
        }
      }
      if (hasRunway) {
        return { x, y };
      }
    }
  }

  // 여기까지 왔다면 정말 극단적인 경우: 최소한 글자와 안 겹치는 칸이라도 찾음
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!isQuestCell(x, y)) {
        return { x, y };
      }
    }
  }

  return { x: 0, y: 0 }; // 그마저도 없으면(=글자가 격자 전체를 채움) 어쩔 수 없이 좌상단
}

// 뱀/점수/방향을 초기 상태로 되돌리고 새 먹이를 배치
// (start/restart 버튼을 누를 때마다 호출되어 이전 게임 상태를 완전히 리셋함)
function resetState() {
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  level = 1;
  isPaused = false;
  scoreEl.textContent = score;
  levelEl.textContent = level;

  // 퀘스트 모드면 문구 전체 모양을 이루는 칸들을 한꺼번에 먹이로 배치, 일반 모드면 비워둠
  if (gameMode === "quest") {
    questCells = buildQuestCells(questSelect.value);
    questRemaining = [...questCells];
    // 기존엔 뱀이 항상 격자 정중앙(8,10)에서 시작했는데, 이 좌표가 글자 배치 영역(세로 중앙)과 겹쳐서
    // "MISS YOU"처럼 글자가 빽빽한 문구는 시작하자마자 글자 한복판에서 출발해 방향을 바꿀 여유가 없었다.
    // (실제로는 방향키가 안 먹힌 게 아니라 반응할 시간이 없었던 것) 퀘스트 모드는 글자와 안 겹치는
    // 빈 칸에서 시작하도록 별도로 자리를 찾는다.
    snake = [findSafeQuestSpawn()];
  } else {
    // 뱀은 머리 한 칸으로 시작, 가로 방향(오른쪽)을 향함
    snake = [{ x: 8, y: 10 }];
    questCells = [];
    questRemaining = [];
    placeFood(); // 일반 모드만 무작위 먹이 하나를 배치 (퀘스트 모드는 questRemaining 자체가 먹이 목록)
  }
}

// 뱀의 몸과 겹치지 않는 위치에 먹이를 랜덤 배치 (일반 모드 전용)
// do-while로 몸통과 겹치는 좌표가 나오면 계속 다시 뽑음
function placeFood() {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((segment) => segment.x === position.x && segment.y === position.y));
  food = position;
}

// 현재 상태(뱀, 먹이)를 캔버스에 그림
// 매 프레임마다 배경을 통째로 덮어 그린 뒤 먹이 -> 뱀 순서로 그림 (뒤에 그릴수록 위에 보임)
function draw() {
  // 배경(검정)으로 캔버스 전체를 초기화 - 레트로 아케이드 느낌
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameMode === "quest") {
    // 아직 안 먹은 칸(=지금 동시에 떠 있는 먹이들)만 네온 핑크로 표시. 먹으면 questRemaining에서 빠져 그냥 사라짐
    ctx.fillStyle = "#ff2e63";
    questRemaining.forEach((cell) => {
      ctx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
    });
  } else {
    // 먹이는 네온 핑크 사각형 한 칸
    ctx.fillStyle = "#ff2e63";
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }

  // 뱀 색상은 사용자가 선택한 값을 사용. -1px 여백을 줘서 칸 사이에 격자선처럼 틈이 보이게 함
  ctx.fillStyle = snakeColorInput.value;
  snake.forEach((segment) => {
    ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
  });
}

// 한 프레임 진행: 이동 -> 충돌 판정 -> 먹이 처리 -> 그리기
// setInterval(effectiveTickMs())에 의해 주기적으로 호출됨
function tick() {
  if (isPaused) {
    return; // 일시정지 중에는 이동/충돌 판정 없이 상태만 보존
  }

  // 키 입력으로 예약해둔 방향을 이번 프레임의 실제 이동 방향으로 확정
  direction = nextDirection;

  // 현재 머리 좌표에 방향을 더해 새 머리 위치를 계산
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  // 새 머리가 격자 바깥으로 나갔는지 (벽 충돌)
  const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
  // 새 머리가 기존 몸통 칸과 겹치는지 (자기 몸 충돌)
  const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);

  if (hitWall || hitSelf) {
    endGame();
    return; // 충돌 시 더 이상 진행하지 않고 이번 tick을 종료
  }

  // 새 머리를 배열 맨 앞에 추가해 뱀을 한 칸 전진시킴
  snake.unshift(head);

  // 퀘스트 모드는 화면에 동시에 떠 있는 questRemaining 칸 중 아무 곳이나 먹으면 됨.
  // 일반 모드는 기존처럼 단일 food 좌표만 확인
  const questHitIndex =
    gameMode === "quest" ? questRemaining.findIndex((cell) => cell.x === head.x && cell.y === head.y) : -1;
  const ateFood = gameMode === "quest" ? questHitIndex !== -1 : head.x === food.x && head.y === food.y;

  if (ateFood) {
    // 먹이를 먹었으면 점수 올림 (일반 모드는 꼬리를 안 잘라 몸 길이가 1 늘어남)
    score += 10;
    scoreEl.textContent = score;

    if (gameMode === "quest") {
      // 먹은 칸은 목록에서 제거해 화면에서 사라지게 함. 퀘스트 모드는 몸 길이가 늘어나지 않도록 꼬리도 자름
      questRemaining.splice(questHitIndex, 1);
      snake.pop();
    }

    // 다음 레벨업에 필요한 누적 점수를 넘었는지 확인 (레벨업 간 필요 점수가 점점 늘어나므로 while로 확인)
    let leveledUp = false;
    while (score >= pointsRequiredForLevel(level + 1)) {
      level += 1;
      leveledUp = true;
    }
    if (leveledUp) {
      levelEl.textContent = level;
      restartLoop(); // 더 빨라진 간격으로 루프 재가동 (일시정지 여부와 무관하게 안전)
    }

    if (gameMode === "quest") {
      if (questRemaining.length === 0) {
        // 문구의 모든 칸을 다 먹었으면 마지막 프레임을 그리고 성공 처리
        draw();
        finishQuest();
        return;
      }
    } else {
      placeFood(); // 일반 모드만 다음 무작위 먹이를 새로 배치
    }
  } else {
    // 먹지 않았으면 꼬리를 제거해 길이를 유지 (앞에 추가 + 뒤 제거 = 이동한 것처럼 보임)
    snake.pop();
  }

  draw();
}

// 게임을 시작 상태로 초기화하고 루프를 가동
// start 버튼과 restart 버튼 모두 이 함수를 호출함
function startGame() {
  // 난이도 select 값을 이번 판의 기준 속도로 고정 (게임 중 select를 바꿔도 이번 판엔 미반영)
  baseTickMs = DIFFICULTY_TICK_MS[difficultySelect.value] || DIFFICULTY_TICK_MS[DEFAULT_DIFFICULTY];
  gameMode = selectedMode; // 모드도 이번 판 기준으로 고정
  resetState();
  overlay.classList.add("hidden"); // 게임오버/퀘스트 성공 화면 숨기기
  startBtn.classList.add("hidden"); // 시작 버튼은 한 번만 보이도록 숨기기

  pauseBtn.classList.remove("hidden");
  pauseBtn.textContent = "일시정지";
  // 게임 중엔 바꿔도 반영되지 않으므로 모드/문구/난이도를 비활성화
  difficultySelect.disabled = true;
  modeButtons.forEach((btn) => {
    btn.disabled = true;
  });
  questSelect.disabled = true;

  draw();
  restartLoop();
}

// 게임 종료(충돌/퀘스트 성공) 공통 처리: 루프 정지, 최고 점수 갱신, 컨트롤 재활성화
function stopGame() {
  clearInterval(loopId);
  loopId = null;
  isPaused = false; // 다음 판을 위해 일시정지 상태 초기화

  // 이번 판 점수가 기존 최고 점수를 넘었으면 갱신하고 localStorage에 영구 저장
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    highScoreEl.textContent = highScore;
  }

  pauseBtn.classList.add("hidden");
  // 다음 판 시작 전에 모드/난이도를 다시 고를 수 있게 함. 문구는 퀘스트 모드일 때만 활성화
  difficultySelect.disabled = false;
  modeButtons.forEach((btn) => {
    btn.disabled = false;
  });
  questSelect.disabled = selectedMode !== "quest";
}

// 충돌 발생 시 루프를 멈추고 "게임 오버" 오버레이 표시
function endGame() {
  stopGame();
  overlayMessage.textContent = "게임 오버";
  overlay.classList.remove("overlay-success");
  successIcon.classList.add("hidden");
  overlay.classList.remove("hidden");
}

// 퀘스트의 모든 목표 칸을 다 먹었을 때 루프를 멈추고 "퀘스트 성공" 오버레이 표시
function finishQuest() {
  stopGame();
  overlayMessage.textContent = "퀘스트 성공! 🎉";
  overlay.classList.add("overlay-success");
  successIcon.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

// 일시정지/재개 토글. setInterval 자체는 건드리지 않고 tick()의 isPaused 플래그만
// 뒤집는다 -- 뱀 위치, 방향, 점수, 레벨 등 모든 상태가 그대로 보존됨
function togglePause() {
  if (!loopId) {
    return; // 시작 전/게임오버 중에는 무시
  }
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "계속하기" : "일시정지";
}

// 방향키 입력을 다음 방향으로 반영 (역방향 즉시 전환은 무시해 자기 몸과의 즉사를 방지)
// 예: 오른쪽으로 가고 있을 때 왼쪽 키를 눌러도 무시됨 (머리가 바로 다음 몸통 칸으로 들어가 즉사하는 것을 막음)
window.addEventListener("keydown", (event) => {
  const keyToDirection = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  const requested = keyToDirection[event.key];
  if (!requested) {
    return; // 방향키가 아니면 무시
  }

  // 방향키의 브라우저 기본 동작(페이지 스크롤)을 막음.
  // 이걸 안 하면 방향키를 누를 때마다 뱀 조작과 별개로 화면 전체가 위아래/좌우로 스크롤되며 흔들려 보임
  event.preventDefault();

  // 현재 진행 방향의 정반대인지 확인 (x, y 부호가 둘 다 반대)
  const isOpposite = requested.x === -direction.x && requested.y === -direction.y;
  if (!isOpposite) {
    // 다음 tick에서 반영될 방향만 갱신 (direction은 tick()에서 확정됨)
    nextDirection = requested;
  }
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

// 색상 선택은 게임 로직과 무관한 표시 설정이라 즉시 다시 그려서 반영
// (일시정지 중이거나 게임오버 상태라 tick()이 돌지 않을 때도 눈에 보이게 하기 위함)
snakeColorInput.addEventListener("input", () => {
  if (snake.length > 0) {
    draw();
  }
});

// 모드 토글 버튼: 클릭한 쪽을 선택 상태로 표시하고, 문구 드롭다운은 퀘스트를 골랐을 때만 활성화
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedMode = btn.dataset.mode;
    modeButtons.forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
    questSelect.disabled = selectedMode !== "quest";
  });
});

// 최고 점수 초기화: localStorage에 영구 저장된 값이라 실수로 지우는 걸 막기 위해 확인창을 거침
resetHighScoreBtn.addEventListener("click", () => {
  if (!window.confirm("최고 점수를 초기화할까요?")) {
    return;
  }
  highScore = 0;
  localStorage.removeItem(HIGH_SCORE_KEY);
  highScoreEl.textContent = highScore;
});
