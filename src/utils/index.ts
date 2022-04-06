export const removeTextInSharePost = () => {
  debugger;
  const xpath =
    "//a[contains(text(),'to download the latest Chrome extension')]";
  const matchingElement = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;
  if (matchingElement) {
    if (matchingElement && matchingElement.parentElement) {
      matchingElement.parentElement.style.display = 'none';
    }
  }
};
