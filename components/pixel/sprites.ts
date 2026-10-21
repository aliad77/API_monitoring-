// Original pixel sprites. Each line of a grid is one row of pixels; "." is
// transparent and every other character is looked up in the colour map.

export type Sprite = {
  rows: readonly string[];
  colors: Readonly<Record<string, string>>;
};

function grid(art: string): string[] {
  return art
    .trim()
    .split("\n")
    .map((row) => row.trim());
}

export const heart: Sprite = {
  rows: grid(`
    .pp.pp.
    phpppps
    ppppppp
    .ppppp.
    ..ppp..
    ...p...
  `),
  colors: {
    p: "var(--color-candy)",
    h: "#ffffff",
    s: "var(--color-lavender)",
  },
};

export const sparkle: Sprite = {
  rows: grid(`
    ..p..
    ..p..
    pphpp
    ..p..
    ..p..
  `),
  colors: { p: "var(--color-aqua)", h: "#ffffff" },
};

export const cloud: Sprite = {
  rows: grid(`
    ....ppp...
    ..ppphhpp.
    .pppppppph
    pppppppppp
    .pppppppp.
  `),
  colors: { p: "var(--color-lavender)", h: "#ffffff" },
};

// "Pip", the Pulse mascot: a little CRT that keeps an eye on your services.
export const mascot: Sprite = {
  rows: grid(`
    ..oooooooo..
    .occcccccco.
    .ocssssssco.
    .ocsassasco.
    .ocssssssco.
    .ocsgssgsco.
    .ocssggssco.
    .occcccccco.
    ..oooooooo..
    ....occo....
    ..occcccco..
    ..oooooooo..
  `),
  colors: {
    o: "var(--color-void)",
    c: "#e4ddf7",
    s: "#2a2140",
    a: "var(--color-aqua)",
    g: "var(--color-acid)",
  },
};

export const signal: Sprite = {
  rows: grid(`
    ......pp
    ......pp
    ...pp.pp
    ...pp.pp
    pp.pp.pp
    pp.pp.pp
  `),
  colors: { p: "var(--color-acid)" },
};
