import type { Provider } from "../shared/accounts";

const rays = Array.from({ length: 12 }, (_, i) => {
  const length = i % 2 === 0 ? 9.5 : 7.5;
  return `<rect x="11.1" y="${12 - length}" width="1.8" height="${length}" rx="0.9" transform="rotate(${i * 30} 12 12)"/>`;
}).join("");

const petals = Array.from(
  { length: 6 },
  (_, i) => `<ellipse cx="12" cy="7.6" rx="2.9" ry="4.6" transform="rotate(${i * 60} 12 12)"/>`,
).join("");

export const claudeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#D97757">${rays}</g></svg>`;
export const codexIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${petals}</svg>`;
export const cursorIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2 21 7v10l-9 5-9-5V7z"/><path d="M12 12 21 7M12 12v10M12 12 3 7"/></svg>`;
export const accountsIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 11h5M19.5 8.5v5"/></svg>`;

export type ProviderInfo = {
  title: string;
  icon: string;
  intro: string;
  signIn: string;
  /** Placeholder for what the sign-in page hands back; null when nothing needs pasting. */
  codePlaceholder: string | null;
};

export const providerInfo: Record<Provider, ProviderInfo> = {
  claude: {
    title: "Claude",
    icon: claudeIcon,
    intro:
      "Optional. Paseo can use your normal Claude login; add accounts only if you want quick switching without moving chat sessions.",
    signIn: "Finish signing in in your browser. If it did not open, use the link, then paste the code it shows.",
    codePlaceholder: "Paste the code here",
  },
  codex: {
    title: "Codex",
    icon: codexIcon,
    intro:
      "Optional. Paseo can use your normal Codex login; add accounts only if you want quick switching without moving chat history.",
    signIn:
      "Finish signing in in your browser. If the page then fails to open a 127.0.0.1 address, copy that whole address here.",
    codePlaceholder: "Paste the 127.0.0.1:1455 address",
  },
  cursor: {
    title: "Cursor",
    icon: cursorIcon,
    intro:
      "Cursor's CLI keeps one login for this whole computer, so switching changes it for every running Cursor agent too. The Cursor app's own login is not touched.",
    signIn: "Finish signing in in your browser. If it did not open, use the link.",
    codePlaceholder: null,
  },
};
