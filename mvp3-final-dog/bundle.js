(() => {
  // mvp3-final-dog/js/constants.js
  var PRESSURE_THRESHOLD = 30;
  var DIRECTION_MIN = -10;
  var DIRECTION_MAX = 10;
  var COOLDOWN_MS = 100;
  var FIREBALL_COOLDOWN_MS = 250;
  var REACTION_WINDOW_MS = 800;
  var START_HEALTH = 3;
  var COUNTDOWN_SECS = 3;
  var PAUSE_BETWEEN_ROUNDS_MS = 2e3;
  var MAX_BREW_STACKS = 2;
  var INGREDIENTS = {
    scald: { pressure: 3, direction: 3, emoji: "\u{1F525}", label: "Scald" },
    cool: { pressure: -1, direction: 0, emoji: "\u{1F9CA}", label: "Cool" },
    swirl: { pressure: 2, direction: "reverse", emoji: "\u{1F300}", label: "Swirl" },
    boost: { pressure: 1, direction: 0, emoji: "\u2728", label: "Boost" }
  };
  var INGREDIENT_ORDER = ["scald", "cool", "swirl", "boost"];
  var P1_KEYS = ["1", "2", "3", "4"];
  var P2_KEYS = ["7", "8", "9", "0"];
  var ALL_KEYS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
  var KEYS_PER_PLAYER = 4;
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function getRandomKeyBinding() {
    const shuffled = shuffleArray(ALL_KEYS);
    return {
      p1: shuffled.slice(0, KEYS_PER_PLAYER),
      p2: shuffled.slice(KEYS_PER_PLAYER, KEYS_PER_PLAYER * 2)
    };
  }
  function randomizeOneKey(keyBindings, player, ingredientIndex) {
    const updated = {
      p1: [...keyBindings.p1],
      p2: [...keyBindings.p2]
    };
    const opponent = player === 1 ? 2 : 1;
    const opponentKeys = opponent === 1 ? updated.p1 : updated.p2;
    let newKey;
    let attempts = 0;
    const maxAttempts = 100;
    do {
      newKey = ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)];
      attempts++;
    } while (opponentKeys.includes(newKey) && attempts < maxAttempts);
    const playerKeys = player === 1 ? updated.p1 : updated.p2;
    playerKeys[ingredientIndex] = newKey;
    return updated;
  }
  function ingredientForKey(key, keyBindings) {
    const bindings = keyBindings || { p1: P1_KEYS, p2: P2_KEYS };
    let idx = bindings.p1.indexOf(key);
    if (idx !== -1) return { player: 1, ingredient: INGREDIENT_ORDER[idx] };
    idx = bindings.p2.indexOf(key);
    if (idx !== -1) return { player: 2, ingredient: INGREDIENT_ORDER[idx] };
    return null;
  }
  var REACTIONS = {
    "boost+boost": "cancel",
    "cool+cool": "stall",
    "cool+scald": "counter",
    "scald+scald": "clash",
    "scald+swirl": "deflect",
    "swirl+swirl": "chaos"
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
    const multiplier = ingredientName !== "boost" ? 1 + brewStacks[player] : 1;
    if (ingredientName === "boost") {
      newBrewStacks[player] = Math.min(MAX_BREW_STACKS, brewStacks[player] + 1);
      pressure += def.pressure;
    } else if (ingredientName === "swirl") {
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
          const scaldPlayer = triggerPlayer;
          const scaldDir = 3 * directionSign(scaldPlayer);
          direction -= 2 * scaldDir;
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
  var onboardingScreen = 1;
  var currentKeyBindings = getRandomKeyBinding();
  var $ = (id) => document.getElementById(id);
  var $game = $("game");
  var $roundLabel = $("round-label");
  var $overlay = $("overlay");
  var $overlayText = $("overlay-text");
  var $overlaySub = $("overlay-sub");
  var $pressureFill = $("pressure-fill");
  var $cauldron = $("cauldron");
  var $cauldronEmoji = $("cauldron-emoji");
  var $cauldronArrow = $("cauldron-arrow");
  var $reactionLabel = $("reaction-label");
  var $p1Brew = $("p1-brew");
  var $p2Brew = $("p2-brew");
  var $hintBanner = $("hint-banner");
  var $centre = $("centre");
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
    if (dir < 0) {
      $cauldronArrow.textContent = "\u2190";
      $cauldronArrow.className = "arrow-active arrow-p1";
    } else if (dir > 0) {
      $cauldronArrow.textContent = "\u2192";
      $cauldronArrow.className = "arrow-active arrow-p2";
    } else {
      $cauldronArrow.textContent = "\u2696";
      $cauldronArrow.className = "arrow-active arrow-neutral";
    }
    const dangerThreshold = 7;
    for (let p = 1; p <= 2; p++) {
      for (let i = 0; i < START_HEALTH; i++) {
        const pip = $(`p${p}-pip-${i}`);
        const inDanger = p === 1 && dir <= -dangerThreshold || p === 2 && dir >= dangerThreshold;
        pip.classList.toggle("danger", inDanger);
      }
    }
  }
  function renderPressure() {
    const pct = Math.min(100, cauldron.pressure / PRESSURE_THRESHOLD * 100);
    $pressureFill.style.width = `${pct}%`;
    $cauldron.classList.remove("hot", "critical");
    if (pct >= 80) $cauldron.classList.add("critical");
    else if (pct >= 50) $cauldron.classList.add("hot");
    $cauldronEmoji.classList.remove("cauldron-state-1", "cauldron-state-2", "cauldron-state-4");
    if (pct < 20) $cauldronEmoji.classList.add("cauldron-state-1");
    else $cauldronEmoji.classList.add("cauldron-state-2");
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
      counter: "COUNTERED! \u2014 direction negated",
      clash: "CLASH! \u2014 directions cancel, +6 pressure",
      deflect: "DEFLECTED! \u2014 scald reversed at caster",
      stall: "STALL! \u2014 pressure reduced",
      chaos: "CHAOS! \u2014 direction randomised",
      cancel: "CANCELLED! \u2014 brew stacks reset"
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
  function updateKeyRowsDisplay() {
    for (let player = 1; player <= 2; player++) {
      const keys = player === 1 ? currentKeyBindings.p1 : currentKeyBindings.p2;
      const prefix = player === 1 ? "p1" : "p2";
      const controlsEl = $(`${prefix}-controls`);
      const rows = controlsEl.querySelectorAll(".key-row");
      for (let i = 0; i < INGREDIENT_ORDER.length && i < rows.length; i++) {
        const key = keys[i];
        const row = rows[i];
        const keyEl = row.querySelector(".key");
        if (keyEl) keyEl.textContent = key;
        row.dataset.key = key;
      }
    }
  }
  function flashKeyRow(key) {
    const row = document.querySelector(`.key-row[data-key="${key}"]`);
    if (!row) return;
    row.classList.add("pressed");
    setTimeout(() => row.classList.remove("pressed"), 150);
  }
  function getDeltaText(ingredient, player) {
    const arrow = player === 1 ? "\u2192" : "\u2190";
    switch (ingredient) {
      case "scald":
        return `+3 pressure, direction ${arrow}`;
      case "cool":
        return "\u22121 pressure";
      case "swirl":
        return "direction reversed!";
      case "boost":
        return "+1 brew charge";
      default:
        return null;
    }
  }
  var activeLabel = { 1: null, 2: null };
  function spawnFloatingLabel(ingredient, player) {
    if (activeLabel[player]) {
      activeLabel[player].remove();
      activeLabel[player] = null;
    }
    const text = getDeltaText(ingredient, player);
    if (!text) return;
    const el = document.createElement("div");
    el.className = `floating-delta p${player}-delta`;
    el.textContent = text;
    $centre.appendChild(el);
    activeLabel[player] = el;
    el.addEventListener("animationend", () => {
      el.remove();
      if (activeLabel[player] === el) activeLabel[player] = null;
    });
  }
  function showOverlay(text, sub) {
    $overlayText.textContent = text;
    $overlaySub.textContent = sub || "";
    $overlay.classList.remove("hidden");
  }
  function hideOverlay() {
    $overlay.classList.add("hidden");
  }
  function showOnboarding() {
    if (onboardingScreen === 1) {
      $overlayText.innerHTML = "CHAOS BREWING";
      $overlaySub.innerHTML = [
        '<div class="onboarding">',
        '<p class="onboarding-concept">Two brewers. One cauldron. Toss ingredients to build pressure \u2014 when it blows, the <strong>arrow</strong> decides who takes the blast.</p>',
        '<p class="onboarding-concept">Push the explosion toward your opponent. Reverse it when it points at you.</p>',
        '<div class="onboarding-ingredients">',
        "<span>\u{1F525} <strong>Scald</strong> \u2014 big pressure push, slow recharge</span>",
        "<span>\u{1F9CA} <strong>Cool</strong> \u2014 reduces pressure</span>",
        "<span>\u{1F300} <strong>Swirl</strong> \u2014 reverses the arrow</span>",
        "<span>\u2728 <strong>Boost</strong> \u2014 charges your next spell</span>",
        "</div>",
        '<p class="onboarding-concept onboarding-tip">What happens also depends on what your opponent throws in \u2014 expect some mayhem!</p>',
        '<p class="onboarding-concept onboarding-hint">Keys are shown on screen and shuffle after each press.</p>',
        '<p class="onboarding-start">Press SPACE to continue</p>',
        "</div>"
      ].join("");
    } else if (onboardingScreen === 2) {
      $overlayText.innerHTML = "THE TWIST";
      $overlaySub.innerHTML = [
        '<div class="onboarding">',
        '<p class="onboarding-concept">Keys shift every time you press! Find your next key before acting.</p>',
        '<p class="onboarding-available-title">Available keys:</p>',
        '<div class="onboarding-keyboard">',
        '<div class="kb-row">',
        "1234567890".split("").map((k) => `<span class="onboarding-key-item">${k}</span>`).join(""),
        "</div>",
        '<div class="kb-row kb-row-offset-1">',
        "qwertyuiop".split("").map((k) => `<span class="onboarding-key-item">${k}</span>`).join(""),
        "</div>",
        '<div class="kb-row kb-row-offset-2">',
        "asdfghjkl".split("").map((k) => `<span class="onboarding-key-item">${k}</span>`).join(""),
        "</div>",
        '<div class="kb-row kb-row-offset-3">',
        "zxcvbnm".split("").map((k) => `<span class="onboarding-key-item">${k}</span>`).join(""),
        "</div>",
        "</div>",
        '<p class="onboarding-start">Press SPACE to start</p>',
        "</div>"
      ].join("");
    }
    $overlay.classList.remove("hidden");
  }
  function enterState(newState) {
    gameState = newState;
    switch (newState) {
      case "IDLE":
        showOnboarding();
        renderAll();
        break;
      case "COUNTDOWN":
        hideOverlay();
        cauldron = freshRoundState();
        $cauldronEmoji.classList.remove("cauldron-state-1", "cauldron-state-2", "cauldron-state-4");
        $cauldronEmoji.classList.add("cauldron-state-1");
        lastPress = { 1: null, 2: null };
        currentKeyBindings = getRandomKeyBinding();
        updateKeyRowsDisplay();
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
        if (round === 1) $hintBanner.classList.remove("hidden");
        else $hintBanner.classList.add("hidden");
        renderAll();
        break;
      case "EXPLODING": {
        const result = checkExplosion(cauldron);
        if (!result.exploded) {
          enterState("ROUND_ACTIVE");
          return;
        }
        $game.classList.add("exploding");
        $cauldronEmoji.classList.remove("cauldron-state-1", "cauldron-state-2", "cauldron-state-4");
        $cauldronEmoji.classList.add("cauldron-state-4");
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
            showOverlay(`P${winner} WINS!`, "Press SPACE to play again");
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
    if (gameState === "IDLE") {
      if (e.key !== " ") return;
      if (onboardingScreen === 1) {
        onboardingScreen = 2;
        showOnboarding();
        return;
      } else {
        health = { 1: START_HEALTH, 2: START_HEALTH };
        round = 1;
        onboardingScreen = 1;
        enterState("COUNTDOWN");
        return;
      }
    }
    if (gameState === "GAME_OVER") {
      if (e.key !== " ") return;
      health = { 1: START_HEALTH, 2: START_HEALTH };
      round = 1;
      onboardingScreen = 1;
      enterState("COUNTDOWN");
      return;
    }
    if (gameState !== "ROUND_ACTIVE") return;
    const mapping = ingredientForKey(e.key, currentKeyBindings);
    if (!mapping) return;
    const { player, ingredient } = mapping;
    const now = performance.now();
    if (now < cooldownUntil[player]) return;
    const cooldownDuration = ingredient === "scald" ? FIREBALL_COOLDOWN_MS : COOLDOWN_MS;
    cooldownUntil[player] = now + cooldownDuration;
    const controlsEl = $(`p${player}-controls`);
    controlsEl.classList.add("on-cooldown");
    setTimeout(() => controlsEl.classList.remove("on-cooldown"), cooldownDuration);
    flashKeyRow(e.key);
    spawnFloatingLabel(ingredient, player);
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
    const playerKeys = player === 1 ? currentKeyBindings.p1 : currentKeyBindings.p2;
    const ingredientIndex = playerKeys.indexOf(e.key);
    if (ingredientIndex !== -1) {
      currentKeyBindings = randomizeOneKey(currentKeyBindings, player, ingredientIndex);
      const prefix = player === 1 ? "p1" : "p2";
      const controlsEl2 = $(`${prefix}-controls`);
      const rows = controlsEl2.querySelectorAll(".key-row");
      if (ingredientIndex < rows.length) {
        const row = rows[ingredientIndex];
        const newKey = player === 1 ? currentKeyBindings.p1[ingredientIndex] : currentKeyBindings.p2[ingredientIndex];
        const keyEl = row.querySelector(".key");
        if (keyEl) keyEl.textContent = newKey;
        row.dataset.key = newKey;
      }
    }
    const explosion = checkExplosion(cauldron);
    if (explosion.exploded) {
      enterState("EXPLODING");
    }
  });
  enterState("IDLE");
})();
