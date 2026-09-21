// 격자 설정: 400x400 캔버스를 20x20 칸으로 나눔 (셀 하나 = 20px)
const GRID_SIZE = 20;
const CELL_SIZE = 400 / GRID_SIZE;
// 난이도별 시작 틱 간격(ms). select의 value와 그대로 매칭됨
const DIFFICULTY_TICK_MS = { easy: 200, normal: 150, hard: 100, veryhard: 50 };
const DEFAULT_DIFFICULTY = "normal";
// 레벨업에 필요한 점수 단위 / 레벨업 1회당 틱 간격을 줄이는 양(ms)
const POINTS_PER_LEVEL = 50;
const LEVEL_SPEED_STEP_MS = 10;
// 속도 하한선. 레벨이 계속 올라도 이 값보다 빨라지지 않음(레벨 표시 자체는 계속 증가)
const MIN_TICK_MS = 20;
// 최고 점수를 저장할 때 쓰는 localStorage 키 이름
const HIGH_SCORE_KEY = "snake-high-score";

// 화면 요소 참조 (한 번만 조회해서 재사용)
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d"); // 2D 그리기 컨텍스트
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const highScoreEl = document.getElementById("high-score");
const difficultySelect = document.getElementById("difficulty");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const pauseBtn = document.getElementById("pause-btn");
const overlay = document.getElementById("game-over-overlay"); // 게임오버 시 보여줄 오버레이

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

highScoreEl.textContent = highScore;

// 난이도(baseTickMs)와 레벨을 반영한 실제 틱 간격 계산 (MIN_TICK_MS 밑으로 내려가지 않음)
function effectiveTickMs() {
  return Math.max(MIN_TICK_MS, baseTickMs - (level - 1) * LEVEL_SPEED_STEP_MS);
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

// 뱀/점수/방향을 초기 상태로 되돌리고 새 먹이를 배치
// (start/restart 버튼을 누를 때마다 호출되어 이전 게임 상태를 완전히 리셋함)
function resetState() {
  // 뱀은 3칸짜리 몸으로 시작, 가로 방향(오른쪽)을 향함
  snake = [
    { x: 8, y: 10 }, // 머리
    { x: 7, y: 10 },
    { x: 6, y: 10 }, // 꼬리
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  level = 1;
  isPaused = false;
  scoreEl.textContent = score;
  levelEl.textContent = level;
  placeFood();
}

// 뱀의 몸과 겹치지 않는 위치에 먹이를 랜덤 배치
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
  // 배경(어두운 남색)으로 캔버스 전체를 초기화
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 먹이는 빨간 사각형 한 칸
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

  // 뱀은 초록 사각형들. -1px 여백을 줘서 칸 사이에 격자선처럼 틈이 보이게 함
  ctx.fillStyle = "#4ade80";
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

  const ateFood = head.x === food.x && head.y === food.y;
  if (ateFood) {
    // 먹이를 먹었으면 점수 올리고 새 먹이를 배치 (꼬리를 자르지 않아 몸 길이가 1 늘어남)
    score += 10;
    scoreEl.textContent = score;
    placeFood();

    // score는 항상 10 단위로 증가하고 POINTS_PER_LEVEL(50)은 10의 배수라 한 번에
    // 두 레벨을 건너뛸 일은 없지만, 절대 점수 기준으로 계산해 항상 안전하게 처리
    const targetLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
    if (targetLevel > level) {
      level = targetLevel;
      levelEl.textContent = level;
      restartLoop(); // 더 빨라진 간격으로 루프 재가동 (일시정지 여부와 무관하게 안전)
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
  resetState();
  overlay.classList.add("hidden"); // 게임오버 화면 숨기기
  startBtn.classList.add("hidden"); // 시작 버튼은 한 번만 보이도록 숨기기

  pauseBtn.classList.remove("hidden");
  pauseBtn.textContent = "일시정지";
  difficultySelect.disabled = true; // 게임 중엔 난이도를 바꿔도 반영되지 않으므로 비활성화

  draw();
  restartLoop();
}

// 충돌 발생 시 루프를 멈추고 최고 점수 갱신 후 오버레이 표시
function endGame() {
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
  difficultySelect.disabled = false; // 다음 판 시작 전에 난이도를 다시 고를 수 있게 함
  overlay.classList.remove("hidden"); // 게임오버 오버레이(재시작 버튼 포함) 표시
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
