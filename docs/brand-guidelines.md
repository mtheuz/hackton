# Brand Guidelines — Fokido v1.0

> Última atualização: 2026-09-12
> Status: Draft
> Fonte de verdade dos tokens: `web/src/index.css` (`@theme`). Este documento explica e justifica esses valores — não os regenera nem os substitui.

## Quick Reference

| Elemento | Valor |
|----------|-------|
| Cor Primária | #0E5A96 (Notion Blue) |
| Fundo | #F8F8FC |
| Superfície (card) | #FFFFFF |
| Fonte | Stack de sistema (sem webfont) |
| Voz | Acolhedora, encorajadora, simples |

---

## 1. Paleta de Cores

Todos os valores abaixo já existem em `web/src/index.css`; esta tabela documenta o significado de cada um, não define novos.

### Primária — Notion Blue

| Token | Hex | Uso |
|-------|-----|-----|
| `brand-50` | #eaf2f9 | Fundo de badge/destaque suave (ex: contador de trocas de impulso) |
| `brand-100` | #d0e3f2 | Estado selecionado (ex: humor escolhido no check-in) |
| `brand-500` | #14699f | Anel de foco/seleção |
| `brand-600` | #0e5a96 | Ação primária — botões, links, texto de destaque |
| `brand-700` | #0b4878 | Hover |
| `brand-800` | #0a4370 | Active/pressed |

**Por quê azul, não roxo:** o DESIGN.md original especificava roxo (#7C5CFC); decisão de produto (2026-09-12) manteve o azul já implementado por transmitir o tom institucional/regulatório do contexto escolar (Lei 15.100, Decreto 12.385) sem perder acessibilidade. DESIGN.md foi atualizado para refletir isso — ver commit correspondente.

### Neutros

| Token | Hex | Uso |
|-------|-----|-----|
| `canvas` | #f8f8fc | Fundo geral da página |
| `surface` | #ffffff | Cards, superfícies elevadas |
| `ink-900` / `ink-700` | #20202a | Texto primário, títulos |
| `ink-500` | #5f5f6b | Texto secundário (escurecido de propósito — ver nota abaixo) |
| `ink-300` | #a0a0aa | Texto terciário/muted |
| `line-200` | #ececf2 | Bordas discretas |

**Nota de acessibilidade:** `ink-500` foi escurecido de #777783 (valor original do DESIGN.md, ~4.3:1 contra branco) para #5f5f6b (~6.4:1), porque o original falhava WCAG AA para texto pequeno. Nunca reverter isso sem revalidar contraste.

### Semânticas

| Estado | Fundo | Texto/Ícone | Uso |
|--------|-------|-------------|-----|
| Sucesso | `success-50` #eaf9f2 | `success-600` #45c98b | Resposta correta, confirmações |
| Alerta | `warning-50` #fff5e5 | `warning-600` #ffb84d | Avisos, pendências |
| Erro | `danger-50` #fff0f3 | `danger-600` #ff647c | Erros, ações destrutivas (Sair, Encerrar aula) |
| Info | `info-50` #eef5ff | `info-600` #5c9dfc | Mensagens informativas (ainda sem uso ativo na UI) |

### Acessibilidade

- Todo texto de conteúdo real (não decorativo) deve passar 4.5:1 contra o fundo em que está — `ink-500` já foi corrigido para isso.
- Nunca usar cor como único indicador de estado (ex: resposta certa/errada no Modo Aula também usa borda + peso de fonte, não só cor).

---

## 2. Tipografia

Sem webfont — propositalmente. CLAUDE.md §6.B exige carregamento inicial mínimo pro 3G/4G dos alunos; a stack de sistema evita esse custo:

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### Escala (uso real observado no código, não uma escala nova)

| Classe Tailwind | Px | Uso |
|------------------|-----|-----|
| `text-xs` | 12px | Labels, legendas, texto secundário |
| `text-sm` | 14px | Corpo padrão, botões |
| `text-base` | 16px | Nome do usuário no header |
| `text-lg` | 18px | — |
| `text-2xl` | 24px | Ênfase (código da sessão em Modo Aula, stats) |
| `text-3xl` | 30px | Código de sessão do Modo Aula |

Pesos: `font-medium` para ênfase leve, `font-semibold` para títulos de seção/labels, `font-bold` só no código de sessão.

---

## 3. Logo

Estado atual: `web/public/logo.png` (arquivo único, sem variantes). **Gap conhecido** — não existe versão ícone-só, monocromática ou para fundo escuro. Não inventar arquivos que não existem; se precisar de uma variante, gerar e documentar aqui quando existir.

---

## 4. Voz & Tom

### Personalidade de marca

| Traço | Descrição |
|-------|-----------|
| **Acolhedor** | Nunca julga humor ruim ou resposta errada — recebe sem drama |
| **Encorajador** | Celebra a troca de impulso por estudo, não o tempo gasto no app |
| **Simples** | Frases curtas, sem jargão técnico ou pedagógico |
| **Respeitoso da autonomia** | O Tutor Restrito nunca entrega resposta pronta — guia com pergunta |

### Voice Chart

| Traço | Somos | Não somos |
|-------|-------|-----------|
| Acolhedor | Gentil, sem julgamento ("Quase! A resposta certa está destacada acima.") | Frio, robótico |
| Encorajador | Celebra vitórias comportamentais ("Valeu por trocar a rede social pelo estudo!") | Performático, exagerado |
| Simples | Direto, linguagem de adolescente/EF2-EM | Infantilizado, condescendente |
| Autonomia | Pergunta orientadora, decomposição em etapas | Entrega resposta pronta |

### Tom por contexto

| Contexto | Tom | Exemplo real do código |
|----------|-----|-------------------------|
| Tutor Restrito | Socrático, nunca a resposta pronta | "Explique gentilmente que seu papel é ajudá-lo a pensar" |
| Feedback de erro (Intercepta/Modo Aula) | Calmo, sem culpa | "Quase! A resposta certa está destacada acima." |
| Sucesso/gamificação | Breve, celebratório, NUNCA sobre tempo de tela | "Valeu por trocar a rede social pelo estudo! +N PF" |
| Check-in de humor | Neutro, sem pressão | "Como você está agora?" |
| Erros de sistema (login, rede instável) | Claro, sem jargão técnico | "Código não encontrado. Confira com o professor." |

### Termos proibidos

| Evitar | Por quê |
|--------|---------|
| "Tempo de uso", "tempo logado", "tempo de tela" | Contradiz o princípio anti-vício do produto (CLAUDE.md §2.A) — placar mede só **trocas de impulso por estudo** |
| "Streak", "sequência de dias" | Padrão de dark pattern de retenção viciante |
| "Resposta certa é..." (dito pelo Tutor Restrito) | Viola a regra inegociável do Tutor Restrito de nunca entregar resposta pronta |
| Jargão pedagógico/corporativo ("sinergia", "engajamento 360") | Público é aluno de EF2/EM — linguagem simples sempre |

---

## 5. Imagens e Ícones

### Ícones (implementado)

- Fonte: Iconify via `unplugin-icons`, compilado em build-time (zero runtime, zero rede externa) — ver `web/vite.config.ts`.
- Coleções em uso: `streamline-ultimate-color` (ilustrativos: sync, gráfico de barras, moldura/montanha) e `twemoji` (rostos de humor, capelo, mão levantada — únicos com match real pra esses conceitos).
- Tamanho padrão: `h-4 w-4`/`h-5 w-5` inline com texto, `h-7 w-7` em cards de estatística, `h-16 w-16` em empty states.

### Motivo de escrita/estudo (adicionar quando fizer sentido)

Pra reforçar a identidade de "estudo"/"aprendizagem ativa" além dos ícones já usados (gráfico, sync), incorporar elementos que remetem à escrita — livro, caderno, lápis — em empty states e telas de progresso/conquista. Candidatos já verificados na coleção `streamline-ultimate-color` (ver `docs/superpowers` ou rodar a mesma busca em `icons.json` antes de usar, não adivinhar hash/slug):
- `notes-book`, `notes-book-text`, `book-open-bookmark`, `programming-book`
Usar principalmente em: progresso do aluno (`AlunoHome`, aba Progresso), qualquer tela futura de "conquistas"/histórico de estudo.

### Estilo

- Colorido, flat, cantos arredondados — nunca outline monocromático puro (contradiz "levemente gamificada" do DESIGN.md).
- Nunca ícone decorativo com significado ambíguo em local onde a informação importa (ex: humor do Raio-X) — preferir emoji real (twemoji) a aproximação semântica errada.

---

## 6. Componentes de Design

### Border Radius (uso real)

| Elemento | Classe | Radius |
|----------|--------|--------|
| Cards/seções | `rounded-2xl` | 16px |
| Inputs, itens de lista internos | `rounded-lg` | 8px |
| Botões, badges, avatares, pills | `rounded-full` | 9999px |

### Sombra

- `shadow-sm` em cards — única sombra usada no app. Nunca introduzir sombra mais pesada (DESIGN.md §2 "Evite: Sombras pesadas").

### Botões

| Tipo | Classe base | Uso |
|------|-------------|-----|
| Primário | `bg-brand-600 text-white rounded-full` | Ação principal (Entrar, Lançar atividade, Enviar) |
| Secundário/outline | `border border-line-200 text-ink-700 rounded-full` | Ação secundária (Nova atividade) |
| Destrutivo | `text-danger-600` | Sair, Encerrar aula |

Altura mínima de toque: `min-h-11` (44px) em todo elemento interativo — não reduzir, é acessibilidade mobile.

---

## Changelog

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | 2026-09-12 | Guidelines inicial — documenta tokens/voz já existentes, resolve contradição roxo×azul do DESIGN.md |
