# UI/UX Design System — Instruções para o Agente

## Objetivo

Ao criar, modificar ou refatorar qualquer interface desta aplicação, siga obrigatoriamente este Design System.

O objetivo visual é criar uma aplicação:

- Moderna
- Minimalista
- Clean
- Amigável
- Mobile-first
- Modular
- Consistente
- Levemente gamificada

A referência visual utiliza interfaces claras, cards arredondados, bastante espaço em branco, azul (Notion Blue) como cor de destaque e informações apresentadas de forma simples e visual.

---

# 1. Regra principal

NÃO redesenhe cada página de maneira independente.

Toda nova tela deve parecer parte do mesmo produto.

Antes de criar um componente novo:

1. Verifique se já existe componente equivalente.
2. Reutilize componentes existentes sempre que possível.
3. Respeite os mesmos tokens de cor, espaçamento, radius e tipografia.
4. Não introduza novos padrões visuais sem necessidade.
5. Preserve consistência entre desktop e mobile.

---

# 2. Direção Visual

Utilize:

- Fundo geral claro
- Cards brancos
- Cantos arredondados
- Bordas discretas
- Sombras extremamente suaves
- Tipografia moderna
- Ícones minimalistas
- Bastante whitespace
- Azul (Notion Blue) como principal cor de ação
- Cores pastel para elementos secundários

Evite:

- Sombras pesadas
- Bordas escuras
- Gradientes excessivos
- Muitas cores simultaneamente
- Interfaces muito densas
- Cards desnecessários
- Excesso de texto
- Animações exageradas

---

# 3. Cores

Utilize os seguintes tokens como base:

> Valores abaixo espelham os tokens reais em `web/src/index.css` (fonte de
> verdade) — ver `docs/brand-guidelines.md` para a justificativa de cada um.

```css
:root {
  --primary: #0E5A96;
  --primary-hover: #0B4878;
  --primary-light: #14699F;
  --primary-soft: #EAF2F9;

  --background: #F8F8FC;
  --surface: #FFFFFF;

  --text-primary: #20202A;
  --text-secondary: #777783;
  --text-muted: #A0A0AA;

  --border: #ECECF2;

  --success: #45C98B;
  --success-soft: #EAF9F2;

  --warning: #FFB84D;
  --warning-soft: #FFF5E5;

  --danger: #FF647C;
  --danger-soft: #FFF0F3;

  --info: #5C9DFC;
  --info-soft: #EEF5FF;
}