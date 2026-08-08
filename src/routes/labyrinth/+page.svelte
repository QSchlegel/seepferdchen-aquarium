<script lang="ts">
  /**
   * The maze, with a star for every one she finds her way through.
   * Wordless, like hide and seek.
   */
  import Maze from '$lib/components/Maze.svelte';
  import Meta from '$lib/components/Meta.svelte';

  let solved = $state(0);
</script>

<Meta path="/labyrinth" />

<Maze onwin={() => (solved += 1)} />

<div class="hud">
  <div class="tally" aria-label="geschafft">
    {#each Array(Math.min(solved, 12)) as _, i (i)}<span>⭐</span>{/each}
  </div>
</div>

<style>
  .hud { position: fixed; inset: 0; pointer-events: none; z-index: 30; }
  .tally {
    position: absolute;
    left: 50%;
    top: calc(10px + env(safe-area-inset-top));
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
    max-width: min(360px, calc(100vw - 40px));
    font-size: 21px;
    filter: drop-shadow(0 2px 4px rgba(0, 40, 60, 0.55));
  }
</style>
