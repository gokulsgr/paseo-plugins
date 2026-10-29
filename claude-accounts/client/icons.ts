const rays = Array.from({ length: 12 }, (_, i) => {
  const length = i % 2 === 0 ? 9.5 : 7.5;
  return `<rect x="11.1" y="${12 - length}" width="1.8" height="${length}" rx="0.9" transform="rotate(${i * 30} 12 12)"/>`;
}).join("");

export const claudeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#D97757">${rays}</g></svg>`;
