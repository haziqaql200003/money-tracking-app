import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const APP_NAME = 'WaKira'; // i18n-ignore: brand name

/**
 * The web page around the app (web only). It makes "Add to Home Screen" open WaKira like an app:
 * no browser bar, its own icon and name, and the screen reaching under the notch.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ms">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{APP_NAME}</title>
        <meta name="description" content="WaKira: rekod wang, bajet, hutang dan matlamat." />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#208AEF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="WaKira" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
