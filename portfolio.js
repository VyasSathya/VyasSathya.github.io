/* The overview autoplays silently. Reduced motion keeps a deliberate play action. */
(() => {
  const video = document.querySelector('.hero-reel video');
  if (!video) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  const start = () => video.play().catch(() => {});
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
