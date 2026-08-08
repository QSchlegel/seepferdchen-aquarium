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
regardless of how small the creature is drawn.

## 5. The simulation is framework-free

`sim/` and `art/` never import Svelte. That is why ~100 behaviour tests run
headlessly in under a second. See [[Architecture]].
