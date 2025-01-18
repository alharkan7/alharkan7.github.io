<script>
  const rootEl = typeof document !== 'undefined' ? document.documentElement : null;
  let theme = '';

if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
  theme = localStorage.getItem('theme');
} else {
  theme = 'light'; // Default to light theme
}

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
  }

  $: if (rootEl && theme === 'light') {
    rootEl.classList.remove('theme-dark');
  } else if (rootEl && theme === 'dark') {
    rootEl.classList.add('theme-dark');
  }

  const icons = {
    light: `<svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>`,
    dark: `<svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
        clip-rule="evenodd"
      />
    </svg>`
  };
</script>

<style>
  .theme-toggle {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
  }

  :global(.theme-dark) .theme-toggle {
    color: #fff;
  }
</style>

<button
  class="theme-toggle"
  on:click={toggleTheme}
  {...$$restProps}
  aria-label={`Toggle theme to ${theme === 'light' ? 'dark' : 'light'} mode`}
>
  {@html icons[theme === 'light' ? 'dark' : 'light']}
</button>
