function bookmarkFolderDepth(el: Element): number {
    let d = 0;
    let p: Element | null = el.parentElement;
    while (p) {
        if (p.tagName === "DETAILS") d++;
        p = p.parentElement;
    }
    return d;
}

/** URLs under this folder whose li is visible and no hidden folder encloses them. */
function countVisibleUrlsUnder(folderDetails: HTMLDetailsElement): number {
    let n = 0;
    folderDetails.querySelectorAll(".toc-item").forEach((toc) => {
        const li = toc.closest("li");
        if (!li || li.classList.contains("bookmark-search-hidden")) return;
        let el: Element | null = toc;
        while (el) {
            if (el === folderDetails) {
                n++;
                return;
            }
            if (
                el instanceof HTMLDetailsElement &&
                el.classList.contains("bookmark-folder-search-hidden")
            ) {
                return;
            }
            el = el.parentElement;
        }
    });
    return n;
}

function countAllVisibleUrls(root: HTMLElement): number {
    let n = 0;
    root.querySelectorAll(".toc-item").forEach((toc) => {
        const li = toc.closest("li");
        if (!li || li.classList.contains("bookmark-search-hidden")) return;
        let el: Element | null = toc;
        while (el) {
            if (
                el instanceof HTMLDetailsElement &&
                el.classList.contains("bookmark-folder-search-hidden")
            ) {
                return;
            }
            el = el.parentElement;
        }
        n++;
    });
    return n;
}

function updateFolderCountDisplays(root: HTMLElement, q: string) {
    if (!q.trim()) {
        root.querySelectorAll(".folder-count").forEach((span) => {
            const t = span.getAttribute("data-total-count");
            if (t != null) span.textContent = ` (${t})`;
        });
        const total = root.getAttribute("data-total-url-count");
        const heading = document.getElementById("bookmarks-heading-count");
        if (heading && total != null) heading.textContent = total;
        return;
    }

    root.querySelectorAll("details.bookmark-folder").forEach((details) => {
        if (!(details instanceof HTMLDetailsElement)) return;
        const span = details.querySelector(":scope > summary .folder-count");
        if (!span) return;
        span.textContent = ` (${countVisibleUrlsUnder(details)})`;
    });

    const heading = document.getElementById("bookmarks-heading-count");
    if (heading) {
        heading.textContent = String(countAllVisibleUrls(root));
    }
}

function applyBookmarkSearch(rawQuery: string) {
    const root = document.getElementById("bookmark-list-root");
    if (!root) return;

    const q = rawQuery.trim().toLowerCase();

    root.querySelectorAll(".toc-item").forEach((toc) => {
        const a = toc.querySelector("a.bookmark-link, a.toc-title");
        const text = (a?.textContent || "").toLowerCase();
        const href = (a?.getAttribute("href") || "").toLowerCase();
        const match = !q || text.includes(q) || href.includes(q);
        const li = toc.closest("li");
        if (li) li.classList.toggle("bookmark-search-hidden", !match);
    });

    const folders = Array.from(
        root.querySelectorAll("details.bookmark-folder"),
    );
    folders.sort((a, b) => bookmarkFolderDepth(b) - bookmarkFolderDepth(a));

    folders.forEach((folderDetails) => {
        if (!q) {
            folderDetails.classList.remove("bookmark-folder-search-hidden");
            return;
        }
        const directLis = folderDetails.querySelectorAll(":scope > ul > li");
        let any = false;
        directLis.forEach((li) => {
            if (li.classList.contains("bookmark-search-hidden")) return;
            if (li.querySelector(":scope > .toc-item")) {
                any = true;
                return;
            }
            const nested = li.querySelector(":scope > details.bookmark-folder");
            if (
                nested &&
                !nested.classList.contains("bookmark-folder-search-hidden")
            ) {
                any = true;
            }
        });
        folderDetails.classList.toggle("bookmark-folder-search-hidden", !any);
    });

    if (!q) {
        root
            .querySelectorAll(".bookmark-search-hidden")
            .forEach((el) => el.classList.remove("bookmark-search-hidden"));
    }

    updateFolderCountDisplays(root, rawQuery);
}

export function initBookmarksPage(): void {
    let bookmarksSearchDebounce: ReturnType<typeof setTimeout> | null = null;
    const bookmarksSearchInput = document.getElementById(
        "bookmarks-search",
    ) as HTMLInputElement | null;
    if (bookmarksSearchInput) {
        bookmarksSearchInput.addEventListener("input", () => {
            if (bookmarksSearchDebounce) clearTimeout(bookmarksSearchDebounce);
            bookmarksSearchDebounce = setTimeout(() => {
                applyBookmarkSearch(bookmarksSearchInput.value || "");
            }, 200);
        });
    }

    const bookmarkContainer = document.getElementById("bookmark-list-root");
    if (!bookmarkContainer) return;

    bookmarkContainer.addEventListener(
        "toggle",
        (event: Event) => {
            const target = event.target;
            if (
                target instanceof HTMLDetailsElement &&
                target.parentElement === bookmarkContainer &&
                target.open
            ) {
                const openedDetails = target;
                const allDetails = Array.from(
                    bookmarkContainer.querySelectorAll(":scope > details"),
                ).filter((n): n is HTMLDetailsElement => n instanceof HTMLDetailsElement);
                allDetails.forEach((details) => {
                    if (details !== openedDetails) {
                        details.open = false;
                    }
                });
            }
        },
        true,
    );
}
