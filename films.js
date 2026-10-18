// One list drives the grid and the player. Rows keep tiles in a row the same height.
const FILMS = [
  {
    id: "talkover", row: 0, name: "Talkover", kind: "Voice for Claude Code", ar: "16/9",
    tall: "talkover-tall",
    what: "Hands-free, two-way voice for Claude Code on Windows. You talk and it types. It reads the replies back. Say wait and it stops, then picks up where you cut in. Speech stays on your machine.",
    film: "Launch film. The panel is drawn by the app's own code; the score is original.",
    links: [["Code", "https://github.com/VyasSathya/talkover"], ["Site", "https://vyassathya.github.io/talkover/"]],
  },
  {
    id: "singstan", row: 0, name: "SingStan", kind: "K-pop karaoke app", ar: "9/16",
    what: "A karaoke app for K-pop that spells the lyrics the way they sound, so you can sing along without reading Korean. Built with Expo for iOS and Android.",
    film: "Music video cut. The performers are AI-generated; the track is original.",
    links: [],
  },
  {
    id: "brainrot-brawl", row: 0, name: "Brainrot Brawl", kind: "Mobile party brawler", ar: "9/16",
    what: "A ball-throwing brawler for phones. Grab a ball, throw it, everyone is a target. Built in Unity.",
    film: "Game ad cut from bot matches in the current build. Character voices and animation are made with AI.",
    links: [],
  },
  {
    id: "crewboard", row: 1, name: "crewboard", kind: "Dashboard for coding agents", ar: "16/9",
    tall: "crewboard-tall",
    what: "One screen for every Claude Code session and subagent, plus a task list that you and your agents both write. Runs on your machine.",
    film: "Editorial cut from the real app.",
    links: [["Code", "https://github.com/VyasSathya/crewboard"]],
  },
  {
    id: "agent-brain", row: 1, name: "agent-brain", kind: "Memory for coding agents", ar: "16/9",
    tall: "agent-brain-tall",
    what: "One shared memory that Claude Code and Codex both read and write. Every handoff cites the file and line it came from. Plain files, standard library Python.",
    film: "Diagram film. Every line on screen is the tool's real output.",
    links: [["Code", "https://github.com/VyasSathya/agent-brain"]],
  },
  {
    id: "punchpad", row: 1, name: "Punchpad", kind: "App for stand-up comedians", ar: "9/16", ready: false,
    what: "",
    film: "",
    links: [],
  },
];

(function () {
  const list = FILMS.filter((f) => f.ready !== false);
  const rows = [];
  for (const f of list) {
    const key = (f.group || "work") + ":" + f.row;
    if (!rows[key]) rows.push((rows[key] = []));
    rows[key].push(f);
  }

  for (const r of rows) {
    const grid = document.querySelector(`.grid[data-group="${r[0].group || "work"}"]`);
    grid.closest("section").hidden = false;
    const row = document.createElement("div");
    row.className = "row";
    const talls = r.filter((f) => f.ar === "9/16").length;
    for (const f of r) {
      const tall = f.ar === "9/16";
      const fig = document.createElement("figure");
      fig.className = "tile " + (tall ? "tall" : "wide") + (tall && talls === 1 ? " solo" : "");
      fig.style.setProperty("--ar", f.ar.replace("/", " / "));
      const [aw, ah] = f.ar.split("/").map(Number);
      fig.style.flexGrow = aw / ah;
      fig.style.margin = "0";
      fig.innerHTML =
        `<button type="button" aria-label="Play the ${f.name} film">` +
        `<img src="media/${f.id}.jpg" alt="" loading="lazy" decoding="async">` +
        `<video muted loop playsinline preload="none" aria-hidden="true"></video></button>` +
        `<figcaption class="cap"><span class="name">${f.name}</span><span class="kind">${f.kind}</span></figcaption>`;
      const btn = fig.querySelector("button");
      const vid = fig.querySelector("video");
      btn.addEventListener("click", () => open(f.id));
      if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
        btn.addEventListener("pointerenter", () => {
          if (!vid.src) vid.src = `media/${f.id}.mp4`;
          vid.play().then(() => fig.classList.add("live")).catch(() => {});
        });
        btn.addEventListener("pointerleave", () => { vid.pause(); fig.classList.remove("live"); });
      }
      row.appendChild(fig);
    }
    grid.appendChild(row);
  }

  // player
  const dlg = document.querySelector(".player");
  const video = dlg.querySelector(".p-video");
  const $ = (s) => dlg.querySelector(s);
  let cur = -1;
  const portrait = () => matchMedia("(max-aspect-ratio: 1/1)").matches;

  function show(i) {
    cur = (i + list.length) % list.length;
    const f = list[cur];
    const src = f.tall && portrait() ? f.tall : f.id;
    video.poster = `media/${src}.jpg`;
    video.src = `media/${src}.mp4`;
    $(".p-kind").textContent = f.kind;
    $(".p-name").textContent = f.name;
    $(".p-what").textContent = f.what;
    $(".p-film").textContent = f.film;
    const ul = $(".p-links");
    ul.innerHTML = "";
    for (const [label, href] of f.links) {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
      ul.appendChild(li);
    }
    history.replaceState(null, "", "#" + f.id);
    video.play().catch(() => {});
  }
  function open(id) {
    const i = list.findIndex((f) => f.id === id);
    if (i < 0) return;
    if (!dlg.open) dlg.showModal();
    show(i);
  }
  function close() { video.pause(); dlg.close(); }
  dlg.addEventListener("close", () => {
    video.pause(); video.removeAttribute("src"); video.load();
    if (list.some((f) => "#" + f.id === location.hash)) history.replaceState(null, "", location.pathname + "#work");
  });
  $(".p-close").addEventListener("click", close);
  $(".p-prev").addEventListener("click", () => show(cur - 1));
  $(".p-next").addEventListener("click", () => show(cur + 1));
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.classList.contains("p-stage")) close(); });
  dlg.addEventListener("keydown", (e) => {
    if (e.target === video) return; // the video's own controls use the arrow keys
    if (e.key === "ArrowRight") show(cur + 1);
    else if (e.key === "ArrowLeft") show(cur - 1);
  });

  const fromHash = () => {
    const h = location.hash.slice(1);
    if (list.some((f) => f.id === h)) open(h);
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();

  // theme toggle: system by default, remembered once chosen
  document.querySelector(".theme").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });
})();
