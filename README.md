# Desafio de Codificação — Projeto Terra Fértil (IFRO)

Solução em TypeScript para o Desafio de Codificação do **Edital nº 96/2026/REIT - CGAB/IFRO** (Projeto Terra Fértil).

O projeto implementa uma função pura e determinística para a distribuição de mudas agrícolas entre associações de agricultores familiares no Estado de Rondônia, aplicando regras de elegibilidade, cotas máximas, distribuição proporcional (Método dos Maiores Restos), gestão de saturação e critérios de desempate.

---

## 🛠️ Tecnologias e Requisitos

- **Linguagem:** TypeScript
- **Test Runner:** Vitest
- **Gerenciador de Pacotes:** npm
- **Lógica:** Implementada estritamente com a biblioteca padrão do TypeScript/JavaScript.

---

## 📁 Estrutura do Repositório

```text
.
├── package.json       # Configurações do projeto e scripts de teste
├── rateio.ts          # Interfaces, classe de erro e algoritmo de rateio
├── rateio.test.ts     # Suíte de testes automatizados
└── README.md          # Documentação do repositório