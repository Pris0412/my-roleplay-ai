/* 雅思词汇乐园 —— 纯前端，无需后端。发音用浏览器自带 Web Speech API。 */
(function () {
  "use strict";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const DAY = 86400000;

  // ───────── 存档 ─────────
  const KEY = "ieltsfun.v1";
  const state = Object.assign({
    progress: {},          // id -> { level, next, seen, correct, wrong }
    xp: 0, streak: 0, lastStudy: null,
    topic: "all", accent: "en-GB", rate: 1, quizMode: "meaning"
  }, load());
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function prog(id) { return state.progress[id] || (state.progress[id] = { level: 0, next: 0, seen: 0, correct: 0, wrong: 0 }); }

  // 简化版间隔重复：等级 0-5，间隔 0/1/3/7/14/30 天
  const INTERVALS = [0, 1, 3, 7, 14, 30];
  function grade(id, g) {              // g: 0 不熟 1 有点熟 2 记住了
    const p = prog(id); p.seen++;
    if (g === 0) { p.level = 0; p.wrong++; }
    else if (g === 1) { p.level = Math.max(1, p.level); p.correct++; }
    else { p.level = Math.min(5, p.level + 1); p.correct++; }
    p.next = Date.now() + INTERVALS[p.level] * DAY;
    addXP(g === 0 ? 1 : g === 1 ? 3 : 5);
    touchStreak(); save(); renderStats();
  }
  function touchStreak() {
    const today = new Date().toDateString();
    if (state.lastStudy === today) return;
    const yesterday = new Date(Date.now() - DAY).toDateString();
    state.streak = state.lastStudy === yesterday ? state.streak + 1 : 1;
    state.lastStudy = today;
  }
  function addXP(n) { state.xp += n; toast(`+${n} XP ✨`); }
  function levelInfo() { const lv = Math.floor(Math.sqrt(state.xp / 20)) + 1; const cur = (lv - 1) ** 2 * 20, nxt = lv ** 2 * 20; return { lv, pct: ((state.xp - cur) / (nxt - cur)) * 100 }; }
  function renderStats() {
    const { lv, pct } = levelInfo();
    $("#streak").textContent = state.streak; $("#level").textContent = lv; $("#xp").textContent = state.xp;
    $("#xpbar").style.width = pct + "%";
  }

  // ───────── 发音 ─────────
  const synth = window.speechSynthesis;
  let voices = [];
  function loadVoices() { voices = synth ? synth.getVoices() : []; }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; } else { $("#voiceWarn").hidden = false; }
  function pickVoice(lang) {
    const prefer = [/Google UK English Female/i, /Google UK English Male/i, /Daniel/i, /Kate/i, /Serena/i, /Libby/i, /Sonia/i, /Google US English/i, /Samantha/i, /Aria/i, /Jenny/i];
    const same = voices.filter((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase());
    for (const re of prefer) { const v = same.find((v) => re.test(v.name)); if (v) return v; }
    return same[0] || voices.find((v) => v.lang.startsWith("en")) || null;
  }
  function speak(text, opts) {
    if (!synth) return;
    opts = opts || {};
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const lang = opts.accent || state.accent;
    u.lang = lang; const v = pickVoice(lang); if (v) u.voice = v;
    u.rate = opts.rate != null ? opts.rate : state.rate; u.pitch = 1;
    synth.speak(u);
  }
  window.speakWord = speak; // 方便控制台调试

  // 小音效（Web Audio，不用外部文件）
  let actx;
  function ding(ok) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = ok ? [523, 659, 784] : [220, 180];
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = ok ? "triangle" : "sawtooth"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, actx.currentTime + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.15, actx.currentTime + i * 0.09 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * 0.09 + 0.25);
        o.connect(g).connect(actx.destination); o.start(actx.currentTime + i * 0.09); o.stop(actx.currentTime + i * 0.09 + 0.3);
      });
    } catch (e) {}
  }

  // ───────── UI 小工具 ─────────
  let toastTimer;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1200); }
  function confetti() {
    const box = $("#confetti"); const colors = ["#fbbf24", "#f472b6", "#22c55e", "#60a5fa", "#a78bfa"];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement("i");
      el.style.left = Math.random() * 100 + "vw"; el.style.background = pick(colors);
      el.style.animationDuration = 1.2 + Math.random() * 1.2 + "s"; el.style.animationDelay = Math.random() * 0.3 + "s";
      box.appendChild(el); setTimeout(() => el.remove(), 2800);
    }
  }
  const topicOf = (id) => window.TOPICS.find((t) => t.id === id);
  function pool() { return state.topic === "all" ? window.WORDS : window.WORDS.filter((w) => w.topic === state.topic); }
  function speakBtns(w) {
    return `<div class="speak-row">
      <button class="speak" data-say="${esc(w.word)}" data-accent="en-GB">🇬🇧 英式</button>
      <button class="speak" data-say="${esc(w.word)}" data-accent="en-US">🇺🇸 美式</button>
      <button class="speak" data-say="${esc(w.word)}" data-rate="0.5">🐢 慢速</button>
    </div>`;
  }
  // 事件委托：所有 data-say 按钮
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-say]"); if (!b) return;
    e.stopPropagation();
    speak(b.dataset.say, { accent: b.dataset.accent, rate: b.dataset.rate ? +b.dataset.rate : undefined });
  });

  // ───────── 主题 chips / 口音 / 语速 ─────────
  function renderTopics() {
    const all = [{ id: "all", name: "全部", emoji: "🌈", color: "#fbbf24" }].concat(window.TOPICS);
    $("#topics").innerHTML = all.map((t) => `<button class="chip ${state.topic === t.id ? "active" : ""}" data-topic="${t.id}" style="--chip:${t.color}">${t.emoji} ${t.name}</button>`).join("");
  }
  $("#topics").addEventListener("click", (e) => {
    const c = e.target.closest("[data-topic]"); if (!c) return;
    state.topic = c.dataset.topic; save(); renderTopics(); buildDeck(); renderCurrentPanel();
  });
  function segInit(sel, attr, key, cb) {
    const seg = $(sel);
    $$("button", seg).forEach((b) => b.classList.toggle("active", String(b.dataset[attr]) === String(state[key])));
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      state[key] = attr === "rate" ? +b.dataset[attr] : b.dataset[attr]; save();
      $$("button", seg).forEach((x) => x.classList.toggle("active", x === b));
      if (cb) cb();
    });
  }
  segInit("#accentSeg", "accent", "accent");
  segInit("#rateSeg", "rate", "rate");

  // ───────── 学习：翻转卡片 ─────────
  let deck = [], idx = 0;
  function buildDeck() {
    // 到期复习的排前面，然后是没学过的，最后是已掌握的
    const now = Date.now();
    const score = (w) => { const p = state.progress[w.id]; if (!p) return 1; if (p.next <= now) return 0; return 2 + p.level; };
    deck = pool().slice().sort((a, b) => score(a) - score(b) || Math.random() - 0.5);
    idx = 0;
  }
  function renderCard(withPop) {
    const card = $("#card"); card.classList.remove("flipped");
    const w = deck[idx]; if (!w) { $("#cardFront").innerHTML = '<div class="empty">这个主题还没有词哦</div>'; return; }
    const t = topicOf(w.topic); const p = state.progress[w.id];
    $("#cardFront").innerHTML = `
      <span class="topic-tag">${t.emoji} ${t.name}</span><span class="card-index">${idx + 1} / ${deck.length}${p && p.next <= Date.now() && p.seen ? " · 📌 到期复习" : ""}</span>
      <div class="word">${esc(w.word)}</div>
      <div class="ipa">${esc(w.ipa)}</div>
      <span class="pos">${esc(w.pos)}</span>
      ${speakBtns(w)}
      <div class="hint">👆 点击卡片翻面看中文 + 谐音梗</div>`;
    $("#cardBack").innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div><span class="word-sm">${esc(w.word)}</span> <span class="ipa" style="font-size:.9rem">${esc(w.ipa)}</span></div>
        <button class="speak small" data-say="${esc(w.word)}">🔊</button>
      </div>
      <div class="cn">${esc(w.pos)} ${esc(w.cn)}</div>
      <div class="pun-box">
        <div class="label">🤣 谐音梗</div>
        <div class="pun">${esc(w.pun)}</div>
        <div class="story">${esc(w.punStory)}</div>
      </div>
      <div class="ex">
        <div class="en">${highlight(w.example, w.word)} <button class="speak small" data-say="${esc(w.example)}">🔊 读例句</button></div>
        <div class="zh">${esc(w.exampleCn)}</div>
      </div>
      <div class="colls">${w.collocations.map((c) => `<span>${esc(c)}</span>`).join("")}</div>`;
    if (withPop) { card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop"); }
    // 自动朗读一次
    speak(w.word);
  }
  function highlight(sentence, word) {
    const stem = word.slice(0, Math.max(4, word.length - 3));
    const re = new RegExp("(" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]*)", "i");
    return esc(sentence).replace(re, "<mark>$1</mark>");
  }
  $("#card").addEventListener("click", () => $("#card").classList.toggle("flipped"));
  $("#nextBtn").addEventListener("click", () => { idx = (idx + 1) % deck.length; renderCard(true); });
  $("#prevBtn").addEventListener("click", () => { idx = (idx - 1 + deck.length) % deck.length; renderCard(true); });
  $("#shuffleBtn").addEventListener("click", () => { deck = shuffle(deck); idx = 0; renderCard(true); toast("🔀 已打乱"); });
  $$(".rate[data-grade]").forEach((b) => b.addEventListener("click", () => {
    const w = deck[idx]; if (!w) return;
    const g = +b.dataset.grade; grade(w.id, g);
    if (g === 2) { ding(true); confetti(); }
    idx = (idx + 1) % deck.length; renderCard(true);
  }));
  // 键盘：空格翻面，← → 切换，1/2/3 评分
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (!$("#panel-learn").classList.contains("active")) return;
    if (e.code === "Space") { e.preventDefault(); $("#card").classList.toggle("flipped"); }
    if (e.key === "ArrowRight") $("#nextBtn").click();
    if (e.key === "ArrowLeft") $("#prevBtn").click();
    if (["1", "2", "3"].includes(e.key)) $$(".rate[data-grade]")[+e.key - 1].click();
  });

  // ───────── 测验：选择题 ─────────
  let quiz = null;
  function newQuiz() {
    const ws = pool(); if (ws.length < 4) { $("#quizBox").innerHTML = '<div class="empty">这个主题词太少，换个主题吧</div>'; return; }
    const w = pick(ws);
    const others = shuffle(window.WORDS.filter((x) => x.id !== w.id)).slice(0, 3);
    quiz = { w, options: shuffle([w].concat(others)), done: false };
    renderQuiz();
  }
  function renderQuiz() {
    const { w, options } = quiz; const mode = state.quizMode;
    let head;
    if (mode === "meaning") head = `<div class="qword">${esc(w.word)}</div><div class="qsub">${esc(w.ipa)} ${esc(w.pos)}</div>${speakBtns(w)}`;
    else if (mode === "listen") head = `<div class="qword">🎧</div><div class="qsub">听发音，选出正确的单词</div>${speakBtns(w)}`;
    else head = `<div class="qword">${esc(w.cn)}</div><div class="qsub">${esc(w.pos)} · 提示谐音：<b>${esc(w.pun)}</b></div>`;
    const label = (o) => (mode === "meaning" ? o.cn : o.word);
    $("#quizBox").innerHTML = `
      <div class="qtitle"><span>🎯 ${mode === "meaning" ? "看词选义" : mode === "listen" ? "听音选词" : "看义选词"}</span><span>${topicOf(w.topic).emoji}</span></div>
      ${head}
      <div class="options">${options.map((o) => `<button class="opt" data-id="${o.id}">${esc(label(o))}</button>`).join("")}</div>
      <div class="feedback" id="quizFb"></div>
      <button class="next-btn" id="quizNext" disabled>下一题 →</button>`;
    if (mode === "listen") setTimeout(() => speak(w.word), 250); else if (mode === "meaning") speak(w.word);
  }
  $("#quizBox").addEventListener("click", (e) => {
    const o = e.target.closest(".opt");
    if (o && quiz && !quiz.done) {
      quiz.done = true; const ok = +o.dataset.id === quiz.w.id;
      $$(".opt").forEach((b) => { b.disabled = true; if (+b.dataset.id === quiz.w.id) b.classList.add("correct"); });
      if (!ok) o.classList.add("wrong");
      grade(quiz.w.id, ok ? 2 : 0); ding(ok); if (ok) confetti();
      $("#quizFb").innerHTML = ok
        ? `🎉 答对了！${esc(quiz.w.word)} = ${esc(quiz.w.cn)}<span class="pun-mini">谐音：${esc(quiz.w.pun)} —— ${esc(quiz.w.punStory)}</span>`
        : `😅 正确答案是 <b>${esc(quiz.w.word)}</b> = ${esc(quiz.w.cn)}<span class="pun-mini">记住谐音：${esc(quiz.w.pun)} —— ${esc(quiz.w.punStory)}</span>`;
      if (state.quizMode !== "meaning") speak(quiz.w.word);
      const nb = $("#quizNext"); nb.disabled = false; nb.focus();
    }
    if (e.target.id === "quizNext") newQuiz();
  });
  segInit("#quizModeSeg", "mode", "quizMode", newQuiz);

  // ───────── 拼写 ─────────
  let spell = null;
  function newSpell() {
    const w = pick(pool()); if (!w) return;
    spell = { w, hints: 0, done: false };
    $("#spellBox").innerHTML = `
      <div class="qtitle"><span>⌨️ 听音拼写</span><span>${topicOf(w.topic).emoji}</span></div>
      <div class="qword">${esc(w.cn)}</div>
      <div class="qsub">${esc(w.pos)} · 谐音：<b>${esc(w.pun)}</b></div>
      ${speakBtns(w)}
      <div class="letters" id="letters">${maskWord(w.word, 0)}</div>
      <input class="spell-input" id="spellInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入单词后按回车" />
      <div class="feedback" id="spellFb"></div>
      <div class="row-btns">
        <button class="ghost" id="hintBtn">💡 提示一个字母</button>
        <button class="next-btn" id="spellNext" style="margin-top:0">换一个 →</button>
      </div>`;
    speak(w.word);
    setTimeout(() => $("#spellInput").focus(), 50);
  }
  function maskWord(word, n) { return word.split("").map((ch, i) => (i < n ? ch : "_")).join(" "); }
  $("#spellBox").addEventListener("click", (e) => {
    if (e.target.id === "hintBtn" && spell && !spell.done) {
      spell.hints = Math.min(spell.w.word.length, spell.hints + 1);
      $("#letters").textContent = maskWord(spell.w.word, spell.hints);
      if (spell.hints >= spell.w.word.length) { $("#spellFb").textContent = "😂 全提示了，再输一遍加深记忆吧"; }
    }
    if (e.target.id === "spellNext") newSpell();
  });
  $("#spellBox").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.id !== "spellInput" || !spell) return;
    const input = e.target; const val = input.value.trim().toLowerCase();
    if (!val) return;
    if (val === spell.w.word.toLowerCase()) {
      if (!spell.done) {
        spell.done = true; input.classList.remove("wrong"); input.classList.add("correct");
        const g = spell.hints === 0 ? 2 : 1; grade(spell.w.id, g); ding(true); confetti();
        $("#spellFb").innerHTML = `🎉 拼对了！<span class="pun-mini">${esc(spell.w.example)}</span>`;
        speak(spell.w.example);
        setTimeout(newSpell, 2200);
      }
    } else {
      input.classList.remove("wrong"); void input.offsetWidth; input.classList.add("wrong");
      ding(false); $("#spellFb").textContent = "❌ 不对哦，再听一遍试试";
      // 标记为不熟，但不立刻跳题
      const p = prog(spell.w.id); p.wrong++; p.level = 0; p.next = Date.now(); save();
      speak(spell.w.word);
    }
  });

  // ───────── 填空 ─────────
  let cloze = null;
  function newCloze() {
    const ws = pool(); if (ws.length < 4) { $("#clozeBox").innerHTML = '<div class="empty">这个主题词太少，换个主题吧</div>'; return; }
    const w = pick(ws);
    const others = shuffle(window.WORDS.filter((x) => x.id !== w.id && x.pos.split("/")[0] === w.pos.split("/")[0])).slice(0, 3);
    while (others.length < 3) others.push(pick(window.WORDS.filter((x) => x.id !== w.id && !others.includes(x))));
    cloze = { w, options: shuffle([w].concat(others)), done: false };
    const stem = w.word.slice(0, Math.max(4, w.word.length - 3));
    const re = new RegExp(stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]*", "i");
    const m = w.example.match(re); const form = m ? m[0] : w.word;
    cloze.form = form;
    const sentence = esc(w.example).replace(form, `<span class="blank" id="blank">______</span>`);
    $("#clozeBox").innerHTML = `
      <div class="qtitle"><span>✍️ 例句填空</span><span>${topicOf(w.topic).emoji}</span></div>
      <div class="cloze-sent">${sentence}</div>
      <div class="qsub">${esc(w.exampleCn)}</div>
      <div class="options">${cloze.options.map((o) => `<button class="opt" data-id="${o.id}">${esc(o.word)}</button>`).join("")}</div>
      <div class="feedback" id="clozeFb"></div>
      <button class="next-btn" id="clozeNext" disabled>下一题 →</button>`;
  }
  $("#clozeBox").addEventListener("click", (e) => {
    const o = e.target.closest(".opt");
    if (o && cloze && !cloze.done) {
      cloze.done = true; const ok = +o.dataset.id === cloze.w.id;
      $$(".opt", $("#clozeBox")).forEach((b) => { b.disabled = true; if (+b.dataset.id === cloze.w.id) b.classList.add("correct"); });
      if (!ok) o.classList.add("wrong");
      $("#blank").textContent = cloze.form;
      grade(cloze.w.id, ok ? 2 : 0); ding(ok); if (ok) confetti();
      $("#clozeFb").innerHTML = (ok ? "🎉 完美！" : `😅 应该填 <b>${esc(cloze.w.word)}</b>（${esc(cloze.w.cn)}）`) +
        `<span class="pun-mini">谐音：${esc(cloze.w.pun)} · 搭配：${cloze.w.collocations.map(esc).join("，")}</span>`;
      speak(cloze.w.example);
      const nb = $("#clozeNext"); nb.disabled = false; nb.focus();
    }
    if (e.target.id === "clozeNext") newCloze();
  });

  // ───────── 进度 ─────────
  function renderProgress() {
    const ws = pool(); const now = Date.now();
    let learned = 0, mastered = 0, due = 0;
    ws.forEach((w) => { const p = state.progress[w.id]; if (!p || !p.seen) return; learned++; if (p.level >= 4) mastered++; if (p.next <= now) due++; });
    $("#summary").innerHTML = `
      <div class="sum-tile"><b>${ws.length}</b><small>总词数</small></div>
      <div class="sum-tile"><b>${learned}</b><small>已学习</small></div>
      <div class="sum-tile"><b>${mastered}</b><small>已掌握 ⭐4+</small></div>
      <div class="sum-tile"><b style="color:var(--accent2)">${due}</b><small>待复习</small></div>`;
    const sorted = ws.slice().sort((a, b) => (state.progress[b.id]?.level || 0) - (state.progress[a.id]?.level || 0));
    $("#wlist").innerHTML = sorted.map((w) => {
      const p = state.progress[w.id] || { level: 0, seen: 0, next: 0 };
      const stars = "★".repeat(p.level) + "☆".repeat(5 - p.level);
      const dueTxt = p.seen ? (p.next <= now ? "📌 待复习" : `⏰ ${Math.ceil((p.next - now) / DAY)} 天后`) : "🆕 未学";
      return `<div class="wrow">
        <button class="speak small" data-say="${esc(w.word)}">🔊</button>
        <div class="w">${esc(w.word)}<small>${esc(w.cn)} · ${esc(w.pun)}</small></div>
        <div style="text-align:right"><div class="stars">${stars}</div><div class="due">${dueTxt}</div></div>
      </div>`;
    }).join("");
  }
  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("确定清空所有学习记录？（XP、连续天数、单词进度都会归零）")) return;
    state.progress = {}; state.xp = 0; state.streak = 0; state.lastStudy = null; save();
    renderStats(); buildDeck(); renderProgress(); toast("已清空 🧹");
  });

  // ───────── 标签页 ─────────
  let current = "learn";
  function renderCurrentPanel() {
    if (current === "learn") renderCard(true);
    else if (current === "quiz") newQuiz();
    else if (current === "spell") newSpell();
    else if (current === "cloze") newCloze();
    else renderProgress();
  }
  $$(".tab").forEach((t) => t.addEventListener("click", () => {
    current = t.dataset.panel;
    $$(".tab").forEach((x) => x.classList.toggle("active", x === t));
    $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + current));
    if (synth) synth.cancel();
    renderCurrentPanel();
  }));

  // ───────── 启动 ─────────
  renderStats(); renderTopics(); buildDeck(); renderCard(false);
  const due = window.WORDS.filter((w) => { const p = state.progress[w.id]; return p && p.seen && p.next <= Date.now(); }).length;
  if (due) setTimeout(() => toast(`📌 今天有 ${due} 个词到期复习`), 600);
})();
