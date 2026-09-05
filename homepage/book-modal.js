"use strict";
/* ============================================================
   Book-opening popup.
   Clicking a book flips its two pages open (3D hinge) directly.
   ============================================================ */
(function () {
    const modal = document.getElementById('bookModal');
    const bookEl = document.getElementById('bookModalBook');
    const leftPage = document.getElementById('bookModalLeft');
    const rightPage = document.getElementById('bookModalRight');
    const pagerEl = document.getElementById('bookModalPager');
    if (!modal || !bookEl || !leftPage || !rightPage || !pagerEl)
        return;
    let lastTrigger = null;
    const CONTENT = {
        work: {
            accent: 'var(--peri)',
            kicker: '2019 - Present',
            title: 'WORK EXPERIENCE',
            company: 'CAPITAL ONE',
            blurb: 'Software Engineer',
            entries: [
                { role: 'Rewards Platform', org: 'Full-stack system handling account and customer level rewards for over 100 million credit cards', when: 'Mar 2025 – Present', note: '- Defined domain model and implemented net-new Rewards Platform Account and Participant Aggregates, Credit Card Swap Logic, and Account Retrieval in **Go**, establishing core service boundaries and data consistency (via **PostgreSQL** and **Flyway**) for a greenfield, high-scale platform. \n\n - Led **CI/CD** initiative for Account & Memberships Domain ensuring adherence with **OTEL** observability, **Canary** deployments, test automation, **Optimizely** toggles, and **New Relic/Splunk** alerts. \n\n - Built Participants microservice from hexagonally architected Account Service reference, leveraging agentic tooling (**Claude Code**) to accelerate delivery of a working baseline application by 95%. \n\n - Productionized and led test maturity (**BDD** & **Pact**) for Benefit Opt-In Service, built with **Python**, **FastAPI**, and **DynamoDB**, integrating Discover’s Rotating Categories into the Capital One Rewards Platform – enabling migration of new and existing customers with no service disruption.' },
                { role: 'Customer Service Agent Platform', org: 'Containerized web app for call service agents to assist client account needs', when: 'Aug 2023 – Mar 2025', note: '- Diagnosed and resolved recurring production incidents across customer-facing microservices (profile management, card/user controls, account estates, and credit card actions) in **JavaScript**, improving reliability for call service agents and customers. \n\n - Developed Redirection Predictor eAPI, customer data pattern-matching call-intent predictor that auto-routes agents to workflow pages, reducing average call handling time. Partnered across business, agents, and developer teams to define, validate, and test the underlying business logic against real client needs.' },
                { role: 'Associate Experience Technology', when: 'Aug 2022 – Aug 2023', note: '- Led greenfield design and development for employee device management dashboard used by Tech Support. \n\n - Analyzed via case studies, designed with **Figma**, and implemented using **TypeScript** UI/UX components for self-help and onboarding website used company-wide.' },
                { role: 'Technology Intern Program', when: 'Jun – Aug 2021 & 2020', note: '- Architected full-stack web app for dynamic Digital Servicing Information display using **Angular**, **Python/FastAPI**, **PostgreSQL**, **Docker**, and Jenkins on serverless AWS. \n\n - Migrated the Credit Card Authorization platform onto AWS **Fargate**, the first major Capital One application to be hosted; presented cost, security, and workflow efficiency improvements to leadership.' }
            ],
        },
        edu: {
            accent: 'var(--indigo)',
            kicker: 'August 2018 – May 2022',
            title: 'EDUCATION',
            company: 'university of virginia \n School of Engineering and Applied Science',
            blurb: 'Bachelor of Science \n Computer Science with \n High Honors'
        },
        leadership: {
            accent: 'var(--sky)',
            title: 'LEADERSHIP',
            // these entries are short enough to sit together on one page,
            // so skip the one-at-a-time pager used for the longer books
            paginate: false,
            entries: [
                { role: 'Mentor', org: 'for Capital One’s Technology Development, Intern, and Early Intern Programs', when: 'Jun 2023 – Present', note: 'Advise Software Engineers in their early career on how to successfully meet and display the competencies of communication, influence, results focus, customer focus, judgement, problem solving, and tech skills.' },
                { role: 'AI Training Workshop Lead', when: 'April 2026 – Present', note: 'Created and led tower wide AI training attended by 100+ developers on the organization’s new shared AI hub repo. Assembled hub’s contributors to give workshops of their skills, promoting usage and reducing redundant skill creation.' },
            ],
        },
    };
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }
    // Notes accept a small markup subset: **bold** for emphasis, and real
    // newlines for line breaks. Everything is escaped first, so the text
    // still can't inject HTML — only the two tags chosen here get through.
    function formatNote(s) {
        return esc(s)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
    // Title-page lines (blurb, company) accept the same real-newline
    // line breaks as notes, but not **bold** — they're short lines, not
    // prose, so there's no emphasis markup to parse here.
    function formatLine(s) {
        return esc(s).replace(/\n/g, '<br>');
    }
    // The right-hand page shows one entry at a time and is turned with the
    // pager below it, rather than scrolling the whole run of entries.
    const rightPageEl = rightPage.closest('.book-modal__page');
    const FLIP_MS = 260;
    let currentData = null;
    let entryIndex = 0;
    let flipping = false;

    function entryHtml(e) {
        return `<div class="book-modal__entry">` +
            `<div class="book-modal__entry-head">` +
            `<span class="book-modal__role">${esc(e.role)}</span>` +
            `<span class="book-modal__when">${esc(e.when)}</span>` +
            `</div>` +
            `<div class="book-modal__org">${esc(e.org)}</div>` +
            `<p class="book-modal__note">${formatNote(e.note)}</p>` +
            `</div>`;
    }

    function pagerHtml() {
        const total = currentData.entries.length;
        if (total < 2)
            return '';
        const atStart = entryIndex === 0;
        const atEnd = entryIndex === total - 1;
        return `<button class="book-modal__pagebtn" type="button" data-page="prev"` +
            ` aria-label="Previous entry"${atStart ? ' disabled' : ''}>&#8249;</button>` +
            `<span class="book-modal__pagenum">${entryIndex + 1} / ${total}</span>` +
            `<button class="book-modal__pagebtn" type="button" data-page="next"` +
            ` aria-label="Next entry"${atEnd ? ' disabled' : ''}>&#8250;</button>`;
    }

    // The pager lives in its own element outside the scrolling entry area
    // (see index.html), so it stays pinned to the bottom of the page
    // instead of drifting up or down with how long the current entry is.
    function renderEntry() {
        if (!currentData.entries.length) {
            rightPage.innerHTML = '';
            pagerEl.innerHTML = '';
            return;
        }
        if (currentData.paginate === false) {
            // short book: every entry together on the page, no pager
            rightPage.innerHTML = currentData.entries.map(entryHtml).join('');
            pagerEl.innerHTML = '';
            return;
        }
        rightPage.innerHTML = entryHtml(currentData.entries[entryIndex]);
        pagerEl.innerHTML = pagerHtml();
    }

    function turnTo(index) {
        if (flipping || !currentData)
            return;
        if (index < 0 || index >= currentData.entries.length)
            return;

        const reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
        if (reduced) {
            entryIndex = index;
            renderEntry();
            return;
        }

        // the leaf swings away on its hinge, is re-dressed while it is edge
        // on and invisible, then settles back flat carrying the new entry
        flipping = true;
        rightPageEl.style.setProperty('--flip', index > entryIndex ? '1' : '-1');
        rightPageEl.classList.add('is-flip-out');

        setTimeout(() => {
            entryIndex = index;
            renderEntry();
            rightPageEl.classList.remove('is-flip-out');
            rightPageEl.classList.add('is-flip-in');
            requestAnimationFrame(() => {
                rightPageEl.classList.remove('is-flip-in');
                rightPageEl.classList.add('is-flip-settle');
                setTimeout(() => {
                    rightPageEl.classList.remove('is-flip-settle');
                    flipping = false;
                }, FLIP_MS);
            });
        }, FLIP_MS);
    }

    function buildPages(data) {
        // some books (e.g. edu) have no entries of their own — the pager
        // and right page simply render nothing for those
        currentData = { ...data, entries: data.entries ?? [] };
        entryIndex = 0;
        flipping = false;
        rightPageEl.classList.remove('is-flip-out', 'is-flip-in', 'is-flip-settle');
        // laid out like a title page: title + blurb up top, company +
        // kicker anchored at the foot, mirroring a printed title page's
        // title/byline up top and publisher/year at the bottom
        leftPage.innerHTML =
            `<div class="book-modal__titlepage-head">` +
                `<h2 class="book-modal__heading" id="bookModalHeading" style="color:${data.accent}">${esc(data.title)}</h2>` +
                `<p class="book-modal__blurb">${formatLine(data.blurb)}</p>` +
            `</div>` +
            `<div class="book-modal__titlepage-foot">` +
                `<p class="book-modal__company">${formatLine(data.company ?? '')}</p>` +
                `<span class="book-modal__kicker">${esc(data.kicker)}</span>` +
            `</div>`;
        renderEntry();
    }

    // the pager is re-rendered on every turn, so listen on its container
    pagerEl.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-page]');
        if (!btn)
            return;
        turnTo(entryIndex + (btn.getAttribute('data-page') === 'next' ? 1 : -1));
    });
    function openBook(key, trigger) {
        const data = CONTENT[key];
        if (!data)
            return;
        buildPages(data);
        // the popup's cover border matches this book's own shelf color
        bookEl.style.setProperty('--book-accent', data.accent);
        lastTrigger = trigger ?? null;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            const closeBtn = modal.querySelector('.book-modal__close');
            closeBtn?.focus();
        });
    }
    function closeBook() {
        if (!modal.classList.contains('is-open'))
            return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastTrigger?.focus)
            lastTrigger.focus();
    }
    document.querySelectorAll('[data-book]').forEach((el) => {
        el.addEventListener('click', () => openBook(el.getAttribute('data-book') ?? '', el));
        el.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
                ev.preventDefault();
                openBook(el.getAttribute('data-book') ?? '', el);
            }
        });
    });
    document.querySelectorAll('[data-close]').forEach((el) => {
        el.addEventListener('click', closeBook);
    });
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape')
            closeBook();
    });
    // the binder and the Gobblet box are styled as buttons too, but only
    // the title books open the popup — give them normal button keyboard
    // behavior without wiring an action.
    document.querySelectorAll('.shelf-btn[role="button"]:not([data-book])').forEach((el) => {
        el.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
                ev.preventDefault();
            }
        });
    });
})();
