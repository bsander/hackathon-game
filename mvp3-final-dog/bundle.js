(() => {
  // mvp3-final-dog/js/constants.js
  var PRESSURE_THRESHOLD = 30;
  var DIRECTION_MIN = -10;
  var DIRECTION_MAX = 10;
  var COOLDOWN_MS = 500;
  var REACTION_WINDOW_MS = 800;
  var START_HEALTH = 3;
  var COUNTDOWN_SECS = 3;
  var PAUSE_BETWEEN_ROUNDS_MS = 2e3;
  var MAX_BREW_STACKS = 2;
  var INGREDIENTS = {
    fireball: { pressure: 3, direction: 3, emoji: "\u{1F525}", label: "Fireball" },
    shield: { pressure: -1, direction: 0, emoji: "\u{1F6E1}", label: "Shield" },
    hex: { pressure: 2, direction: "reverse", emoji: "\u{1F480}", label: "Hex" },
    brew: { pressure: 1, direction: 0, emoji: "\u2728", label: "Brew" }
  };
  var INGREDIENT_ORDER = ["fireball", "shield", "hex", "brew"];
  var P1_KEYS = ["1", "2", "3", "4"];
  var P2_KEYS = ["7", "8", "9", "0"];
  function ingredientForKey(key) {
    let idx = P1_KEYS.indexOf(key);
    if (idx !== -1) return { player: 1, ingredient: INGREDIENT_ORDER[idx] };
    idx = P2_KEYS.indexOf(key);
    if (idx !== -1) return { player: 2, ingredient: INGREDIENT_ORDER[idx] };
    return null;
  }
  var REACTIONS = {
    "fireball+fireball": "clash",
    "fireball+hex": "deflect",
    "fireball+shield": "counter",
    "brew+brew": "cancel",
    "hex+hex": "chaos",
    "shield+shield": "stall"
  };
  function lookupReaction(ingredientA, ingredientB) {
    const key = [ingredientA, ingredientB].sort().join("+");
    return REACTIONS[key] || null;
  }

  // mvp3-final-dog/js/ingredients.js
  function clampDirection(d) {
    return Math.max(DIRECTION_MIN, Math.min(DIRECTION_MAX, d));
  }
  function clampPressure(p) {
    return Math.max(0, p);
  }
  function directionSign(player) {
    return player === 1 ? 1 : -1;
  }
  function freshRoundState() {
    return {
      pressure: 0,
      direction: 0,
      brewStacks: { 1: 0, 2: 0 }
    };
  }
  function applyIngredient(state, player, ingredientName) {
    const def = INGREDIENTS[ingredientName];
    if (!def) return state;
    let { pressure, direction, brewStacks } = state;
    const newBrewStacks = { ...brewStacks };
    const multiplier = ingredientName !== "brew" ? 1 + brewStacks[player] : 1;
    if (ingredientName === "brew") {
      newBrewStacks[player] = Math.min(MAX_BREW_STACKS, brewStacks[player] + 1);
      pressure += def.pressure;
    } else if (ingredientName === "hex") {
      direction = -direction + (Math.random() < 0.5 ? 1 : -1);
      pressure += def.pressure;
      newBrewStacks[player] = 0;
    } else {
      pressure += def.pressure;
      direction += def.direction * directionSign(player) * multiplier;
      newBrewStacks[player] = 0;
    }
    return {
      pressure: clampPressure(pressure),
      direction: clampDirection(direction),
      brewStacks: newBrewStacks
    };
  }
  function checkReaction(pressA, pressB) {
    if (!pressA || !pressB) return null;
    if (Math.abs(pressA.time - pressB.time) > REACTION_WINDOW_MS) return null;
    return lookupReaction(pressA.ingredient, pressB.ingredient);
  }
  function applyReaction(state, reactionName, triggerPlayer) {
    let { pressure, direction, brewStacks } = state;
    const newBrewStacks = { ...brewStacks };
    switch (reactionName) {
      case "counter":
        direction -= 3 * directionSign(triggerPlayer === 1 ? 2 : 1);
        break;
      case "clash":
        direction = 0;
        break;
      case "deflect":
        {
          const fireballPlayer = triggerPlayer;
          const fireballDir = 3 * directionSign(fireballPlayer);
          direction -= 2 * fireballDir;
        }
        break;
      case "stall":
        break;
      case "chaos":
        direction = Math.floor(Math.random() * (DIRECTION_MAX - DIRECTION_MIN + 1)) + DIRECTION_MIN;
        break;
      case "cancel":
        newBrewStacks[1] = 0;
        newBrewStacks[2] = 0;
        break;
    }
    return {
      pressure: clampPressure(pressure),
      direction: clampDirection(direction),
      brewStacks: newBrewStacks
    };
  }
  function checkExplosion(state) {
    if (state.pressure < PRESSURE_THRESHOLD) {
      return { exploded: false, loser: null };
    }
    let loser;
    if (state.direction > 0) loser = 2;
    else if (state.direction < 0) loser = 1;
    else loser = Math.random() < 0.5 ? 1 : 2;
    return { exploded: true, loser };
  }

  // mvp3-final-dog/js/game.js
  var gameState = "IDLE";
  var health = { 1: START_HEALTH, 2: START_HEALTH };
  var round = 1;
  var cauldron = freshRoundState();
  var lastPress = { 1: null, 2: null };
  var cooldownUntil = { 1: 0, 2: 0 };
  var countdownRemaining = 0;
  var countdownTimer = null;
  var reactionTimeout = null;
  var $ = (id) => document.getElementById(id);
  var $game = $("game");
  var $roundLabel = $("round-label");
  var $overlay = $("overlay");
  var $overlayText = $("overlay-text");
  var $overlaySub = $("overlay-sub");
  var $directionFill = $("direction-fill");
  var $directionMarker = $("direction-marker");
  var $pressureFill = $("pressure-fill");
  var $cauldron = $("cauldron");
  var $cauldronEmoji = $("cauldron-emoji");
  var $reactionLabel = $("reaction-label");
  var $p1Brew = $("p1-brew");
  var $p2Brew = $("p2-brew");
  function renderPips() {
    for (let p = 1; p <= 2; p++) {
      const prefix = p === 1 ? "p1" : "p2";
      for (let i = 0; i < START_HEALTH; i++) {
        const pip = $(`${prefix}-pip-${i}`);
        if (i < health[p]) {
          pip.classList.remove("lost");
          pip.textContent = "\u2665";
        } else {
          pip.classList.add("lost");
          pip.textContent = "\u2661";
        }
      }
    }
  }
  function renderDirection() {
    const dir = cauldron.direction;
    const pct = (dir + 10) / 20 * 100;
    $directionMarker.style.left = `${pct}%`;
    $directionFill.className = "";
    if (dir < 0) {
      $directionFill.classList.add("p1-danger");
      $directionFill.style.width = `${Math.abs(dir) / 10 * 50}%`;
      $directionFill.style.right = "";
      $directionFill.style.left = "0";
    } else if (dir > 0) {
      $directionFill.classList.add("p2-danger");
      $directionFill.style.width = `${dir / 10 * 50}%`;
      $directionFill.style.left = "";
      $directionFill.style.right = "0";
    } else {
      $directionFill.style.width = "0%";
    }
  }
  function renderPressure() {
    const pct = Math.min(100, cauldron.pressure / PRESSURE_THRESHOLD * 100);
    $pressureFill.style.width = `${pct}%`;
    $cauldron.classList.remove("hot", "critical");
    if (pct >= 80) $cauldron.classList.add("critical");
    else if (pct >= 50) $cauldron.classList.add("hot");
    if (pct >= 80) $cauldronEmoji.textContent = "\u{1F4A5}";
    else if (pct >= 50) $cauldronEmoji.textContent = "\u{1F525}";
    else if (pct >= 20) $cauldronEmoji.textContent = "\u{1FAE7}";
    else $cauldronEmoji.textContent = "\u{1FA84}";
  }
  function renderBrew() {
    $p1Brew.className = "brew-indicator";
    $p2Brew.className = "brew-indicator";
    if (cauldron.brewStacks[1] >= 2) $p1Brew.classList.add("glow-2");
    else if (cauldron.brewStacks[1] === 1) $p1Brew.classList.add("glow-1");
    if (cauldron.brewStacks[2] >= 2) $p2Brew.classList.add("glow-2");
    else if (cauldron.brewStacks[2] === 1) $p2Brew.classList.add("glow-1");
  }
  function renderAll() {
    renderPips();
    renderDirection();
    renderPressure();
    renderBrew();
    $roundLabel.textContent = `ROUND ${round}`;
  }
  function showReaction(name) {
    const labels = {
      counter: "COUNTERED!",
      clash: "CLASH!",
      deflect: "DEFLECTED!",
      stall: "STALL!",
      chaos: "CHAOS!",
      cancel: "CANCELLED!"
    };
    $reactionLabel.textContent = labels[name] || name.toUpperCase();
    $reactionLabel.classList.remove("visible");
    void $reactionLabel.offsetWidth;
    $reactionLabel.classList.add("visible");
    clearTimeout(reactionTimeout);
    reactionTimeout = setTimeout(() => {
      $reactionLabel.classList.remove("visible");
    }, 1e3);
  }
  function flashKeyRow(key) {
    const row = document.querySelector(`.key-row[data-key="${key}"]`);
    if (!row) return;
    row.classList.add("pressed");
    setTimeout(() => row.classList.remove("pressed"), 150);
  }
  function showOverlay(text, sub) {
    $overlayText.textContent = text;
    $overlaySub.textContent = sub || "";
    $overlay.classList.remove("hidden");
  }
  function hideOverlay() {
    $overlay.classList.add("hidden");
  }
  function enterState(newState) {
    gameState = newState;
    switch (newState) {
      case "IDLE":
        showOverlay("CAULDRON TUG-OF-WAR", "Press any key to start");
        renderAll();
        break;
      case "COUNTDOWN":
        hideOverlay();
        cauldron = freshRoundState();
        lastPress = { 1: null, 2: null };
        countdownRemaining = COUNTDOWN_SECS;
        renderAll();
        showOverlay(String(countdownRemaining), "");
        countdownTimer = setInterval(() => {
          countdownRemaining--;
          if (countdownRemaining > 0) {
            showOverlay(String(countdownRemaining), "");
          } else {
            clearInterval(countdownTimer);
            enterState("ROUND_ACTIVE");
          }
        }, 1e3);
        break;
      case "ROUND_ACTIVE":
        hideOverlay();
        renderAll();
        break;
      case "EXPLODING": {
        const result = checkExplosion(cauldron);
        if (!result.exploded) {
          enterState("ROUND_ACTIVE");
          return;
        }
        $game.classList.add("exploding");
        health[result.loser]--;
        const loserLabel = `P${result.loser}`;
        const pipIdx = health[result.loser];
        const pipEl = $(`p${result.loser}-pip-${pipIdx}`);
        if (pipEl) pipEl.classList.add("shatter");
        renderPips();
        showOverlay("BOOM!", `${loserLabel} takes damage!`);
        setTimeout(() => {
          $game.classList.remove("exploding");
          if (pipEl) pipEl.classList.remove("shatter");
          if (health[result.loser] <= 0) {
            const winner = result.loser === 1 ? 2 : 1;
            enterState("GAME_OVER");
            showOverlay(`P${winner} WINS!`, "Press any key to play again");
          } else {
            enterState("ROUND_PAUSE");
          }
        }, PAUSE_BETWEEN_ROUNDS_MS);
        break;
      }
      case "ROUND_PAUSE":
        round++;
        setTimeout(() => {
          enterState("COUNTDOWN");
        }, 500);
        break;
      case "GAME_OVER":
        break;
    }
  }
  document.addEventListener("keydown", (e) => {
    if (gameState === "IDLE" || gameState === "GAME_OVER") {
      health = { 1: START_HEALTH, 2: START_HEALTH };
      round = 1;
      enterState("COUNTDOWN");
      return;
    }
    if (gameState !== "ROUND_ACTIVE") return;
    const mapping = ingredientForKey(e.key);
    if (!mapping) return;
    const { player, ingredient } = mapping;
    const now = performance.now();
    if (now < cooldownUntil[player]) return;
    cooldownUntil[player] = now + COOLDOWN_MS;
    flashKeyRow(e.key);
    cauldron = applyIngredient(cauldron, player, ingredient);
    const otherPlayer = player === 1 ? 2 : 1;
    const thisPress = { ingredient, time: now };
    const reaction = checkReaction(lastPress[otherPlayer], thisPress);
    if (reaction) {
      cauldron = applyReaction(cauldron, reaction, player);
      showReaction(reaction);
      lastPress[1] = null;
      lastPress[2] = null;
    } else {
      lastPress[player] = thisPress;
    }
    renderAll();
    const explosion = checkExplosion(cauldron);
    if (explosion.exploded) {
      enterState("EXPLODING");
    }
  });
  enterState("IDLE");
})();
