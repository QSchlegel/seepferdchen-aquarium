/**
 * Everyone who lives in the tank. Colours and proportions are passed straight
 * through to the drawing routines; the rest drives behaviour and the gallery.
 */
import type { CreatureSpec } from '$lib/sim/types';

export const CAST: CreatureSpec[] = [
  /* ---------------------------------------------------- the Rangers */
  {
    id: 'elli', name: 'Elli', kind: 'merperson', size: 52, tailSpeed: 3.2, speed: 30,
    upright: true, vegetarian: true, sparkles: 1, group: 'rangers',
    hairStyle: 'curly', hair: '#2c1a26', hairHi: '#4d2436', streak: '#c0396b',
    skin: '#8a5a3c', skinDark: '#6f462e',
    top: '#fdfbff', topAlt: '#9b7ad6', pattern: 'flowers',
    tail: '#f4a3c6', tailDark: '#dd7ba7',
    accessory: 'starfish', accColor: '#ef6a3d',
    about: {
      de: 'Meermädchen mit verstauchter Hand — und Stormis bester Freundin.',
      en: 'The mermaid with the sprained hand — and Stormi’s best friend.'
    }
  },
  {
    id: 'mona', name: 'Mona', kind: 'merperson', size: 48, tailSpeed: 3.6, speed: 32,
    upright: true, vegetarian: true, group: 'rangers',
    hairStyle: 'ponytail', hair: '#f0c96a', hairHi: '#ffe09a', streak: '#ff9ec7', tie: '#ff9ec7',
    skin: '#f3cfae', skinDark: '#dcae89',
    top: '#fff1f4', topAlt: '#e0679c', pattern: 'stripes',
    tail: '#f0803a', tailDark: '#d1631f',
    glasses: true, glassCol: '#5a4a7a',
    about: { de: 'Trägt Brille, kennt jede Regel im Wasserball.', en: 'Wears glasses, knows every water-polo rule.' }
  },
  {
    id: 'maris', name: 'Maris', kind: 'merperson', size: 50, tailSpeed: 3.4, speed: 31,
    upright: true, vegetarian: true, group: 'rangers',
    hairStyle: 'short', hair: '#6b4023', hairHi: '#8a5730',
    skin: '#f0c39c', skinDark: '#d5a179',
    top: '#c94a33', topAlt: '#7d2c1c', pattern: 'plaid',
    tail: '#4fb8a8', tailDark: '#2f8d80',
    about: { de: 'Ellis Klassenkamerad. Er nimmt sie mit zum Seepferdchenhof.', en: 'Elli’s classmate. He takes her to the seahorse farm.' }
  },

  /* ------------------------------------------------- seahorse farm */
  {
    id: 'ellistormi', name: 'Elli & Stormi', kind: 'rider', size: 60, tailSpeed: 3, phase: 1,
    speed: 26, upright: true, vegetarian: true, sparkles: 1, group: 'rangers',
    body: '#ffc63d', accent: '#ffe89a', fin: '#f7a23a', dark: '#e0921c', rein: '#e05a3a',
    rider: {
      phase: 1, skin: '#8a5a3c', skinDark: '#6f462e',
      hair: '#2c1a26', hairHi: '#4d2436', streak: '#c0396b',
      top: '#fdfbff', topAlt: '#9b7ad6',
      tail: '#f4a3c6', tailDark: '#dd7ba7', accColor: '#ef6a3d'
    },
    about: { de: 'Die beiden gehören zusammen. Für immer!', en: 'The two of them belong together. Forever!' }
  },
  {
    id: 'stormi', name: 'Stormi', kind: 'seahorse', size: 54, tailSpeed: 3, speed: 26,
    upright: true, sparkles: 1, group: 'seahorses',
    body: '#ffc63d', accent: '#ffe89a', fin: '#f7a23a', dark: '#e0921c',
    about: { de: 'Das Rennseepferdchen. Jetzt sicher auf dem Hof.', en: 'The racing seahorse. Safe on the farm now.' }
  },
  {
    id: 'finni', name: 'Finni', kind: 'seahorse', size: 44, tailSpeed: 3.4, phase: 3, speed: 28,
    upright: true, group: 'seahorses',
    body: '#d2547e', accent: '#f2a6c0', fin: '#7fc46a', dark: '#a83a60',
    about: { de: 'Pink mit grünen Flossen und viel zu viel Schwung.', en: 'Pink with green fins and far too much bounce.' }
  },
  {
    id: 'lila', name: 'Lila', kind: 'seahorse', size: 40, tailSpeed: 3.8, phase: 5, speed: 29,
    upright: true, group: 'seahorses',
    body: '#9a86d6', accent: '#cfc2f2', fin: '#ffe066', dark: '#7a66b8',
    about: { de: 'Ruhig und freundlich, mag Seegras am liebsten.', en: 'Calm and friendly, likes seagrass best.' }
  },
  {
    id: 'sandy', name: 'Sandy', kind: 'seahorse', size: 28, tailSpeed: 4.2, speed: 44,
    upright: true, mode: 'follow', leader: 'stormi', followOffset: { x: -40, y: 20 }, group: 'seahorses',
    body: '#f2dfae', accent: '#fff6de', fin: '#dcc389', dark: '#d99a28',
    about: { de: 'Fohlen. Schwimmt Stormi überallhin nach.', en: 'A foal. Follows Stormi everywhere.' }
  },
  {
    id: 'pebble', name: 'Pebble', kind: 'seahorse', size: 30, tailSpeed: 4.6, speed: 44,
    upright: true, mode: 'follow', leader: 'stormi', followOffset: { x: -56, y: -6 }, group: 'seahorses',
    body: '#9db4c8', accent: '#dfe9f2', fin: '#7d95ab', dark: '#d99a28',
    about: { de: 'Fohlen. Immer als Erstes am Futter.', en: 'A foal. Always first to the food.' }
  },
  {
    id: 'nugget', name: 'Nugget', kind: 'seahorse', size: 31, tailSpeed: 4, speed: 44,
    upright: true, mode: 'follow', leader: 'stormi', followOffset: { x: -72, y: 26 }, group: 'seahorses',
    body: '#f0a018', accent: '#ffdf95', fin: '#ffeec2', dark: '#d99a28',
    about: { de: 'Fohlen. Das langsamste — und das frechste.', en: 'A foal. The slowest — and the cheekiest.' }
  },

  /* ------------------------------------------------------- unicorns */
  {
    id: 'luna', name: 'Luna', kind: 'unicornLand', size: 44, tailSpeed: 5.4, phase: 0, speed: 44,
    sparkles: 1, group: 'unicorns',
    body: '#fdfaff', shade: '#e6dcf5',
    mane: ['#ff9ec7', '#ffc4e2', '#ffe9a3', '#b9f5dd', '#a9dcff', '#d8bcff'],
    about: { de: 'Galoppiert einfach durchs Wasser. Warum auch nicht?', en: 'Simply gallops through the water. Why not?' }
  },
  {
    id: 'blossom', name: 'Blossom', kind: 'unicornLand', size: 38, tailSpeed: 6.2, phase: 2, speed: 46,
    sparkles: 1, group: 'unicorns',
    body: '#ffd2e4', shade: '#eda9c8',
    mane: ['#ffb3d1', '#ffd6a8', '#fff0a8', '#c7f5d8', '#bfe4ff', '#e2c4ff'],
    about: { de: 'Die kleinere Schwester. Immer einen Sprung schneller.', en: 'The little sister. Always a jump quicker.' }
  },
  {
    id: 'coralia', name: 'Coralia', kind: 'seaUnicorn', size: 46, tailSpeed: 3.6, phase: 1, speed: 34,
    sparkles: 1, group: 'unicorns',
    body: '#f7f4ff', shade: '#ded4f2', tail: '#a9d8ff',
    mane: ['#a9dcff', '#c9f0ff', '#d8bcff', '#ffc4e2', '#b9f5dd', '#ffe9a3'],
    about: { de: 'Halb Einhorn, halb Fisch. Ganz und gar Zauber.', en: 'Half unicorn, half fish. Entirely magic.' }
  },
  {
    id: 'stardust', name: 'Stardust', kind: 'unicorn', size: 30, tailSpeed: 5.2, speed: 46,
    sparkles: 1, group: 'unicorns',
    body: '#ffffff', accent: '#ffe6f7', fin: '#ffc2e8',
    about: { de: 'Einhornfisch. Hinterlässt eine Spur aus Glitzer.', en: 'A unicorn fish. Leaves a trail of glitter.' }
  },
  {
    id: 'twinkletail', name: 'Twinkletail', kind: 'unicorn', size: 25, tailSpeed: 6.2, speed: 54,
    sparkles: 1, group: 'unicorns',
    body: '#a8d4f5', accent: '#dff0ff', fin: '#5a9fd4',
    rainbow: ['#ff8fc7', '#ffc2e8', '#ffe066', '#b8f5dd', '#a8d8ff', '#d9b8ff'],
    about: { de: 'Der schnellste Einhornfisch im ganzen Riff.', en: 'The fastest unicorn fish on the reef.' }
  },

  /* ---------------------------------------------------------- fish */
  { id: 'mango', name: 'Mango', kind: 'fish', shape: 'clown', size: 26, tailSpeed: 7, group: 'fish',
    body: '#ff8a3d', accent: '#ffffff', fin: '#ff6b1a',
    about: { de: 'Clownfisch. Frecher, als er aussieht.', en: 'A clownfish. Cheekier than he looks.' } },
  { id: 'bluebell', name: 'Bluebell', kind: 'fish', shape: 'tang', size: 28, tailSpeed: 6.4, group: 'fish',
    body: '#3aa0ff', accent: '#ffd93d', fin: '#1f6fd0',
    about: { de: 'Doktorfisch mit gelbem Streifen.', en: 'A tang with a yellow stripe.' } },
  { id: 'sunny', name: 'Sunny', kind: 'fish', shape: 'goldfish', size: 24, tailSpeed: 7.6, group: 'fish',
    body: '#ffc93c', accent: '#ffe999', fin: '#ff9f1c',
    about: { de: 'Goldfisch. Frisst am liebsten zuerst.', en: 'A goldfish. Prefers to eat first.' } },
  { id: 'pearl', name: 'Pearl', kind: 'fish', shape: 'angel', size: 27, tailSpeed: 6, group: 'fish',
    body: '#f6f2ff', accent: '#b39bff', fin: '#d9ccff',
    about: { de: 'Kaiserfisch, blass wie eine Perle.', en: 'An angelfish, pale as a pearl.' } },
  { id: 'ziggy', name: 'Ziggy', kind: 'fish', shape: 'guppy', size: 20, tailSpeed: 8.6, group: 'fish',
    body: '#7ef0c8', accent: '#ff7ab0', fin: '#43d9a3',
    about: { de: 'Kleiner Guppy mit rosa Punkten.', en: 'A little guppy with pink spots.' } },
  { id: 'puffy', name: 'Puffy', kind: 'fish', shape: 'puffer', size: 25, tailSpeed: 6.8, group: 'fish',
    body: '#ffd6a0', accent: '#c98b4b', fin: '#f0b874',
    about: { de: 'Kugelfisch. Rund und immer erstaunt.', en: 'A pufferfish. Round and permanently surprised.' } },
  { id: 'coco', name: 'Coco', kind: 'fish', shape: 'clown', size: 22, tailSpeed: 8, group: 'fish',
    body: '#ff5c8a', accent: '#fff0f5', fin: '#e0356b',
    about: { de: 'Pink gestreift und ziemlich schnell.', en: 'Pink-striped and rather quick.' } },
  { id: 'splash', name: 'Splash', kind: 'fish', shape: 'tang', size: 24, tailSpeed: 7.2, group: 'fish',
    body: '#a06bff', accent: '#ffe066', fin: '#7b45d6',
    about: { de: 'Lila Doktorfisch mit gelber Flosse.', en: 'A purple tang with a yellow fin.' } },
  { id: 'pepper', name: 'Pepper', kind: 'fish', shape: 'goldfish', size: 22, tailSpeed: 7.8, group: 'fish',
    body: '#c0392b', accent: '#ffd0b8', fin: '#e04f22',
    about: { de: 'Orange und gesprenkelt.', en: 'Orange and speckled.' } },
  { id: 'rosie', name: 'Rosie', kind: 'fish', shape: 'guppy', size: 21, tailSpeed: 8.2, group: 'fish',
    body: '#a259c4', accent: '#ffd0e6', fin: '#e02b7c',
    about: { de: 'Neonpink. Man sieht sie von weitem.', en: 'Neon pink. You can spot her a mile off.' } },
  { id: 'rainbow', name: 'Rainbow', kind: 'parrot', size: 27, tailSpeed: 6.4, group: 'fish',
    body: '#d98cf7', top: '#7b45d6', belly: '#ffe066', belly2: '#7ef0c8',
    fin: '#ff6fae', fin2: '#5f2fb8', accent: '#fff', beak: '#ffc26e',
    about: { de: 'Papageifisch mit echtem Schnabel.', en: 'A parrotfish with a real beak.' } },

  /* ------------------------------------------------------- the shoals */
  ...shoal('blue', 'Der blaue Schwarm', 'The Blue Shoal', 14,
    ['#5f7fd6', '#6f8fe0', '#7fa3e8', '#5468b8'], '#cfe0ff', '#3f57a8'),
  ...shoal('sunny', 'Der gelbe Schwarm', 'The Sunny Shoal', 14,
    ['#ffc93c', '#ffb02e', '#ffd76e', '#ff9f43'], '#fff0b8', '#e59a12'),
  ...shoal('coral', 'Der rosa Schwarm', 'The Coral Shoal', 12,
    ['#ff7ab0', '#ff9ec7', '#ff6b8a', '#ffb3c9'], '#ffd6e8', '#d94f88'),

  /* ---------------------------------------------------- other friends */
  { id: 'finn', name: 'Finn', kind: 'shark', size: 56, tailSpeed: 3.4, speed: 36, group: 'friends', likes: 'krill', scary: true,
    body: '#8fa8bd', accent: '#e7f0f7', fin: '#6f89a0',
    about: { de: 'Ein freundlicher Hai. Wirklich!', en: 'A friendly shark. Honestly!' } },
  { id: 'shelly', name: 'Shelly', kind: 'turtle', size: 34, tailSpeed: 2.6, speed: 24, group: 'friends', likes: 'greens',
    body: '#b07a41', accent: '#8a5a2c', fin: '#8cc96b',
    about: { de: 'Meeresschildkröte mit braunem Panzer.', en: 'A sea turtle with a brown shell.' } },
  { id: 'ollie', name: 'Ollie', kind: 'octopus', size: 32, tailSpeed: 2.2, speed: 22, group: 'friends', likes: 'krill',
    body: '#c471f5', accent: '#f2c6ff', fin: '#a44de0',
    about: { de: 'Krake mit acht Armen und guter Laune.', en: 'An octopus with eight arms and a good mood.' } },
  { id: 'zebra', name: 'Ziggy-Zebra', kind: 'eel', size: 26, tailSpeed: 2.6, phase: 1, speed: 30, group: 'friends', likes: 'krill', scary: true,
    body: '#f2e6d2', accent: '#5b3a24', fin: '#e0cdb0',
    about: { de: 'Zebra-Muräne. Schlängelt sich durchs Riff.', en: 'A zebra moray. Winds through the reef.' } },
  { id: 'wobble', name: 'Wobble', kind: 'jelly', size: 26, mode: 'drift', tailSpeed: 1.8, group: 'friends',
    body: 'rgba(255,180,230,.75)', accent: '#fff', fin: 'rgba(255,150,215,.6)',
    about: { de: 'Qualle. Schwebt immer nach oben.', en: 'A jellyfish. Always floating upwards.' } },
  { id: 'glow', name: 'Glow', kind: 'jelly', size: 20, mode: 'drift', tailSpeed: 1.8, group: 'friends',
    body: 'rgba(180,230,255,.75)', accent: '#fff', fin: 'rgba(150,210,255,.6)',
    about: { de: 'Die kleine blaue Qualle.', en: 'The little blue jellyfish.' } },
  { id: 'snappy', name: 'Snappy', kind: 'crab', size: 24, mode: 'crawl', tailSpeed: 6, speed: 26, group: 'friends', likes: 'krill',
    body: '#e0463c', accent: '#ff8f7a', fin: '#b8322a',
    about: { de: 'Krabbe mit langen weißen Augen.', en: 'A crab with long white eyes.' } },
  { id: 'shelby', name: 'Shelby', kind: 'snail', size: 26, mode: 'crawl', tailSpeed: 2.4, phase: 2, speed: 8, group: 'friends', likes: 'greens',
    body: '#e79ec8', foot: '#f2dcea',
    about: { de: 'Rüsselschnecke. Hat es nie eilig.', en: 'A sea snail. Never in a hurry.' } },
  { id: 'twinkle', name: 'Twinkle', kind: 'star', size: 22, mode: 'static', tailSpeed: 1.4, group: 'friends',
    body: '#ff8fc7', accent: '#ffd6ea', fin: '#e05fa3',
    about: { de: 'Seestern. Sitzt am liebsten still im Sand.', en: 'A starfish. Happiest sitting still in the sand.' } }
];

/** Build one shoal of little fish that all move as a single body. */
function shoal(key: string, nameDe: string, nameEn: string, n: number,
               bodies: string[], accent: string, fin: string): CreatureSpec[] {
  const out: CreatureSpec[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `${key}-${i}`,
      name: nameDe,
      nameEn,
      kind: 'minnow',
      size: 12 + (i % 4) * 1.6,
      mode: 'school',
      shoal: key,
      tailSpeed: 10 + (i % 5),
      speed: 70,
      hidden: i > 0, // only one entry per shoal shows in the gallery
      group: 'shoals',
      body: bodies[i % bodies.length], accent, fin,
      offset: {
        x: Math.cos((i / n) * Math.PI * 2) * (40 + (i % 3) * 22) + (i % 5) * 6,
        y: Math.sin((i / n) * Math.PI * 2) * (24 + (i % 4) * 10)
      },
      about: {
        de: `${n} kleine Fische, die immer zusammen schwimmen.`,
        en: `${n} little fish that always swim together.`
      }
    });
  }
  return out;
}

/**
 * Are these the same character?
 *
 * A shoal shares a name and a look across every member, so "Mango" is the
 * whole shoal, not the one fish that happens to carry the gallery card. The
 * seek game asks this rather than comparing ids, or tapping a fish that plainly
 * is Mango would be marked wrong.
 */
export function sameCharacter(a: CreatureSpec, b: CreatureSpec) {
  if (a.id === b.id) return true;
  return !!a.shoal && a.shoal === b.shoal;
}

/** Everyone worth showing on a card. */
export const GALLERY = CAST.filter((c) => !c.hidden);
