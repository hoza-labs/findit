export function createImageRef(source, id) {
  return { source, id };
}

export function addImageRef(tempDeck, imageRef) {
  return {
    ...tempDeck,
    selectedImageRefs: [...tempDeck.selectedImageRefs, imageRef]
  };
}

export function hasImageRef(tempDeck, imageRef) {
  return tempDeck.selectedImageRefs.some(
    (candidate) => candidate.source === imageRef.source && candidate.id === imageRef.id
  );
}

export function removeImageRef(tempDeck, imageRef) {
  let removed = false;
  return {
    ...tempDeck,
    selectedImageRefs: tempDeck.selectedImageRefs.filter((candidate) => {
      if (!removed && candidate.source === imageRef.source && candidate.id === imageRef.id) {
        removed = true;
        return false;
      }
      return true;
    })
  };
}

export function removeImageRefAtIndex(tempDeck, index) {
  return {
    ...tempDeck,
    selectedImageRefs: tempDeck.selectedImageRefs.filter((_, i) => i !== index)
  };
}

export function describeImageRef(imageRef, userImages, webImages) {
  if (imageRef.source === 'standard') {
    return imageRef.id;
  }

  if (imageRef.source === 'user') {
    const user = userImages.find((item) => item.id === imageRef.id);
    return user ? `user:${user.fileName}` : `user:${imageRef.id}`;
  }

  const web = webImages.find((item) => item.id === imageRef.id);
  return web ? `web:${web.url}` : `web:${imageRef.id}`;
}
