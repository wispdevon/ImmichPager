<script lang="ts">
  import { enhance } from '$app/forms';
  import { PasswordInput } from '@immich/ui';
  import Gallery from '$lib/components/Gallery.svelte';
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let password = $state('');
  let busy = $state(false);
</script>

<svelte:head
  ><title>{data.page?.title || 'Password required'} · ImmichPager</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
{#if data.locked}
  <main class="lock-screen">
    <div class="lock-mark" aria-hidden="true">⌑</div>
    <h1>Password required</h1>
    <p class="muted">Enter the password to view these albums.</p>
    <form
      method="POST"
      use:enhance={() => {
        busy = true;
        return async ({ update }) => {
          await update();
          busy = false;
          password = '';
        };
      }}
    >
      <label
        ><span class="sr-only">Password</span><PasswordInput
          bind:value={password}
          name="password"
          placeholder="Password"
          autocomplete="current-password"
          required
        /></label
      >
      <button type="submit" class="primary" disabled={busy}
        >{busy ? 'Unlocking…' : 'View albums'}</button
      >
    </form>
    {#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
  </main>
{:else if data.page}
  {#if data.preview}<div class="preview-notice">
      Owner preview · <a href={`/page/manage/${data.page.id}`}>Back to editor</a
      >
    </div>{/if}
  <Gallery page={data.page} />
{/if}

<style>
  .lock-screen {
    min-height: 100dvh;
    max-width: 460px;
    margin: auto;
    padding: 15vh 24px 40px;
    text-align: center;
  }
  .lock-mark {
    font-size: 48px;
    color: #accbfa;
    margin-bottom: 24px;
  }
  .lock-screen h1 {
    font-size: 28px;
    margin-bottom: 12px;
  }
  form {
    margin-top: 28px;
    display: grid;
    gap: 12px;
  }
  .preview-notice {
    background: #accbfa;
    color: #142344;
    padding: 12px 24px;
    text-align: center;
    font-size: 14px;
  }
</style>
