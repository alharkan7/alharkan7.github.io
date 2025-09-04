<script>
  import { onMount } from 'svelte';
  import tocbot from 'tocbot';

  let tocContainer;
  let isVisible = false;
  let headings = [];

  onMount(() => {
    // Initialize tocbot
    tocbot.init({
      tocSelector: '.toc',
      contentSelector: '.content',
      headingSelector: 'h1, h2, h3, h4, h5, h6',
      hasInnerContainers: true,
      linkClass: 'toc-link',
      activeLinkClass: 'is-active-link',
      listClass: 'toc-list',
      isCollapsedClass: 'is-collapsed',
      collapsibleClass: 'is-collapsible',
      listItemClass: 'toc-list-item',
      activeListItemClass: 'is-active-li',
      collapseDepth: 0,
      scrollSmooth: true,
      scrollSmoothDuration: 420,
      headingsOffset: 80,
      throttleTimeout: 50,
      positionFixedSelector: null,
      positionFixedClass: 'is-position-fixed',
      fixedSidebarOffset: 'auto',
      includeHtml: false,
      onClick: function(e) {
        // Custom click handler if needed
      }
    });

    // Extract headings for our custom ruler display
    const contentElement = document.querySelector('.content');
    if (contentElement) {
      const headingElements = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings = Array.from(headingElements).map((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent || '';
        
        // Create a slug from the heading text if no ID exists
        let id = heading.id;
        if (!id) {
          id = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/--+/g, '-') // Replace multiple hyphens with single
            .trim()
            .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
            || `heading-${index}`; // Fallback if text is empty
          
          // Ensure uniqueness
          let uniqueId = id;
          let counter = 1;
          while (document.getElementById(uniqueId)) {
            uniqueId = `${id}-${counter}`;
            counter++;
          }
          
          heading.id = uniqueId;
          id = uniqueId;
        }
        
        return {
          level,
          text,
          id,
          element: heading
        };
      });
    }

    return () => {
      tocbot.destroy();
    };
  });

  function scrollToHeading(headingId) {
    const element = document.getElementById(headingId);
    if (element) {
      const elementPosition = element.offsetTop;
      const offsetPosition = elementPosition - 100; // Add 100px offset from top
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  function getBarWidth(level) {
    // Different widths for different heading levels - more pronounced differences
    const widths = {
      1: '40px',
      2: '32px',
      3: '24px',
      4: '18px',
      5: '12px',
      6: '8px'
    };
    return widths[level] || '8px';
  }

  function getBarOpacity(level) {
    // Higher level headings are more prominent
    const opacities = {
      1: '1',
      2: '0.8',
      3: '0.7',
      4: '0.6',
      5: '0.5',
      6: '0.4'
    };
    return opacities[level] || '0.4';
  }
</script>

<!-- Headings Map Trigger Area - Only show if headings exist -->
{#if headings.length > 0}
<div 
  class="headings-map-trigger"
  role="navigation"
  aria-label="Table of contents navigation"
  on:mouseenter={() => isVisible = true}
  on:mouseleave={() => isVisible = false}
>
  <!-- Ruler-style headings map -->
  <div class="headings-ruler" class:visible={isVisible}>
    {#each headings as heading}
      <div 
        class="heading-bar"
        style="width: {getBarWidth(heading.level)}; opacity: {getBarOpacity(heading.level)}"
        on:click={() => scrollToHeading(heading.id)}
        role="button"
        tabindex="0"
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scrollToHeading(heading.id);
          }
        }}
      >
        <div class="heading-tooltip">
          {heading.text}
        </div>
      </div>
    {/each}
  </div>
</div>
{/if}

<!-- Hidden tocbot container for functionality -->
<div class="toc" bind:this={tocContainer} style="display: none;"></div>

<style>
  .headings-map-trigger {
    position: fixed;
    top: 120px;
    left: 20px;
    width: 50px;
    height: calc(100vh - 240px);
    z-index: 1000;
    pointer-events: all;
  }

  .headings-ruler {
    position: absolute;
    left: 0;
    top: 0;
    width: 40px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 6px;
    opacity: 0.8;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .headings-ruler.visible {
    opacity: 1;
    pointer-events: all;
  }

  /* Show a subtle hint when headings are available */
  .headings-ruler:not(.visible)::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 10px;
    width: 30px;
    height: 3px;
    background: var(--primary-color);
    opacity: 0.4;
    border-radius: 2px;
    animation: fadeInOut 2s ease-in-out infinite;
    box-shadow: 0 0 4px rgba(84, 142, 155, 0.3);
  }

  @keyframes fadeInOut {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }

  .heading-bar {
    position: relative;
    height: 2px;
    background: var(--text-secondary);
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-bottom: 6px;
  }

  .heading-bar:hover {
    background: var(--primary-color);
    transform: scaleY(2) scaleX(1.2);
    transform-origin: left center;
  }

  .heading-tooltip {
    position: absolute;
    left: 45px;
    top: 50%;
    transform: translateY(-50%);
    background: var(--background-body);
    color: var(--text-main);
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 11px;
    line-height: 1.1;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-color);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 1001;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  .heading-bar:hover .heading-tooltip {
    opacity: 1;
  }

  /* Tablet adjustments */
  @media (max-width: 1024px) {
      .headings-map-trigger {
        left: 10px;
        width: 40px;
      }
      
      .headings-ruler {
        width: 35px;
      }
      
      .heading-tooltip {
        left: 40px;
        max-width: 150px;
        font-size: 10px;
      }
    }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
      .headings-map-trigger {
        display: none;
      }
    }

  /* Ensure it doesn't interfere with content on smaller screens */
  @media (max-width: 1200px) {
    .headings-map-trigger {
      left: 15px;
    }
  }
</style>