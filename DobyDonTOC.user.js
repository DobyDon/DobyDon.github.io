// ==UserScript==
// @name         DobyDon TOC
// @namespace    https://dobydon.github.io/
// @version      1.2
// @description  Nested TOC + search + smooth scroll + highlight
// @author       DobyDon
// @homepage     https://dobydon.github.io
// @match        https://dobydon.github.io/*
// @icon         https://dobydon.github.io/assets/images/profile.png
// @downloadURL  https://raw.githubusercontent.com/DobyDon/DobyDon.github.io/main/DobyDonTOC.user.js
// @updateURL    https://raw.githubusercontent.com/DobyDon/DobyDon.github.io/main/DobyDonTOC.user.js
// @license      MIT
// @grant        none
// ==/UserScript==

(function () {

    /* =============================================================
       1. OPEN EXTERNAL LINKS IN NEW TAB
    ============================================================= */
    document.querySelectorAll("article a[href]").forEach(a => {
        if (a.closest(".post-preview") || a.closest("blockquote")) return;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
    });


    /* =============================================================
       2. PREVENT DUPLICATE TOC
    ============================================================= */
    if (document.querySelector('#toc-wrapper')) return;

    const content = document.querySelector("article .content");
    if (!content) return;

    const headers = content.querySelectorAll("h2, h3, h4");
    if (!headers.length) return;


    /* =============================================================
       3. CREATE NESTED TOC (SAFE VERSION)
    ============================================================= */
    function createNestedTOC(headers) {

        const root = document.createElement("ul");
        root.className = "toc-list";

        const stack = [{ level: 1, ul: root }];

        headers.forEach(h => {

            if (!h.id) {
                h.id = h.textContent.trim().toLowerCase().replace(/\s+/g, "-");
            }

            const level = parseInt(h.tagName.substring(1)); // 2, 3, 4

            // Pastikan stack tidak kosong
            while (stack.length && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            // Jika kosong → isi ulang
            if (!stack.length) {
                stack.push({ level: level - 1, ul: root });
            }

            const parent = stack[stack.length - 1].ul;

            const li = document.createElement("li");
            li.className = "toc-list-item";

            const a = document.createElement("a");
            a.href = `#${h.id}`;
            a.className = `toc-link node-name--${h.tagName}`;
            a.textContent = h.textContent.trim();
            li.appendChild(a);

            parent.appendChild(li);

            // siapkan sublist collapsible
            const newUl = document.createElement("ul");
            newUl.className = "toc-list is-collapsible";
            li.appendChild(newUl);

            stack.push({ level, ul: newUl });
        });

        return root;
    }

    const tocUL = createNestedTOC(headers);


    /* =============================================================
       4. BUILD TOC WRAPPER
    ============================================================= */
    const wrapper = document.createElement("section");
    wrapper.id = "toc-wrapper";
    wrapper.className = "ps-0 pe-4";

    const h2 = document.createElement("h2");
    h2.className = "panel-heading ps-3 pt-2 mb-2";
    h2.textContent = "Contents";

    const nav = document.createElement("nav");
    nav.id = "toc";
    nav.appendChild(tocUL);

    wrapper.appendChild(h2);
    wrapper.appendChild(nav);

    const sidePanel = document.querySelector("#panel-wrapper .access") || document.body;
    sidePanel.appendChild(wrapper);


    /* =============================================================
       5. SMOOTH SCROLL
    ============================================================= */
    const tocLinks = wrapper.querySelectorAll("a.toc-link");

    tocLinks.forEach(a => {
        a.addEventListener("click", e => {
            e.preventDefault();
            const target = document.querySelector(a.getAttribute("href"));
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(null, "", a.getAttribute("href"));
            }
        });
    });


    /* =============================================================
       6. ACTIVE HIGHLIGHT
    ============================================================= */
    window.addEventListener("scroll", () => {
        const fromTop = window.scrollY + 30;

        let activeFound = false;

        tocLinks.forEach(link => {
            const sec = document.querySelector(link.getAttribute("href"));

            if (sec && sec.offsetTop <= fromTop && sec.offsetTop + sec.offsetHeight > fromTop) {
                tocLinks.forEach(l => l.classList.remove("is-active-link"));
                tocLinks.forEach(l => l.parentElement.classList.remove("is-active-li"));

                link.classList.add("is-active-link");
                link.parentElement.classList.add("is-active-li");

                activeFound = true;
            }
        });

        if (!activeFound) {
            tocLinks.forEach(l => l.classList.remove("is-active-link"));
            tocLinks.forEach(l => l.parentElement.classList.remove("is-active-li"));
        }
    });


    /* =============================================================
       7. COLLAPSIBLE SUBLIST (SAFE)
    ============================================================= */
    document.querySelectorAll(".toc-list li > ul.is-collapsible").forEach(ul => {
        ul.style.display = "none";
        const li = ul.parentElement;

        li.addEventListener("click", e => {
            if (e.target.tagName === "A") return;  // biarkan link bekerja normal
            ul.style.display = ul.style.display === "none" ? "block" : "none";
        });
    });


    /* =============================================================
       8. SEARCH CONTENT (SAFE, NO DOM DAMAGE)
    ============================================================= */
    const searchInput = document.createElement("input");
    searchInput.className = "toc-search form-control mb-2";
    searchInput.placeholder = "Search Content";
    searchInput.style.width = "100%";

    h2.after(searchInput);

    // REMOVE ALL <mark>
    function removeMarks(element) {
        const marks = element.querySelectorAll("mark");
        marks.forEach(m => {
            const parent = m.parentNode;
            parent.replaceChild(document.createTextNode(m.textContent), m);
            parent.normalize();
        });
    }

    // HIGHLIGHT SAFE
    function highlightText(root, query) {
        removeMarks(root);
        if (!query) return;

        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "gi");

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    // skip inside <mark>
                    if (node.parentElement.tagName === "MARK") return NodeFilter.FILTER_REJECT;

                    // skip script/style
                    if (["SCRIPT", "STYLE"].includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        const textNodes = [];

        while ((node = walker.nextNode())) {
            if (node.textContent.trim()) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(node => {
            const parent = node.parentNode;
            const text = node.textContent;

            if (!regex.test(text)) return;

            const frag = document.createDocumentFragment();
            let lastIndex = 0;

            text.replace(regex, (match, index) => {
                frag.appendChild(document.createTextNode(text.slice(lastIndex, index)));
                const mark = document.createElement("mark");
                mark.textContent = match;
                frag.appendChild(mark);
                lastIndex = index + match.length;
            });

            frag.appendChild(document.createTextNode(text.slice(lastIndex)));

            parent.replaceChild(frag, node);
        });
    }

    // SEARCH EVENT
    searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();

        headers.forEach(head => {
            let next = head.nextElementSibling;
            const block = [head];

            while (next && !["H2", "H3", "H4"].includes(next.tagName)) {
                block.push(next);
                next = next.nextElementSibling;
            }

            const show = block.some(el =>
                el.innerText.toLowerCase().includes(q)
            );

            block.forEach(el => {
                el.classList.toggle("hidden", !show);
                highlightText(el, q);
            });
        });
    });

    /* =============================================================
       9. STYLE
    ============================================================= */
    const style = document.createElement("style");
    style.textContent = `
        .toc-list li { list-style: none; margin-left: 0; }
        .toc-list li ul { padding-left: 15px; }
        .toc-list li a:hover { text-decoration: underline; }
        .is-active-link { color: #0d6efd; font-weight: bold; }
        .is-active-li > a { font-weight: bold; }
        .toc-search { margin-bottom: 8px; padding: 4px 8px; }
        .hidden { display: none !important; }
    `;
    document.head.appendChild(style);

})();
