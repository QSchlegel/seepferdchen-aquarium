/**
 * Everything a link preview needs. Prerendered into each page, so the text is
 * fixed at build time — German, like the books, with English as an alternate.
 *
 * SITE_URL has to be absolute: Facebook, WhatsApp, Slack and iMessage all
 * refuse relative og:image paths. Change it if the site moves.
 */
export const SITE_URL = 'https://lucilleschlegel.com';
export const SITE_NAME = 'Seepferdchen-Aquarium';
export const OG_IMAGE = `${SITE_URL}/og.png`;
export const OG_IMAGE_ALT = 'Ein buntes Riff voller Fische, Seepferdchen und einer Schatztruhe';

/** Page title and description per route. */
export const PAGES: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Aquarium',
    description:
      'Ein Aquarium zum Anfassen: füttere die Fische, finde den goldenen Schlüssel ' +
      'und öffne die Schatztruhe. Für kleine Entdeckerinnen ab vier.'
  },
  '/steckbriefe': {
    title: 'Steckbriefe',
    description:
      'Alle Bewohner vom Seepferdchenhof auf einen Blick — vom freundlichen Hai ' +
      'bis zur Rüsselschnecke, die es nie eilig hat.'
  },
  '/geschichte': {
    title: 'Geschichte',
    description: 'Die Geschichte vom Seepferdchenhof, zum Vorlesen und Selberlesen.'
  },
  '/spiel': {
    title: 'Finde-Spiel',
    description: 'Ein Name erscheint, vier Tiere warten. Findest du das richtige?'
  },
  '/verstecken': {
    title: 'Verstecken',
    description:
      'Ein Tier zeigt sich, dann versteckt es sich im Riff. Finde es und tippe ' +
      'es an — ganz ohne Lesen, schon ab vier.'
  },
  '/karte': {
    title: 'Karte',
    description:
      'Die Karte der neun Orte: Riff, Kelpwald, Tiefsee, Wrack, Lagune, ' +
      'Höhle, Vulkan, Eismeer und Perlenbank — und wie sie zusammenhängen.'
  },
  '/machen': {
    title: 'Selber machen',
    description:
      'Bau dir dein eigenes Meerestier: Form, Farben, Größe und Glitzer. ' +
      'Es schwimmt danach im Aquarium mit.'
  },
  '/labyrinth': {
    title: 'Labyrinth',
    description:
      'Führe das Seepferdchen mit dem Finger durch das Korallenlabyrinth zum ' +
      'Schatz. Kein Zeitlimit, kein Verlieren.'
  },
  '/tippen': {
    title: 'Tippen',
    description:
      'Tippen lernen mit den Tieren vom Seepferdchenhof — erst der erste ' +
      'Buchstabe, dann der ganze Name.'
  }
};
