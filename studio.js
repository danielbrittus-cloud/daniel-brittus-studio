const root = document.documentElement;
const glow = document.querySelector('.cursor-glow');
const revealItems = document.querySelectorAll('.reveal');

window.addEventListener('pointermove', (event) => {
  if (!glow) {
    return;
  }

  root.style.setProperty('--cursor-x', `${event.clientX}px`);
  root.style.setProperty('--cursor-y', `${event.clientY}px`);
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => observer.observe(item));

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
