/** The story of Band 2, in short pages a five-year-old can follow. */

export interface StoryPage {
  /** id of a creature to show alongside the text. */
  who: string;
  de: string;
  en: string;
}

export const STORY: StoryPage[] = [
  { who: 'elli',
    de: 'Elli hat sich die Hand verstaucht. Wasserball darf sie jetzt nicht mehr spielen — und ihr Team fehlt ihr sehr.',
    en: 'Elli has sprained her hand. No more water polo for now — and she misses her team badly.' },
  { who: 'maris',
    de: 'Ihr Klassenkamerad Maris nimmt sie mit. Sie schwimmen zusammen zum Seepferdchenhof.',
    en: 'Her classmate Maris takes her along. Together they swim to the seahorse farm.' },
  { who: 'stormi',
    de: 'Dort steht Stormi, das Rennseepferdchen. Sein Besitzer war nicht gut zu ihm.',
    en: 'There stands Stormi, the racing seahorse. His owner was not kind to him.' },
  { who: 'stormi',
    de: 'Stormi vertraut keinem Meermenschen mehr. Er lässt niemanden nah an sich heran.',
    en: 'Stormi does not trust merpeople any more. He lets nobody near him.' },
  { who: 'elli',
    de: 'Aber Elli gibt nicht auf. Jeden Tag kommt sie wieder — ganz langsam, ganz leise.',
    en: 'But Elli does not give up. Every day she comes back — slowly, quietly.' },
  { who: 'ellistormi',
    de: 'Und eines Tages darf sie auf seinen Rücken. Noch nie hat sie sich so glücklich gefühlt.',
    en: 'And one day she may climb onto his back. She has never felt so happy.' },
  { who: 'finni',
    de: 'Dann taucht Stormis böser Besitzer auf. Elli, Maris, Finni und die anderen wirbeln durchs Wasser.',
    en: 'Then Stormi’s cruel owner turns up. Elli, Maris, Finni and the others whirl through the water.' },
  { who: 'ellistormi',
    de: 'Stormi ist gerettet. Er bleibt auf dem Seepferdchenhof. Und er hat Elli. Die beiden gehören zusammen. Für immer!',
    en: 'Stormi is safe. He stays at the seahorse farm. And he has Elli. The two of them belong together. Forever!' }
];

/** The short lines that drift across the top of the tank. */
export const TICKER = STORY.map((p) => ({ de: p.de.split('.')[0] + '.', en: p.en.split('.')[0] + '.' }));
