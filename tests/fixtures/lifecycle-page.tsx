'use client';

// Copied temporarily into the app by browser-lifecycle.cjs.
import { useTheme } from '../../components/ThemeProvider';
export default function LifecycleCheck() {
  const theme = useTheme();
  return <div id="fixture"><button id="theme" onClick={theme.toggleTheme}>Theme</button></div>;
}
