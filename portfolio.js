/* Overview starts only after an explicit play action. Native controls handle sound. */
(() => {
  const video = document.querySelector('.hero-reel video');
  const play = document.querySelector('.hero-play');
  if (!video || !play) return;
  const start = () => {
    video.controls = true;
    video.play().then(() => { play.hidden = true; video.focus(); }).catch(() => { video.focus(); });
  };
  play.addEventListener('click', start);
  video.addEventListener('play', () => { play.hidden = true; });
  video.addEventListener('ended', () => { play.hidden = false; });
  document.querySelector('#overview-link').addEventListener('click', () => {
    video.scrollIntoView({block:'center', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    start();
  });
})();
