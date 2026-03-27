export function getRequiredImageCount(tempDeck) {
  return tempDeck.symbolsPerCard * (tempDeck.symbolsPerCard - 1) + 1;
}

export function getSelectImagesIntroText(tempDeck) {
  const remainingImageCount = getRequiredImageCount(tempDeck) - tempDeck.selectedImageRefs.length;

  if (remainingImageCount <= 0) {
    return 'Select the images you want to have in your deck. Congrats! You\'ve got all the images you need for your deck!';
  }

  const moreText = tempDeck.selectedImageRefs.length > 0 ? ' more' : '';
  const imageLabel = remainingImageCount === 1 ? 'image' : 'images';
  return `Select the images you want to have in your deck. You need to select ${remainingImageCount}${moreText} ${imageLabel} to create your deck.`;
}

export function renderSelectImagesIntro(targetElement, tempDeck) {
  if (!targetElement) {
    return;
  }

  targetElement.textContent = getSelectImagesIntroText(tempDeck);
}
