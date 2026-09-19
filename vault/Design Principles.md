# Design Principles

## 1. She cannot read

The single constraint that decides most arguments. Controls are pictures.
Names are *spoken* (`$lib/speech.ts`), never only written. Text on screen is
for the adult nearby.

This has already forced real changes:
- The find game showed a written name — unplayable alone. It now reads the name
  aloud, and [[Games#Hide and seek]] exists as a wordless alternative.
- The bottom navigation truncated its labels on a phone. A truncated word reads
  as *broken*; the labels were dropped and the pictures grown.

## 2. Nothing can be failed

No timers. No game-over. No score that goes down. A wrong tap gets a warm "try
again" and play continues. The maze has no way to lose — walls block, they do
not punish.

## 3. Nothing is ever still

A motionless creature reads as a sticker. Even a resting starfish rocks with
the swell. See [[The Tank#Behaviour]].

## 4. Generous targets

Small fingers, moving targets, a tablet on a sofa. Minimum tap radius is 42px
regardless of how small the creature is drawn. That applies to the chrome as
much as the creatures: the story's page dots are 12px to look at and 44px to
hit, and the food buttons are square rather than letterbox for the same reason.

And a target is only generous if the device lets her reach it — see
[[Gotchas#The edges of the screen]].

## 5. The phone is the device

She plays on a phone or a tablet, held either way up, usually lying down. Every
screen has to work at 375×667 and at 844×390, which is the harder of the two:
sideways there is about 390px of height for everything, so the grown-up's
flavour text goes and the thing she came for stays.

## 6. The simulation is framework-free

`sim/` and `art/` never import Svelte. That is why ~100 behaviour tests run
headlessly in under a second. See [[Architecture]].
