import { loadTempDeckOrDefault, renderDeckStatusLine } from '../modules/deckFlowCommon.js';
import { getCurrentBuildPageHref, renderBuildHeaderAndSubnav } from '../modules/buildPageNavigation.js';
import { getDeckMagicPageInfo } from '../modules/deckMagicPageModel.js';
import { ensureDeckMagicParchmentFilter } from '../modules/deckMagicParchment.js';

const pageHeading = document.querySelector('header h1');
const deckStatusLine = document.querySelector('#deck-status-line');
const buildPageSubnav = document.querySelector('#build-page-subnav');
const buildPageIntro = document.querySelector('#build-page-intro');
const deckMagicContent = document.querySelector('#deck-magic-content');
const deckMagicPreviousPage = document.querySelector('#deck-magic-first-page');
const deckMagicPageMenu = document.querySelector('#deck-magic-page-menu');
const deckMagicPageMenuButton = document.querySelector('#deck-magic-page-menu-button');
const deckMagicPageMenuList = document.querySelector('#deck-magic-page-menu-list');
const deckMagicNextPage = document.querySelector('#deck-magic-next-page');

function getCurrentDeckMagicPageNumber() {
  const pageFromBody = document.body?.dataset?.deckMagicPage;
  if (pageFromBody) {
    return pageFromBody;
  }

  const pathname = globalThis.location?.pathname ?? '';
  const pathnameMatch = pathname.match(/deck-magic-(\d+)\.html$/i);
  return pathnameMatch?.[1] ?? 1;
}

function renderDeckMagicPageMenu(pageInfo) {
  if (!deckMagicPageMenuButton || !deckMagicPageMenuList) {
    return;
  }

  const pageNumberElement = deckMagicPageMenuButton.querySelector('.deck-magic-page-menu-number');
  if (pageNumberElement) {
    pageNumberElement.textContent = pageInfo.currentPageLabel;
  } else {
    deckMagicPageMenuButton.textContent = pageInfo.currentPageLabel;
  }

  deckMagicPageMenuList.replaceChildren(
    ...pageInfo.pageMenuItems.map((menuItem) => {
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'deck-magic-page-menu-link';
      link.href = menuItem.href;
      link.textContent = menuItem.label;
      if (menuItem.isCurrent) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('is-current');
      }
      listItem.append(link);
      return listItem;
    })
  );
}

ensureDeckMagicParchmentFilter();

const tempDeck = await loadTempDeckOrDefault();
const pageInfo = getDeckMagicPageInfo(getCurrentDeckMagicPageNumber());

renderDeckStatusLine(deckStatusLine, tempDeck);
renderBuildHeaderAndSubnav({
  headingElement: pageHeading,
  subnavElement: buildPageSubnav,
  tempDeck,
  currentHref: getCurrentBuildPageHref()
});

if (buildPageIntro) {
  buildPageIntro.textContent = pageInfo.introText;
}

if (deckMagicContent) {
  deckMagicContent.replaceChildren(
    ...pageInfo.bodyParagraphs.map((paragraphText) => {
      const paragraph = document.createElement('p');
      paragraph.className = 'deck-magic-paragraph';
      paragraph.textContent = paragraphText;
      return paragraph;
    })
  );
}

if (deckMagicPreviousPage) {
  if (pageInfo.showPreviousLink) {
    deckMagicPreviousPage.href = pageInfo.previousHref;
    deckMagicPreviousPage.textContent = pageInfo.previousLabel;
    deckMagicPreviousPage.hidden = false;
  } else {
    deckMagicPreviousPage.hidden = true;
    deckMagicPreviousPage.removeAttribute('href');
  }
}

renderDeckMagicPageMenu(pageInfo);

if (deckMagicPageMenu) {
  deckMagicPageMenu.open = false;
}

if (deckMagicNextPage) {
  if (pageInfo.showNextPageLink) {
    deckMagicNextPage.href = pageInfo.nextHref;
    deckMagicNextPage.textContent = pageInfo.nextLabel;
    deckMagicNextPage.hidden = false;
  } else {
    deckMagicNextPage.hidden = true;
    deckMagicNextPage.removeAttribute('href');
  }
}
