<script lang="ts">
  import '../app.css';
  import Nav from '$lib/components/Nav.svelte';
  import { settings } from '$lib/stores/settings';
  import { startMusic, stopMusic } from '$lib/audio';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    // browsers refuse to make a sound before the first touch, so music she left
    // switched on last time waits here for any gesture at all
    const kick = () => { if ($settings.music && $settings.sound) startMusic(); };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      stopMusic();
    };
  });

  $effect(() => {
    if ($settings.music && $settings.sound) startMusic();
    else stopMusic();
  });
</script>

{@render children()}
<Nav />
