export function renderDeck(targetElement, deckModel) {
  if (!targetElement) {
    throw new Error('targetElement is required.');
  }

  targetElement.innerHTML = '';

  for (let i = 0; i < deckModel.cards.length; i += 1) {
    const card = deckModel.cards[i];
    const article = document.createElement('article');
    article.className = 'deck-card';

    const heading = document.createElement('h3');
    heading.textContent = `Card ${i + 1}`;

    const list = document.createElement('ul');
    list.className = 'symbol-list';

    for (const symbol of card) {
      const item = document.createElement('li');
      item.textContent = `Symbol ${symbol}`;
      list.appendChild(item);
    }

    article.append(heading, list);
    targetElement.appendChild(article);
  }
}

export function updateSummary(targetElement, deckModel) {
  if (!targetElement) {
    throw new Error('targetElement is required.');
  }

  targetElement.textContent = `Generated ${deckModel.deckSize} cards with ${deckModel.symbolsPerCard} symbols per card.`;
}
