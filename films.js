/* Four identical cards per page in All and every collection. */
(() => {
  const groups = [
    ["all", "All"],
    ["apps", "Products & websites"],
    ["games", "Games & 3D"],
    ["automation", "Agents & tools"],
    ["art", "Art & creative"],
  ];
  const services = [
    {
      id: "products",
      name: "Build a product",
      title: "An idea people can use.",
      description:
        "A website or app, from the first flow through the working product and handover.",
      deliverables: [
        "Product flows and interface design",
        "A working website or app",
        "Integrations, checks, and release handover",
      ],
      proof: ["marquee", "front-of-line", "punchpad", "kpop-sing"],
    },
    {
      id: "automation",
      name: "Automate a workflow",
      title: "Make the work flow.",
      description:
        "Connect your tools, context, and decisions into a workflow you can inspect and run.",
      deliverables: [
        "Workflow and integration design",
        "Agents and custom tools",
        "Checks, logs, and operating notes",
      ],
      proof: ["talkover", "crewboard", "agent-brain", "video-studio"],
    },
    {
      id: "games",
      name: "Games & 3D",
      title: "A playable idea.",
      description:
        "Interactive experiences, editor tools, and the asset workflows behind them.",
      deliverables: [
        "Gameplay and interaction",
        "Game-ready asset tooling",
        "A playable build or working tool",
      ],
      proof: ["brainrot-brawl", "mad-balls", "buildwhatever", "asset-pipeline"],
    },
    {
      id: "films",
      name: "Make a film",
      title: "Let people see what it does.",
      description:
        "A product film built from real screens, with enough time to follow the work.",
      deliverables: [
        "Story and real product capture",
        "Landscape and portrait compositions",
        "Music, export, and revision",
      ],
      proof: ["talkover", "punchpad", "crewboard", "whiteboard"],
    },
    {
      id: "launches",
      name: "Launch an experience",
      title: "Bring the work to people.",
      description:
        "Collection sites and interactive launch experiences, with the tools to support them.",
      deliverables: [
        "Launch website and interactions",
        "Collection or product integrations",
        "Owner workflows and handover",
      ],
      proof: ["flower-girls", "puzzle-people", "marquee", "kpop-sing"],
    },
  ];
  const deck = document.querySelector("#work-deck"),
    prev = document.querySelector("#previous"),
    next = document.querySelector("#next");
  let collection = "all";
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function card(p) {
    const a = document.createElement("a");
    a.className = `project-card identity-${p.id}`;
    a.href = `work/${p.id}/`;
    a.style.setProperty("--brand", p.accent);
    const art = p.thumbnail
      ? `<picture><source media="(max-width: 500px)" srcset="media/${esc(p.thumbnail.compact)}"><source media="(max-width: 1100px)" srcset="media/${esc(p.thumbnail.medium)}"><img src="media/${esc(p.thumbnail.wide)}" alt="${esc(p.imageAlt || p.name)}" loading="lazy" decoding="async" width="1611" height="504"></picture>`
      : p.poster
      ? `<img src="media/${esc(p.poster)}" alt="${esc(p.imageAlt || p.name)}" loading="lazy" decoding="async">`
      : `<span class="wordmark">${esc(p.wordmark || p.name)}</span>`;
    a.innerHTML = `<div class="project-image">${art}<span class="explore" aria-hidden="true">&#8599;</span></div><div class="caption"><h3>${esc(p.name)}</h3><p>${esc(p.kind)}</p></div>`;
    if (p.thumbnail) a.querySelector('.project-image').style.background = p.thumbnail.background;
    return a;
  }
  let accessTimer;
  let swiping = false;
  let touchStart;
  function settledAccess() {
    if (swiping || !deck.clientWidth) return;
    const index = Math.round(deck.scrollLeft / deck.clientWidth);
    if (Math.abs(deck.scrollLeft - index * deck.clientWidth) > 1) return;
    [...deck.children].forEach((page, i) => {
      page.setAttribute("aria-hidden", String(i !== index));
      page.querySelectorAll("a").forEach((link) => {
        link.tabIndex = i === index ? 0 : -1;
      });
    });
  }
  function position() {
    if (!deck.clientWidth) return;
    const index = Math.round(deck.scrollLeft / deck.clientWidth);
    prev.disabled = index === 0;
    next.disabled = index >= deck.children.length - 1;
    document.querySelector("#page-status").textContent =
      `Page ${index + 1} of ${deck.children.length}`;
    clearTimeout(accessTimer);
    accessTimer = setTimeout(settledAccess, 150);
  }
  function work() {
    const shown = PROJECTS.filter(
      (p) => collection === "all" || p.group === collection,
    );
    deck.replaceChildren();
    for (let i = 0; i < shown.length; i += 4) {
      const page = document.createElement("div");
      page.className = "project-grid project-page";
      page.setAttribute("role", "group");
      page.setAttribute(
        "aria-label",
        `Projects ${i + 1} to ${Math.min(i + 4, shown.length)}`,
      );
      page.append(...shown.slice(i, i + 4).map(card));
      deck.append(page);
    }
    deck.scrollLeft = 0;
    document
      .querySelectorAll("[data-collection]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.collection === collection),
        ),
      );
    position();
    settledAccess();
  }
  function service(id) {
    const s = services.find((s) => s.id === id) || services[0];
    document.querySelector("#service-title").textContent = s.title;
    document.querySelector("#service-description").textContent = s.description;
    document.querySelector("#service-deliverables").replaceChildren(
      ...s.deliverables.map((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        return li;
      }),
    );
    document
      .querySelector("#service-proof")
      .replaceChildren(
        ...s.proof.map((id) => card(PROJECTS.find((p) => p.id === id))),
      );
    document
      .querySelectorAll("[data-service]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.service === s.id)),
      );
  }
  function view() {
    const hash = location.hash.slice(1),
      parts = hash.split("/"),
      active = parts[0] === "services" ? "services" : "work";
    ["work", "services"].forEach(
      (id) => (document.getElementById(id).hidden = id !== active),
    );
    document
      .querySelectorAll("[data-view]")
      .forEach((a) =>
        a.setAttribute(
          "aria-current",
          a.dataset.view === active ? "page" : "false",
        ),
      );
    if (active === "services") service(parts[1]);
    else if (groups.some(([id]) => id === parts[1])) {
      collection = parts[1];
      work();
    } else position();
    const aliases = { singstan: "kpop-sing", "range-whiteboard": "whiteboard" };
    const project = PROJECTS.find((p) => p.id === (aliases[hash] || hash));
    if (project) location.replace(`work/${project.id}/`);
    if (['work','services','about','process','contact'].includes(parts[0])) {
      requestAnimationFrame(() => document.getElementById(parts[0]).scrollIntoView({block:'start',behavior:'instant'}));
    }
  }
  for (const [id, label] of groups) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.dataset.collection = id;
    b.addEventListener("click", () => {
      collection = id;
      work();
      history.replaceState(null, "", `#work/${id}`);
    });
    document.querySelector("#collections").append(b);
  }
  for (const s of services) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = s.name;
    b.dataset.service = s.id;
    b.addEventListener("click", () => {
      service(s.id);
      history.replaceState(null, "", `#services/${s.id}`);
    });
    document.querySelector("#service-options").append(b);
  }
  function advance(direction) {
    deck.scrollBy({
      left: direction * deck.clientWidth,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  prev.addEventListener("click", () => advance(-1));
  next.addEventListener("click", () => advance(1));
  deck.addEventListener("scroll", position, { passive: true });
  deck.addEventListener("touchstart", (event) => {
    swiping = true;
    const touch = event.touches[0];
    touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      page: Math.round(deck.scrollLeft / deck.clientWidth),
    };
    clearTimeout(accessTimer);
  }, { passive: true });
  for (const eventName of ["touchend", "touchcancel"]) {
    deck.addEventListener(eventName, (event) => {
      swiping = false;
      const touch = event.changedTouches[0];
      if (touchStart && touch) {
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) {
          const direction = Math.abs(dx) >= 40 ? (dx < 0 ? 1 : -1) : 0;
          const page = Math.max(0, Math.min(deck.children.length - 1, touchStart.page + direction));
          requestAnimationFrame(() => deck.scrollTo({
            left: page * deck.clientWidth,
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
          }));
        }
      }
      touchStart = null;
      clearTimeout(accessTimer);
      accessTimer = setTimeout(settledAccess, 150);
    }, { passive: true });
  }
  deck.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      advance(e.key === "ArrowRight" ? 1 : -1);
    }
  });
  new ResizeObserver(position).observe(deck);
  document.querySelector(".theme").addEventListener("click", () => {
    const root = document.documentElement,
      dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try {
      localStorage.setItem("theme", root.dataset.theme);
    } catch (e) {}
  });
  work();
  service("products");
  view();
  window.addEventListener("hashchange", view);
})();
