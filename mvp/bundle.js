(() => {
  // mvp/js/constants.js
  var BEATS = { Fireball: "Hex", Shield: "Fireball", Hex: "Shield" };
  var WIN_SCORE = 3;
  var CHAOS = "Chaos";
  var SLOT_DEFAULTS = ["Fireball", "Shield", "Hex"];

  // mvp/js/utils.js
  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }
  function otherPlayer(p) {
    return p === 1 ? 2 : 1;
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
  function nextStateAfterResolve(outcome, currentScore, winScore) {
    if (outcome === "HIT") {
      const newScore = currentScore + 1;
      return {
        scoreChange: 1,
        next: newScore >= winScore ? "GAME_OVER" : "NEXT_ROUND"
      };
    }
    return { scoreChange: 0, next: "SWAP" };
  }

  // mvp/js/game.js
  var state = "IDLE";
  var activeTimer = null;
  var rafId = null;
  var scores = { 1: 0, 2: 0 };
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
        pip.classList.toggle("filled", i < scores[p]);
      }
    }
  }
  function renderRoles() {
    const atkCol = attacker === 1 ? $p1Col : $p2Col;
    const defCol = attacker === 1 ? $p2Col : $p1Col;
    const atkRole = attacker === 1 ? $p1Role : $p2Role;
    const defRole = attacker === 1 ? $p2Role : $p1Role;
    $p1Col.classList.remove("attacker", "defender");
    $p2Col.classList.remove("attacker", "defender");
    if (state === "IDLE" || state === "GAME_OVER") {
      atkRole.textContent = "";
      defRole.textContent = "";
      return;
    }
    atkCol.classList.add("attacker");
    defCol.classList.add("defender");
    atkRole.textContent = "attacker";
    defRole.textContent = "defender";
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
      }, 600);
    }
  }
  function flashAvatar(player) {
    const av = player === 1 ? $p1Avatar : $p2Avatar;
    av.classList.remove("flash");
    void av.offsetWidth;
    av.classList.add("flash");
  }
  function enterState(newState) {
    clearTimer();
    state = newState;
    switch (state) {
      case "IDLE":
        $spellBanner.textContent = "ARCANE AKASH";
        $phaseLabel.textContent = "Press any key to start";
        hideCountdown();
        hideOverlay();
        renderRoles();
        renderPips();
        renderSlots();
        break;
      case "ATTACK_PHASE": {
        attackSpell = null;
        attackSlotIndex = null;
        defendSpell = null;
        defendSlotIndex = null;
        $roundLabel.textContent = "ROUND " + round;
        renderRoles();
        renderPips();
        $spellBanner.textContent = "";
        $phaseLabel.textContent = `PLAYER ${attacker} \u2014 ATTACK!`;
        renderSlots();
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
        const def = otherPlayer(attacker);
        $spellBanner.textContent = `>>> ${attackSpell.toUpperCase()}! >>>`;
        $phaseLabel.textContent = `PLAYER ${def} \u2014 DEFEND!`;
        renderSlots();
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
      case "GAME_OVER": {
        const winner = scores[1] >= WIN_SCORE ? 1 : 2;
        hideCountdown();
        renderRoles();
        renderPips();
        $spellBanner.textContent = "";
        $phaseLabel.textContent = "";
        showOverlay(`PLAYER ${winner} WINS!`, "Press any key to restart", "#f0c040");
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
    const next = nextStateAfterResolve(result.outcome, scores[attacker], WIN_SCORE);
    if (next.scoreChange) {
      scores[attacker] += next.scoreChange;
      renderPips();
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
    showMorphFeedback(morphEvents);
    if (next.next === "GAME_OVER") {
      activeTimer = setTimeout(() => {
        hideOverlay();
        enterState("GAME_OVER");
      }, 1500);
    } else if (next.next === "NEXT_ROUND") {
      activeTimer = setTimeout(() => {
        hideOverlay();
        round++;
        attacker = Math.random() < 0.5 ? 1 : 2;
        resetAllSlots();
        enterState("ATTACK_PHASE");
      }, 1500);
    } else {
      activeTimer = setTimeout(() => {
        hideOverlay();
        attacker = otherPlayer(attacker);
        enterState("ATTACK_PHASE");
      }, 1200);
    }
  }
  var HANDLERS = {
    IDLE(_key) {
      scores = { 1: 0, 2: 0 };
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
      enterState("REVEAL_DELAY");
    },
    DEFEND_PHASE(key) {
      if (defendSpell !== null) return;
      const def = otherPlayer(attacker);
      const defMap = slotKeyMap(def);
      if (!(key in defMap)) return;
      defendSlotIndex = slotIndexForKey(def, key);
      defendSpell = defMap[key];
      resolve("CAST");
    },
    GAME_OVER(_key) {
      enterState("IDLE");
    }
  };
  window.addEventListener("keydown", (e) => {
    if (paused) return;
    const handler = HANDLERS[state];
    if (handler) handler(e.key);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (state === "ATTACK_PHASE" || state === "DEFEND_PHASE" || state === "REVEAL_DELAY") {
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
        }
      }
    }
  });
  enterState("IDLE");
})();
