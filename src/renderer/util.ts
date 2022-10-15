export function AddWebview(url: string) {
  // eslint-disable-next-line no-console
  console.log('Creating webview for...', url);
  const webview = document.createElement('webview');
  webview.setAttribute('src', url);
  const style = webview.shadowRoot?.querySelector('iframe')?.style;
  if (style) {
    style.borderRadius = '6px';
    // style.boxShadow = "rgba(149, 157, 165, 0.2) 0px 8px 24px";
    // style.filter = "drop-shadow(1px 2px 8px hsl(220deg 60% 50% / 0.3))";
    const webviews = document.querySelector('.webviews');
    if (webviews) {
      webviews.appendChild(webview);
      // eslint-disable-next-line no-console
      console.log('Added webview:', webview);
    }
  } else {
    throw new Error('Failed to create webviews!');
  }
}
