let cardContainer = document.querySelector(".card-container");
let dados = [];

function limparCards() {
    cardContainer.innerHTML = "";
}

async function iniciarBusca() {
    let resposta = await fetch("data.json");
    dados = await resposta.json();
    const inputBusca = document.querySelector('input[type="text"]');
    const termo = inputBusca.value.trim().toLowerCase();
    let resultados = dados;
    if (termo) {
        resultados = dados.filter(dado =>
            dado.nome.toLowerCase().includes(termo) ||
            dado.descricao.toLowerCase().includes(termo) ||
            String(dado.data_criacao).includes(termo)
        );
    }
    limparCards();
    if (resultados.length > 0) {
        renderizarCards(resultados);
    } else {
        cardContainer.innerHTML = `<p>Nenhum resultado encontrado para "${termo}".</p>`;
    }
}

function renderizarCards(dados) {
    for (let dado of dados) {
        let article = document.createElement("article");
        article.classList.add("card");
        article.innerHTML = `
                <h2>${dado.nome}</h2>
                <p>${dado.data_criacao}</p>
                <p>${dado.descricao}</p>
                <a href="${dado.link}" target="_blank">Saiba mais</a>
                `
        cardContainer.appendChild(article);
    }
}