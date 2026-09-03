// ---------- Wrap page content, excluding the accessibility widget ----------
// Effects like colour-invert and magnification get applied to this wrapper
// instead of <body>. This matters because CSS filters create a new
// "containing block" for anything position:fixed inside them — so filtering
// <body> directly makes the fixed widget button jump away from the viewport
// and stick to the bottom of the whole page instead. Keeping the widget as
// a sibling of this wrapper (not a child) avoids that entirely.

const excludedIds = ['a11yToggle', 'a11yPanel'];
const siteContent = document.createElement('div');
siteContent.id = 'siteContent';

Array.from(document.body.childNodes).forEach((node) => {
  const isExcluded = node.id && excludedIds.includes(node.id);
  const isScript = node.tagName === 'SCRIPT';
  if (!isExcluded && !isScript) {
    siteContent.appendChild(node);
  }
});

document.body.insertBefore(siteContent, document.body.firstChild);

// ---------- Mobile nav toggle ----------

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------- Hero image carousel ----------

const slides = document.querySelectorAll('.carousel-slide');
let currentSlide = 0;

if (slides.length > 0) {
  setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 4000);
}

// ---------- Magnifying glass ----------

const a11yMagnify = document.getElementById('a11yMagnify');
const MAGNIFIER_ZOOM = 2;
const LENS_SIZE = 180;
let magnifierActive = false;
let magnifierLens = null;
let magnifierClone = null;

function moveMagnifier(e) {
  magnifierLens.style.left = `${e.clientX - LENS_SIZE / 2}px`;
  magnifierLens.style.top = `${e.clientY - LENS_SIZE / 2}px`;

  magnifierClone.style.left = `${-(e.clientX * MAGNIFIER_ZOOM - LENS_SIZE / 2)}px`;
  magnifierClone.style.top = `${-(e.clientY * MAGNIFIER_ZOOM - LENS_SIZE / 2)}px`;
}

function turnOnMagnifier() {
  // Clone only the content wrapper, not <body> — avoids duplicating the
  // widget's own buttons (with clashing duplicate IDs) inside the lens.
  magnifierClone = siteContent.cloneNode(true);
  magnifierClone.classList.add('magnifier-clone');
  magnifierClone.style.width = `${siteContent.scrollWidth}px`;
  magnifierClone.style.transform = `scale(${MAGNIFIER_ZOOM})`;

  magnifierLens = document.createElement('div');
  magnifierLens.className = 'magnifier-lens';
  magnifierLens.appendChild(magnifierClone);
  document.body.appendChild(magnifierLens);

  document.addEventListener('mousemove', moveMagnifier);
  magnifierActive = true;
  a11yMagnify.textContent = 'Turn Off Magnifier';
}

function turnOffMagnifier() {
  document.removeEventListener('mousemove', moveMagnifier);
  if (magnifierLens) {
    magnifierLens.remove();
    magnifierLens = null;
    magnifierClone = null;
  }
  magnifierActive = false;
  a11yMagnify.textContent = 'Magnifying Glass';
}

if (a11yMagnify) {
  a11yMagnify.addEventListener('click', () => {
    magnifierActive ? turnOffMagnifier() : turnOnMagnifier();
  });
}

// ---------- Accessibility widget (panel + other options) ----------

const a11yToggle = document.getElementById('a11yToggle');
const a11yPanel = document.getElementById('a11yPanel');

if (a11yToggle && a11yPanel) {
  a11yToggle.addEventListener('click', () => {
    a11yPanel.classList.toggle('open');
  });

  let letterSpacing = 0;

  document.getElementById('a11yIncreaseSpacing').addEventListener('click', () => {
    letterSpacing = Math.min(letterSpacing + 1, 6);
    siteContent.style.letterSpacing = `${letterSpacing}px`;
  });

  document.getElementById('a11yDecreaseSpacing').addEventListener('click', () => {
    letterSpacing = Math.max(letterSpacing - 1, 0);
    siteContent.style.letterSpacing = `${letterSpacing}px`;
  });

  document.getElementById('a11yInvert').addEventListener('click', () => {
    siteContent.classList.toggle('a11y-invert');
  });

  document.getElementById('a11yUnderline').addEventListener('click', () => {
    siteContent.classList.toggle('a11y-underline');
  });

  document.getElementById('a11yReset').addEventListener('click', () => {
    letterSpacing = 0;
    siteContent.style.letterSpacing = '0px';
    siteContent.classList.remove('a11y-invert', 'a11y-underline');
    if (magnifierActive) turnOffMagnifier();
  });
}  