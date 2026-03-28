import { loadTempDeckOrDefault, renderDeckStatusLine } from '../modules/deckFlowCommon.js';
import { getCurrentBuildPageHref, renderBuildHeaderAndSubnav } from '../modules/buildPageNavigation.js';
import { getDeckMagicPageInfo } from '../modules/deckMagicPageModel.js';
import { ensureDeckMagicParchmentFilter } from '../modules/deckMagicParchment.js';

const pageHeading = document.querySelector('header h1');
const deckStatusLine = document.querySelector('#deck-status-line');
const buildPageSubnav = document.querySelector('#build-page-subnav');
const buildPageIntro = document.querySelector('#build-page-intro');
const deckMagicContent = document.querySelector('#deck-magic-content');
const deckMagicStartOver = document.querySelector('#deck-magic-start-over');
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

if (deckMagicStartOver) {
  deckMagicStartOver.href = pageInfo.startOverHref;
}

if (deckMagicNextPage) {
  if (pageInfo.showNextPageLink) {
    deckMagicNextPage.href = pageInfo.nextHref;
    deckMagicNextPage.hidden = false;
  } else {
    deckMagicNextPage.hidden = true;
    deckMagicNextPage.removeAttribute('href');
  }
}
