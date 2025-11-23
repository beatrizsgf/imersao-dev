let dados = [];

function obterOuCriarContainerResultados() {
    let container = document.querySelector(".card-container");
    if (!container) {
        const main = document.querySelector('main');
        container = document.createElement('section');
        container.className = 'card-container results';
        main.insertBefore(container, main.firstChild);
    }
    return container;
}

function limparCards(container) {
    container.innerHTML = "";
}

// Oculta todo o conteúdo dentro de <main> exceto o container informado
function hideMainExcept(container) {
    const main = document.querySelector('main');
    if (!main) return;
    Array.from(main.children).forEach(c => {
        if (c === container) return;
        c.style.display = 'none';
    });
}

// Restaura a exibição padrão de todo o conteúdo dentro de <main> e remove resultados antigos
function restoreMainContent() {
    const main = document.querySelector('main');
    if (!main) return;
    Array.from(main.children).forEach(c => c.style.display = '');
    const existings = Array.from(document.querySelectorAll('.card-container.results'));
    existings.forEach(e => e.remove());
}

function gatherPageItems() {
    const items = [];
    // ignore any previously rendered search results
    const sections = Array.from(document.querySelectorAll('.theme-section:not(.search-result)'));
    for (const section of sections) {
        const sectionTitle = section.querySelector('h2')?.textContent.trim() || '';
        const p = section.querySelector('p')?.textContent.trim() || '';
        // overview item
        items.push({ nome: sectionTitle, descricao: p, link: null, source: 'page' });

        // comparison grid rows (if present)
        const grid = section.querySelector('.comp-grid');
        if (grid) {
            const cells = Array.from(grid.querySelectorAll('.comp-cell'));
            for (let i = 0; i < cells.length; i += 3) {
                const tema = cells[i]?.textContent.trim() || '';
                const jovem = cells[i+1]?.textContent.trim() || '';
                const velha = cells[i+2]?.textContent.trim() || '';
                if (tema) {
                    items.push({
                        nome: `${sectionTitle} — ${tema}`,
                        descricao: `${jovem} ${velha ? ' | ' + velha : ''}`.trim(),
                        link: null,
                        source: 'page'
                    });
                }
            }
        }
    }
    return items;
}

function gatherSectionsData() {
    const sections = [];
    // only gather original theme sections (exclude search-result wrappers)
    const nodes = Array.from(document.querySelectorAll('.theme-section:not(.search-result)'));
    for (const node of nodes) {
        const title = node.querySelector('h2')?.textContent.trim() || '';
        const paragraph = node.querySelector('p')?.textContent.trim() || '';
        const muted = node.querySelector('.muted')?.textContent.trim() || '';
        const rows = [];
        const grid = node.querySelector('.comp-grid');
        if (grid) {
            const cells = Array.from(grid.querySelectorAll('.comp-cell'));
            for (let i = 0; i < cells.length; i += 3) {
                const tema = cells[i]?.textContent.trim() || '';
                const jovem = cells[i+1]?.textContent.trim() || '';
                const velha = cells[i+2]?.textContent.trim() || '';
                if (tema) rows.push({ tema, jovem, velha });
            }
        }
        sections.push({ node, title, paragraph, muted, rows });
    }
    return sections;
}

async function iniciarBusca() {
    const container = obterOuCriarContainerResultados();
    // try to load data.json (optional)
    try {
        const resposta = await fetch('data.json');
        if (resposta.ok) {
            dados = await resposta.json();
        } else {
            dados = [];
        }
    } catch (e) {
        dados = [];
    }

    const inputBusca = document.querySelector('input[type="text"]');
    const termo = (inputBusca?.value || '').trim().toLowerCase();
    // if search is empty, restore original page and remove any previous results
    if (!termo) {
        restoreMainContent();
        return;
    }
    const pageItems = gatherPageItems();
    // normalize dados (from data.json) to same shape
    const jsonItems = (dados || []).map(d => ({
        nome: d.nome || '',
        descricao: d.descricao || '',
        data_criacao: d.data_criacao || '',
        link: d.link || '',
        source: 'json'
    }));

    let allItems = [...pageItems, ...jsonItems];

    // First, check site sections for matches and prefer showing filtered quadro(s)
    const sectionsData = gatherSectionsData();
    const matchedSections = [];
    if (termo) {
        for (const sec of sectionsData) {
            const titleMatch = sec.title.toLowerCase().includes(termo);
            const paraMatch = sec.paragraph.toLowerCase().includes(termo);
            const matchedRows = sec.rows.filter(r => (
                r.tema.toLowerCase().includes(termo) ||
                r.jovem.toLowerCase().includes(termo) ||
                r.velha.toLowerCase().includes(termo)
            ));
            if (titleMatch || paraMatch || matchedRows.length > 0) {
                matchedSections.push({ section: sec, matchedRows, titleMatch, paraMatch });
            }
        }
    }

    // hide original page content except the results container and prepare it
    limparCards(container);
    hideMainExcept(container);

    if (matchedSections.length > 0 && termo) {
        // show only matched sections and filter their quadro rows according to the term
        renderizarSectionsFiltered(matchedSections, container, termo);
        return;
    }

    // fallback: show combined items (page overviews + json) as cards
    let resultados = allItems;
    if (termo) {
        resultados = allItems.filter(item => {
            const nome = (item.nome || '').toLowerCase();
            const desc = (item.descricao || '') .toLowerCase();
            const data = (item.data_criacao || '').toLowerCase();
            return nome.includes(termo) || desc.includes(termo) || data.includes(termo);
        });
    }

    if (resultados.length > 0) {
        renderizarCards(resultados, container);
    } else {
        container.innerHTML = `<p>Nenhum resultado encontrado para "${termo}".</p>`;
    }
}

function renderizarSectionsFiltered(matchedSections, container, termo) {
    for (const match of matchedSections) {
        const sec = match.section;
        const wrapper = document.createElement('section');
        wrapper.className = 'theme-section search-result';

        const h2 = document.createElement('h2');
        h2.textContent = sec.title;
        wrapper.appendChild(h2);

        if (sec.paragraph) {
            const p = document.createElement('p');
            p.innerHTML = highlightTerm(sec.paragraph, termo);
            wrapper.appendChild(p);
        }

        // build comparison block
        const comparison = document.createElement('div');
        comparison.className = 'comparison';

        const compTitle = document.createElement('div');
        compTitle.className = 'comparison-title';
        compTitle.innerHTML = `<span class="icon">💡</span><strong>${sec.title}</strong>${sec.muted ? ` <span class="muted">${sec.muted}</span>` : ''}`;
        comparison.appendChild(compTitle);

        const grid = document.createElement('div');
        grid.className = 'comp-grid';
        grid.setAttribute('role','table');
        grid.setAttribute('aria-label', `Resultados para ${sec.title}`);

        // headers
        const head1 = document.createElement('div'); head1.className = 'comp-cell comp-head'; head1.textContent = 'Tema da Conexão';
        const head2 = document.createElement('div'); head2.className = 'comp-cell comp-head'; head2.textContent = 'O que o Jovem Ensina / O que a Geração Ensina';
        const head3 = document.createElement('div'); head3.className = 'comp-cell comp-head'; head3.textContent = 'Valor';
        grid.appendChild(head1); grid.appendChild(head2); grid.appendChild(head3);

        // decide rows: if title/paragraph matched and no matchedRows, show all rows; else show only matchedRows
        const rowsToShow = (match.titleMatch || match.paraMatch) && match.matchedRows.length === 0 ? sec.rows : match.matchedRows;
        for (const r of rowsToShow) {
            const c1 = document.createElement('div'); c1.className = 'comp-cell'; c1.innerHTML = highlightTerm(r.tema, termo);
            const c2 = document.createElement('div'); c2.className = 'comp-cell'; c2.innerHTML = highlightTerm(r.jovem, termo);
            const c3 = document.createElement('div'); c3.className = 'comp-cell'; c3.innerHTML = highlightTerm(r.velha, termo);
            grid.appendChild(c1); grid.appendChild(c2); grid.appendChild(c3);
        }

        comparison.appendChild(grid);
        wrapper.appendChild(comparison);

        // add actions block below the quadro if original section had actions, attempt to copy
        const origActions = sec.node.querySelector('.actions');
        if (origActions) {
            const actionsClone = origActions.cloneNode(true);
            wrapper.appendChild(actionsClone);
        }

        container.appendChild(wrapper);
    }
}

function highlightTerm(text, termo) {
    if (!termo) return text;
    try {
        const safe = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('(' + safe + ')', 'ig');
        return text.replace(re, '<mark>$1</mark>');
    } catch (e) {
        return text;
    }
}

function renderizarCards(dados, container) {
    for (let dado of dados) {
        let article = document.createElement("article");
        article.classList.add("card");
        const titulo = dado.nome || '';
        const dataCriacao = dado.data_criacao ? `<p>${dado.data_criacao}</p>` : '';
        const descricao = dado.descricao || '';
        const link = dado.link || '';

        article.innerHTML = `
                <h2>${titulo}</h2>
                ${dataCriacao}
                <p>${descricao}</p>
                ${link ? `<a href="${link}" target="_blank">Saiba mais</a>` : ''}
                `;
        container.appendChild(article);
    }
}

// Theme toggle: persist preference in localStorage
function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = '☀️';
        localStorage.setItem('site-theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = '🌙';
        localStorage.setItem('site-theme', 'dark');
    }
}

function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const saved = localStorage.getItem('site-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(saved);
    btn.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-theme');
        applyTheme(isLight ? 'dark' : 'light');
    });
}

// initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
    initThemeToggle();
}
