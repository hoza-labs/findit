const MENU_SELECTOR = 'details.top-page-menu-mobile, details.play-info-menu, details.editor-nav-file-menu, details.image-menu, details.quick-deck-menu, details.deck-magic-page-menu';

function getOpenMenus() {
  return [...document.querySelectorAll(MENU_SELECTOR)].filter((menu) => menu.open);
}

function closeMenus(exceptMenu = null) {
  for (const menu of getOpenMenus()) {
    if (menu !== exceptMenu) {
      menu.open = false;
    }
  }
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  const containingMenu = target instanceof Element ? target.closest(MENU_SELECTOR) : null;
  closeMenus(containingMenu);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  const openMenus = getOpenMenus();
  if (openMenus.length === 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  for (const menu of openMenus) {
    menu.open = false;
  }
}, true);
