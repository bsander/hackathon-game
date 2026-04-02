(() => {
  // mvp/js/constants.js
  var BEATS = { Fireball: "Hex", Shield: "Fireball", Hex: "Shield" };
  var P1_KEYS = { "1": "Fireball", "2": "Shield", "3": "Hex" };
  var P2_KEYS = { "8": "Fireball", "9": "Shield", "0": "Hex" };
  var START_HEALTH = 3;
  var CHAOS = "Chaos";
  var SLOT_DEFAULTS = ["Fireball", "Shield", "Hex"];

  // mvp/js/utils.js
  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }
  function otherPlayer(p) {
    return p === 1 ? 2 : 1;
  }
  function playerForKey(key) {
    if (key in P1_KEYS) return 1;
    if (key in P2_KEYS) return 2;
    return null;
  }
  function keyListForPlayer(p) {
    return p === 1 ? ["1", "2", "3"] : ["8", "9", "0"];
  }

  // mvp/js/resolution.js
  function resolveSpells(attackSpell2, defendSpell2) {
    if (defendSpell2 === null || defendSpell2 === void 0) {
      return { outcome: "HIT", attackSpell: attackSpell2, defendSpell: null };
    }
    if (attackSpell2 === CHAOS || defendSpell2 === CHAOS) {
      const outcome = Math.random() < 0.5 ? "HIT" : "BLOCKED";
      return { outcome, attackSpell: attackSpell2, defendSpell: defendSpell2 };
    }
    if (attackSpell2 === defendSpell2) {
      return { outcome: "CLASH", attackSpell: attackSpell2, defendSpell: defendSpell2 };
    }
    if (BEATS[defendSpell2] === attackSpell2) {
      return { outcome: "BLOCKED", attackSpell: attackSpell2, defendSpell: defendSpell2 };
    }
    return { outcome: "HIT", attackSpell: attackSpell2, defendSpell: defendSpell2 };
  }
  function nextStateAfterResolve(outcome, currentHealth) {
    if (outcome === "HIT") {
      return {
        healthChange: -1,
        next: currentHealth - 1 <= 0 ? "GAME_OVER" : "NEXT_ROUND"
      };
    }
    return { healthChange: 0, next: "SWAP" };
  }

  // mvp/js/game.js
  var state = "IDLE";
  var activeTimer = null;
  var rafId = null;
  var health = { 1: START_HEALTH, 2: START_HEALTH };
  var round = 1;
  var attacker = 1;
  var attackSpell = null;
  var attackSlotIndex = null;
  var defendSpell = null;
  var defendSlotIndex = null;
  var countdownStart = 0;
  var countdownDuration = 0;
  var paused = false;
  var pausedRemaining = 0;
  var misfireCount = { 1: 0, 2: 0 };
  var pendingMorphEvents = [];
  var pendingNextState = null;
  var playerSlots = { 1: [...SLOT_DEFAULTS], 2: [...SLOT_DEFAULTS] };
  function resetAllSlots() {
    playerSlots[1] = [...SLOT_DEFAULTS];
    playerSlots[2] = [...SLOT_DEFAULTS];
  }
  function morphSlot(player, slotIndex, spell) {
    playerSlots[player][slotIndex] = spell;
  }
  function slotKeyMap(player) {
    const keys = keyListForPlayer(player);
    const map = {};
    keys.forEach((k, i) => {
      map[k] = playerSlots[player][i];
    });
    return map;
  }
  function slotIndexForKey(player, key) {
    const keys = keyListForPlayer(player);
    return keys.indexOf(key);
  }
  var $roundLabel = document.getElementById("round-label");
  var $spellBanner = document.getElementById("spell-banner");
  var $phaseLabel = document.getElementById("phase-label");
  var $countdownBar = document.getElementById("countdown-bar");
  var $countdownText = document.getElementById("countdown-text");
  var $countdownContainer = document.getElementById("countdown-container");
  var $overlay = document.getElementById("overlay");
  var $overlayText = document.getElementById("overlay-text");
  var $overlaySub = document.getElementById("overlay-sub");
  var $pausedOverlay = document.getElementById("paused");
  var $p1Col = document.getElementById("p1-col");
  var $p2Col = document.getElementById("p2-col");
  var $p1Role = document.getElementById("p1-role");
  var $p2Role = document.getElementById("p2-role");
  var $p1Avatar = document.getElementById("p1-avatar");
  var $p2Avatar = document.getElementById("p2-avatar");
  var $slots = {
    1: [document.getElementById("p1-slot-0"), document.getElementById("p1-slot-1"), document.getElementById("p1-slot-2")],
    2: [document.getElementById("p2-slot-0"), document.getElementById("p2-slot-1"), document.getElementById("p2-slot-2")]
  };
  var $p1Panel = document.getElementById("p1-panel");
  var $p2Panel = document.getElementById("p2-panel");
  var $instructionBar = document.getElementById("instruction-bar");
  function clearTimer() {
    if (activeTimer !== null) {
      clearTimeout(activeTimer);
      activeTimer = null;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
  function renderPips() {
    for (let p = 1; p <= 2; p++) {
      for (let i = 0; i < 3; i++) {
        const pip = document.getElementById(`p${p}-pip-${i}`);
        pip.classList.toggle("filled", i < health[p]);
      }
    }
  }
  function renderRoles() {
    const atkCol = attacker === 1 ? $p1Col : $p2Col;
    const defCol = attacker === 1 ? $p2Col : $p1Col;
    const atkRole = attacker === 1 ? $p1Role : $p2Role;
    const defRole = attacker === 1 ? $p2Role : $p1Role;
    const atkPanel = attacker === 1 ? $p1Panel : $p2Panel;
    const defPanel = attacker === 1 ? $p2Panel : $p1Panel;
    $p1Col.classList.remove("attacker", "defender", "inactive");
    $p2Col.classList.remove("attacker", "defender", "inactive");
    $p1Panel.classList.remove("inactive");
    $p2Panel.classList.remove("inactive");
    if (state === "IDLE" || state === "GAME_OVER") {
      atkRole.textContent = "";
      defRole.textContent = "";
      return;
    }
    atkCol.classList.add("attacker");
    defCol.classList.add("defender");
    defCol.classList.add("inactive");
    defPanel.classList.add("inactive");
    atkRole.textContent = "attacker";
    defRole.textContent = "defender";
    if (state === "DEFEND_PHASE") {
      atkCol.classList.add("inactive");
      atkPanel.classList.add("inactive");
      defCol.classList.remove("inactive");
      defPanel.classList.remove("inactive");
    }
  }
  var SPELL_EMOJI = { Fireball: "\u{1F525}", Shield: "\u{1F6E1}", Hex: "\u{1F480}", Chaos: "\u{1F300}" };
  function renderSlots() {
    for (let p = 1; p <= 2; p++) {
      const keys = keyListForPlayer(p);
      for (let i = 0; i < 3; i++) {
        const spell = playerSlots[p][i];
        const el = $slots[p][i];
        const emoji = SPELL_EMOJI[spell] || "\u2753";
        el.innerHTML = `<span class="key">[${keys[i]}]</span> <span class="slot-name">${spell}</span> <span class="slot-emoji">${emoji}</span>`;
        el.classList.toggle("chaos", spell === CHAOS);
      }
    }
  }
  function renderInstructionBar() {
    const EMOJI = { Fireball: "\u{1F525}", Shield: "\u{1F6E1}", Hex: "\u{1F480}", Chaos: "\u2753" };
    function slotLabel(player) {
      const keys = keyListForPlayer(player);
      return keys.map((k, i) => {
        const spell = playerSlots[player][i];
        return `[${k}] ${spell} ${EMOJI[spell] || "\u2753"}`;
      }).join("  ");
    }
    switch (state) {
      case "IDLE":
        $instructionBar.textContent = "Press SPACE to begin the duel";
        break;
      case "ATTACK_PHASE":
        $instructionBar.textContent = `P${attacker}: Cast \u2192 ${slotLabel(attacker)}`;
        break;
      case "DEFEND_PHASE": {
        const def = otherPlayer(attacker);
        $instructionBar.textContent = `P${def}: Counter ${attackSpell.toUpperCase()} \u2192 ${slotLabel(def)}`;
        break;
      }
      case "GAME_OVER":
        $instructionBar.textContent = "Press SPACE to play again";
        break;
      default:
        $instructionBar.textContent = "";
        break;
    }
  }
  function startCountdownBar(durationMs) {
    countdownStart = performance.now();
    countdownDuration = durationMs;
    $countdownBar.style.width = "100%";
    $countdownBar.style.backgroundColor = "#40c040";
    $countdownContainer.style.display = "";
    function tick() {
      if (paused) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const elapsed = performance.now() - countdownStart;
      const frac = Math.max(0, 1 - elapsed / countdownDuration);
      $countdownBar.style.width = frac * 100 + "%";
      if (frac > 0.5) $countdownBar.style.backgroundColor = "#40c040";
      else if (frac > 0.25) $countdownBar.style.backgroundColor = "#e0a020";
      else $countdownBar.style.backgroundColor = "#e04040";
      $countdownText.textContent = Math.max(0, frac * countdownDuration / 1e3).toFixed(1) + "s";
      if (frac > 0) {
        rafId = requestAnimationFrame(tick);
      }
    }
    rafId = requestAnimationFrame(tick);
  }
  function hideCountdown() {
    $countdownBar.style.width = "0%";
    $countdownText.textContent = "";
  }
  function showOverlay(text, sub, colour) {
    $overlayText.textContent = text;
    $overlayText.style.color = colour || "#fff";
    $overlaySub.textContent = sub || "";
    $overlay.classList.add("visible");
  }
  function hideOverlay() {
    $overlay.classList.remove("visible");
  }
  function showMorphFeedback(events) {
    for (const { player, slot, type, label } of events) {
      const el = $slots[player][slot];
      el.classList.remove("morph-degrade", "morph-restore");
      void el.offsetWidth;
      el.classList.add(type === "restore" ? "morph-restore" : "morph-degrade");
      const labelEl = document.createElement("span");
      labelEl.className = `morph-label ${type}`;
      labelEl.textContent = label;
      el.appendChild(labelEl);
      setTimeout(() => {
        labelEl.remove();
        el.classList.remove("morph-degrade", "morph-restore");
      }, 1500);
    }
  }
  function flashAvatar(player) {
    const av = player === 1 ? $p1Avatar : $p2Avatar;
    av.classList.remove("flash");
    void av.offsetWidth;
    av.classList.add("flash");
  }
  function flashColumn(player, cssClass) {
    const col = player === 1 ? $p1Col : $p2Col;
    col.classList.remove(cssClass);
    void col.offsetWidth;
    col.classList.add(cssClass);
  }
  function showCommitLabel(player) {
    const col = player === 1 ? $p1Col : $p2Col;
    const el = document.createElement("div");
    el.className = "commit-label";
    el.textContent = "\u2726 LOCKED IN";
    col.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }
  function shatterPip(player, pipIndex) {
    const pip = document.getElementById(`p${player}-pip-${pipIndex}`);
    pip.classList.remove("shatter");
    void pip.offsetWidth;
    pip.classList.add("shatter");
    flashColumn(player, "flash-hit");
  }
  function showBackfireWarning(player) {
    const col = player === 1 ? $p1Col : $p2Col;
    const el = document.createElement("div");
    el.className = "fizzle-label warning";
    el.textContent = "Careful!";
    col.appendChild(el);
    setTimeout(() => el.remove(), 800);
    flashAvatar(player);
  }
  function triggerBackfire(player) {
    if (health[player] <= 0) return;
    health[player] -= 1;
    renderPips();
    shatterPip(player, health[player]);
    flashAvatar(player);
    flashColumn(player, "flash-backfire");
    const col = player === 1 ? $p1Col : $p2Col;
    const el = document.createElement("div");
    el.className = "backfire-label";
    el.textContent = "BACKFIRE!";
    col.appendChild(el);
    setTimeout(() => el.remove(), 1e3);
    if (health[player] <= 0) {
      clearTimer();
      enterState("GAME_OVER");
    }
  }
  function advanceFromMorph() {
    $phaseLabel.style.color = "#ccc";
    const ns = pendingNextState;
    pendingNextState = null;
    pendingMorphEvents = [];
    if (ns === "GAME_OVER") {
      enterState("GAME_OVER");
    } else if (ns === "NEXT_ROUND") {
      round++;
      attacker = Math.random() < 0.5 ? 1 : 2;
      resetAllSlots();
      enterState("ATTACK_PHASE");
    } else {
      attacker = otherPlayer(attacker);
      enterState("ATTACK_PHASE");
    }
  }
  function enterState(newState) {
    clearTimer();
    state = newState;
    switch (state) {
      case "IDLE":
        $spellBanner.textContent = "ARCANE AKASH";
        $phaseLabel.textContent = "";
        hideCountdown();
        hideOverlay();
        renderRoles();
        renderPips();
        renderSlots();
        renderInstructionBar();
        break;
      case "ATTACK_PHASE": {
        misfireCount = { 1: 0, 2: 0 };
        attackSpell = null;
        attackSlotIndex = null;
        defendSpell = null;
        defendSlotIndex = null;
        $roundLabel.textContent = "ROUND " + round;
        renderRoles();
        renderPips();
        $spellBanner.textContent = "";
        $phaseLabel.textContent = `P${attacker} \u2694\uFE0F ATTACK`;
        renderSlots();
        renderInstructionBar();
        const duration = 3e3;
        startCountdownBar(duration);
        activeTimer = setTimeout(() => {
          enterState("RESOLVE_FUMBLE");
        }, duration);
        break;
      }
      case "REVEAL_DELAY": {
        $phaseLabel.textContent = "";
        hideCountdown();
        $spellBanner.textContent = "...";
        const delay = randBetween(200, 600);
        countdownStart = performance.now();
        countdownDuration = delay;
        activeTimer = setTimeout(() => {
          enterState("DEFEND_PHASE");
        }, delay);
        break;
      }
      case "DEFEND_PHASE": {
        misfireCount = { 1: 0, 2: 0 };
        const def = otherPlayer(attacker);
        $spellBanner.textContent = `>>> ${attackSpell.toUpperCase()}! >>>`;
        $phaseLabel.textContent = `P${def} \u{1F6E1} DEFEND`;
        renderRoles();
        renderSlots();
        renderInstructionBar();
        const duration = randBetween(1600, 2400);
        startCountdownBar(duration);
        activeTimer = setTimeout(() => {
          defendSpell = null;
          resolve("TIMEOUT");
        }, duration);
        break;
      }
      case "RESOLVE_FUMBLE":
        $spellBanner.textContent = "FUMBLE!";
        $phaseLabel.textContent = `Player ${attacker} hesitated`;
        $spellBanner.style.color = "#888";
        hideCountdown();
        showOverlay("FUMBLE!", `Player ${attacker} didn't cast in time`, "#888");
        activeTimer = setTimeout(() => {
          $spellBanner.style.color = "#f0c040";
          hideOverlay();
          attacker = otherPlayer(attacker);
          enterState("ATTACK_PHASE");
        }, 1500);
        break;
      case "MORPH_DISPLAY": {
        hideOverlay();
        $spellBanner.textContent = "";
        $phaseLabel.textContent = "SPELLS SHIFTING...";
        $phaseLabel.style.color = "#c090ff";
        renderSlots();
        showMorphFeedback(pendingMorphEvents);
        renderInstructionBar();
        const morphDuration = 1500;
        countdownStart = performance.now();
        countdownDuration = morphDuration;
        activeTimer = setTimeout(advanceFromMorph, morphDuration);
        break;
      }
      case "GAME_OVER": {
        const winner = health[1] <= 0 ? 2 : 1;
        hideCountdown();
        renderRoles();
        renderPips();
        $spellBanner.textContent = "";
        $phaseLabel.textContent = "";
        showOverlay(`PLAYER ${winner} WINS!`, "", "#f0c040");
        renderInstructionBar();
        break;
      }
      default:
        break;
    }
  }
  function resolve(reason) {
    clearTimer();
    hideCountdown();
    const result = resolveSpells(attackSpell, defendSpell);
    const def = otherPlayer(attacker);
    let text, sub, colour;
    if (reason === "TIMEOUT") {
      text = "TIMEOUT!";
      sub = `Player ${def} didn't defend in time`;
      colour = "#e04040";
      flashAvatar(def);
    } else if (result.outcome === "CLASH") {
      text = "CLASH!";
      sub = `${attackSpell} vs ${defendSpell}`;
      colour = "#e0a020";
    } else if (result.outcome === "BLOCKED") {
      text = "BLOCKED!";
      sub = `${defendSpell} counters ${attackSpell}`;
      colour = "#4080e0";
    } else {
      text = "HIT!";
      sub = `${attackSpell} breaks through ${defendSpell}`;
      colour = "#e04040";
      flashAvatar(def);
    }
    $spellBanner.textContent = "";
    $phaseLabel.textContent = "";
    showOverlay(text, sub, colour);
    const next = nextStateAfterResolve(result.outcome, health[def]);
    if (next.healthChange) {
      const oldHealth = health[def];
      health[def] += next.healthChange;
      renderPips();
      if (health[def] < oldHealth) {
        shatterPip(def, health[def]);
      }
    }
    const morphEvents = [];
    if (attackSlotIndex !== null) {
      if (playerSlots[attacker][attackSlotIndex] === CHAOS) {
        morphSlot(attacker, attackSlotIndex, SLOT_DEFAULTS[attackSlotIndex]);
        morphEvents.push({ player: attacker, slot: attackSlotIndex, type: "restore", label: "CAST \u2192 RESTORED!" });
      } else {
        morphSlot(attacker, attackSlotIndex, CHAOS);
        morphEvents.push({ player: attacker, slot: attackSlotIndex, type: "degrade", label: "CAST \u2192 CHAOS" });
      }
    }
    if (result.outcome === "HIT" || reason === "TIMEOUT") {
      const standardSlots = playerSlots[def].map((spell, i) => spell !== CHAOS ? i : -1).filter((i) => i >= 0);
      if (standardSlots.length > 0) {
        const pick = standardSlots[Math.floor(Math.random() * standardSlots.length)];
        morphSlot(def, pick, CHAOS);
        morphEvents.push({ player: def, slot: pick, type: "degrade", label: "HIT \u2192 CHAOS" });
      }
    }
    renderSlots();
    pendingMorphEvents = morphEvents;
    pendingNextState = next.next;
    const overlayDuration = 1200;
    activeTimer = setTimeout(() => {
      if (morphEvents.length > 0) {
        enterState("MORPH_DISPLAY");
      } else {
        hideOverlay();
        advanceFromMorph();
      }
    }, overlayDuration);
  }
  var HANDLERS = {
    IDLE(key) {
      if (key !== " ") return;
      health = { 1: START_HEALTH, 2: START_HEALTH };
      round = 1;
      attacker = Math.random() < 0.5 ? 1 : 2;
      resetAllSlots();
      enterState("ATTACK_PHASE");
    },
    ATTACK_PHASE(key) {
      const atkMap = slotKeyMap(attacker);
      if (!(key in atkMap)) return;
      attackSlotIndex = slotIndexForKey(attacker, key);
      attackSpell = atkMap[key];
      flashColumn(attacker, "flash-commit");
      showCommitLabel(attacker);
      enterState("REVEAL_DELAY");
    },
    DEFEND_PHASE(key) {
      if (defendSpell !== null) return;
      const def = otherPlayer(attacker);
      const defMap = slotKeyMap(def);
      if (!(key in defMap)) return;
      defendSlotIndex = slotIndexForKey(def, key);
      defendSpell = defMap[key];
      flashColumn(def, "flash-commit");
      showCommitLabel(def);
      resolve("CAST");
    },
    GAME_OVER(key) {
      if (key !== " ") return;
      enterState("IDLE");
    }
  };
  window.addEventListener("keydown", (e) => {
    if (paused) return;
    const key = e.key;
    const keyOwner = playerForKey(key);
    const activePlayer = state === "ATTACK_PHASE" ? attacker : state === "DEFEND_PHASE" ? otherPlayer(attacker) : null;
    if (activePlayer !== null && keyOwner !== null && keyOwner !== activePlayer) {
      misfireCount[keyOwner] += 1;
      if (misfireCount[keyOwner] === 1) {
        showBackfireWarning(keyOwner);
      } else {
        triggerBackfire(keyOwner);
      }
      return;
    }
    const handler = HANDLERS[state];
    if (handler) handler(key);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (state === "ATTACK_PHASE" || state === "DEFEND_PHASE" || state === "REVEAL_DELAY" || state === "MORPH_DISPLAY") {
        paused = true;
        $pausedOverlay.classList.add("visible");
        if (activeTimer !== null) {
          pausedRemaining = Math.max(0, countdownDuration - (performance.now() - countdownStart));
          clearTimeout(activeTimer);
          activeTimer = null;
        }
      }
    } else if (paused) {
      paused = false;
      $pausedOverlay.classList.remove("visible");
      if (pausedRemaining > 0) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        countdownStart = performance.now();
        countdownDuration = pausedRemaining;
        if (state === "ATTACK_PHASE" || state === "DEFEND_PHASE") {
          startCountdownBar(pausedRemaining);
        }
        if (state === "ATTACK_PHASE") {
          activeTimer = setTimeout(() => enterState("RESOLVE_FUMBLE"), pausedRemaining);
        } else if (state === "DEFEND_PHASE") {
          activeTimer = setTimeout(() => {
            defendSpell = null;
            resolve("TIMEOUT");
          }, pausedRemaining);
        } else if (state === "REVEAL_DELAY") {
          activeTimer = setTimeout(() => enterState("DEFEND_PHASE"), pausedRemaining);
        } else if (state === "MORPH_DISPLAY") {
          activeTimer = setTimeout(advanceFromMorph, pausedRemaining);
        }
      }
    }
  });
  enterState("IDLE");
})();
