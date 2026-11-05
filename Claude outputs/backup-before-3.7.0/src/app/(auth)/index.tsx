import { Redirect } from 'expo-router';

/**
 * Start page when signed out. Since SDK 58 the router no longer falls back to the first signed-out screen by itself
 * (the page at "/" is the signed-in Home, which is hidden), so it would show "Unmatched Route".
 */
export default function AuthIndex() {
  return <Redirect href="/welcome" />;
}
