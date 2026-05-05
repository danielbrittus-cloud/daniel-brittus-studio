const root = document.documentElement;
const glow = document.querySelector('.cursor-glow');
const revealItems = document.querySelectorAll('.reveal');
const LANGUAGE_STORAGE_KEY = 'db-language';
const languageButtons = document.querySelectorAll('[data-lang]');
const mobileGameShell = document.querySelector('#mobile-game-shell');
const mobileGameFrame = document.querySelector('[data-mobile-game-frame]');
const mobileGameClose = document.querySelector('.mobile-game-close');

const portfolioCopy = {
  PT: {
    navGames: 'Jogos',
    navStudio: 'Estudio',
    navContact: 'Contato',
    heroEyebrow: 'HTML5 games / arcade / mobile-first',
    heroTitle: 'Escolha seu jogo',
    heroCopy: 'Tres projetos jogaveis logo de cara, feitos para browser, celular e apresentacao para plataformas globais.',
    towerCardCopy: 'Construa uma torre infinita, enfrente climas e suba da cidade ate o espaco.',
    novaCardCopy: 'Defenda setores hostis, evolua seu arsenal e avance por fases desbloqueaveis.',
    parkurCardCopy: 'Corra pelos telhados, deslize no timing certo e mantenha o ritmo no limite.',
    playButton: 'Jogar',
    metricWeb: 'HTML5 leve, responsivo e preparado para iframe, mobile e desktop.',
    metricArcade: 'Loops curtos, feedback visual forte e dificuldade progressiva.',
    metricPublisher: 'Projetos pensados para retencao, clareza e apresentacao profissional.',
    screensEyebrow: 'screenshots',
    screensTitle: 'Tres jogos, tres loops claros para testar direto no browser.',
    shotParkurTitle: 'Parkur Runner',
    shotParkurCopy: 'Runner de reflexo e ritmo, com pulos, slides e progressao visual em alta velocidade.',
    shotTowerTitle: 'Tower Build',
    shotTowerCopy: 'Arcade de precisao onde cada casa encaixada leva a torre da cidade ate o espaco.',
    shotNovaTitle: 'Nova Horizon',
    shotNovaCopy: 'Acao sci-fi com fases, arsenal desbloqueado para teste e combate pensado para mobile.',
    contactEyebrow: 'publisher pitch',
    contactTitle: 'Proximo alvo: jogos web com padrao de plataforma global.',
    contactCopy: 'Daniel Brittus esta construindo um catalogo de jogos HTML5 com foco em mobile, retencao e apresentacao pronta para publishers.',
    contactButton: 'Falar com o estudio'
  },
  EN: {
    navGames: 'Games',
    navStudio: 'Studio',
    navContact: 'Contact',
    heroEyebrow: 'HTML5 games / arcade / mobile-first',
    heroTitle: 'Choose your game',
    heroCopy: 'Three playable projects up front, built for browser, mobile, and global platform review.',
    towerCardCopy: 'Build an endless tower, face changing weather, and climb from the city into space.',
    novaCardCopy: 'Defend hostile sectors, upgrade your arsenal, and progress through unlocked missions.',
    parkurCardCopy: 'Run across rooftops, slide with precise timing, and keep the rhythm at the limit.',
    playButton: 'Play',
    metricWeb: 'Lightweight HTML5 builds ready for iframe, mobile, and desktop.',
    metricArcade: 'Short loops, strong visual feedback, and progressive difficulty.',
    metricPublisher: 'Projects shaped around retention, clarity, and professional presentation.',
    screensEyebrow: 'screenshots',
    screensTitle: 'Three games, three clear loops to test directly in the browser.',
    shotParkurTitle: 'Parkur Runner',
    shotParkurCopy: 'A reflex-driven rhythm runner with jumps, slides, and fast visual progression.',
    shotTowerTitle: 'Tower Build',
    shotTowerCopy: 'A precision arcade stacker where each house pushes the tower from the city into space.',
    shotNovaTitle: 'Nova Horizon',
    shotNovaCopy: 'Sci-fi action with missions, unlocked gear for testing, and mobile-focused combat.',
    contactEyebrow: 'publisher pitch',
    contactTitle: 'Next target: web games with global platform polish.',
    contactCopy: 'Daniel Brittus is building an HTML5 game catalog focused on mobile, retention, and publisher-ready presentation.',
    contactButton: 'Contact the studio'
  }
};

function getStoredLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || localStorage.getItem('idioma_jogo');
  return saved === 'EN' ? 'EN' : 'PT';
}

function setStoredLanguage(language) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  localStorage.setItem('idioma_jogo', language);
}

function applyPortfolioLanguage(language) {
  const dictionary = portfolioCopy[language] || portfolioCopy.PT;
  document.documentElement.lang = language === 'EN' ? 'en' : 'pt-BR';

  document.querySelectorAll('[data-i18n]').forEach((item) => {
    const value = dictionary[item.dataset.i18n];
    if (value) {
      item.textContent = value;
    }
  });

  languageButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.lang === language));
  });
}

applyPortfolioLanguage(getStoredLanguage());

languageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const language = button.dataset.lang === 'EN' ? 'EN' : 'PT';
    setStoredLanguage(language);
    applyPortfolioLanguage(language);
  });
});

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

function isMobilePlaySurface() {
  return window.matchMedia('(pointer: coarse), (max-width: 900px)').matches;
}

async function requestShellFullscreen() {
  if (!mobileGameShell) {
    return;
  }

  const request =
    mobileGameShell.requestFullscreen ||
    mobileGameShell.webkitRequestFullscreen ||
    mobileGameShell.msRequestFullscreen;

  if (!document.fullscreenElement && !document.webkitFullscreenElement && request) {
    await request.call(mobileGameShell, { navigationUI: 'hide' });
  }
}

async function lockLandscape() {
  if (screen.orientation && screen.orientation.lock) {
    await screen.orientation.lock('landscape');
  }
}

function closeMobileGame() {
  mobileGameShell?.classList.remove('is-active');
  mobileGameShell?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mobile-game-open');

  if (mobileGameFrame) {
    mobileGameFrame.removeAttribute('src');
  }

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

document.querySelectorAll('[data-mobile-play="nova-horizon"]').forEach((link) => {
  link.addEventListener('click', async (event) => {
    if (!isMobilePlaySurface() || !mobileGameShell || !mobileGameFrame) {
      return;
    }

    event.preventDefault();
    mobileGameShell.classList.add('is-active');
    mobileGameShell.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mobile-game-open');

    try {
      await requestShellFullscreen();
    } catch (error) {
      console.info('Fullscreen indisponivel neste navegador.', error);
    }

    try {
      await lockLandscape();
    } catch (error) {
      console.info('Bloqueio de orientacao indisponivel neste navegador.', error);
    }

    mobileGameFrame.src = `${link.href}?embedded=1`;
  });
});

mobileGameClose?.addEventListener('click', closeMobileGame);
