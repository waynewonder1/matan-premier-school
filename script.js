// ---------- Mobile nav toggle ----------

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.classList.toggle('open', isOpen);
  menuToggle.setAttribute('aria-expanded', isOpen);
});

// Close the menu if someone clicks a link (nice on mobile)
navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

// ---------- Nursery mobile: click a shape to pause/resume its sway ----------

const shapes = document.querySelectorAll('[data-shape]');

shapes.forEach((shape) => {
  shape.addEventListener('click', () => {
    shape.classList.toggle('paused');
  });
});