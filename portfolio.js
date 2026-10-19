/* The overview autoplays silently. Reduced motion keeps a deliberate play action. */
(() => {
  const video = document.querySelector('.hero-reel video');
  const play = document.querySelector('.hero-play');
  if (!video || !play) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  const sync = () => {
    const playing = !video.paused;
    play.hidden = false;
    play.querySelector('span').textContent = playing ? (video.muted ? 'Sound on' : 'Sound off') : 'Play overview';
    play.setAttribute('aria-label', playing ? (video.muted ? 'Turn overview sound on' : 'Turn overview sound off') : 'Play portfolio overview');
  };
  const start = () => {
    video.controls = true;
    video.play().then(sync).catch(sync);
  };
  play.addEventListener('click', () => {
    if (video.paused) start();
    else { video.muted = !video.muted; sync(); }
  });
  for (const event of ['play','pause','volumechange','ended']) video.addEventListener(event, sync);
  document.querySelector('#overview-link').addEventListener('click', () => {
    video.scrollIntoView({block:'center', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    start();
  });
  if (!reduced.matches) {
    video.autoplay = true;
    video.preload = 'auto';
    start();
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) { video.autoplay = false; video.pause(); }
  });
})();
