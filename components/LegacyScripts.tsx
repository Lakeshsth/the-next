'use client';

import { useEffect } from 'react';

const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];
const PARTS = ['/js/part1.js', '/js/part2.js', '/js/part3.js', '/js/part4.js'];

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(s);
  });
}

export default function LegacyScripts() {
  useEffect(() => {
    const w = window as unknown as { __nextToolsLoaded?: boolean };
    if (w.__nextToolsLoaded) return; // stops double-run in dev mode
    w.__nextToolsLoaded = true;

    (async () => {
      for (const src of [...LIBS, ...PARTS]) {
        await loadScript(src); // one by one, in order
      }
    })().catch(console.error);
  }, []);

  return null;
}