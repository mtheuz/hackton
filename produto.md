# FOCO — Definição do Produto
*Hackathon: Uso Consciente de Celulares nas Escolas*

## Em uma frase
Uma plataforma gamificada e educacional que ensina o aluno a usar o celular como ferramenta de estudo — dentro da sala de aula, guiado pelo professor, e fora dela, interceptando o momento em que ele ia se distrair e oferecendo estudo no lugar.

## Público-alvo do MVP
Ensino Fundamental 2 e Médio. É onde a Lei 15.100/2025 pega mais forte e onde o aluno já tem autonomia real de uso do celular.

## Os três atores

| Ator | O que ganha |
|---|---|
| **Aluno** | Celular vira ferramenta de aula e de estudo em casa, com progressão visível por matéria e recompensas reais. Recebe um retrato privado de como está indo — só ele vê. |
| **Professor** | Aula mais dinâmica, uso autorizado dentro da Lei 15.100, painel de engajamento e domínio da turma em tempo real, agência pra lançar desafios. |
| **Escola** | Registro automático do uso pedagógico autorizado (compliance com a lei) + sinais agregados (nunca individuais) de bem-estar da turma (obrigação do Decreto 12.385) + programa de recompensas reais que ela mesma define. |

## As cinco peças do MVP

### 1. Modo Aula (professor)
Professor escolhe turma + atividade (quiz colaborativo, pergunta aberta, enquete), abre uma sessão. Gera código de 4 dígitos / QR. Alunos entram pelo navegador, sem instalar nada. Painel do professor mostra % de engajamento em tempo real, onde a turma travou, e o nível de "Domínio" da turma por matéria. Professor pode lançar um "desafio da semana" que dobra os Pontos de Foco de uma atividade específica.

### 2. Intercepta (fora da escola)
No onboarding, o aluno marca os horários em que costuma ficar no celular à toa. Nesses horários, chega uma notificação oferecendo uma missão de 3–5 min ligada ao conteúdo do dia (cadastrado pelo professor), no lugar do scroll de sempre. Completar rende Pontos de Foco em dobro — o bônus recompensa a troca do impulso, não o tempo de uso do app. Dispensar a missão não gera perda nenhuma.

### 3. Tutor restrito (chat com IA)
Ajuda dentro das missões e atividades. Instruído a nunca entregar resposta pronta — conduz por perguntas até o aluno chegar sozinho na resposta.

### 4. Check-in de humor + Raio-X privado
Toque rápido de humor antes de cada sessão. Com o dado acumulado, o aluno recebe um insight privado (ex.: "nos dias que você chega ansioso, se distrai o dobro"). Camada de saúde mental que nasce do dado que já existe.

### 5. Gamificação — Pontos de Foco (PF)
- **Moeda única:** PF, ganho por decisão (escolher estudar), não por tempo de tela.
- **Trilha de Domínio por matéria:** progressão visível (Ex: Domínio em Biologia, nível 3), alimentada por aula + missões de casa daquela matéria. Substitui avatar/RPG genérico — mais barato de construir e mais conectado ao "estudar como ferramenta".
- **Medidor coletivo da turma:** barra que a turma preenche junto, semana a semana. Nunca regride — só cresce mais devagar com menos participação. Bate meta coletiva = bônus pra todos.
- **Recompensa final é física, não digital:** PF acumulado vira algo real negociado com a escola (minutos de recreio extra, escolha de atividade em grupo, evento de bimestre) — evita contradizer "uso consciente" com mais uma recompensa de tela.

## O fio que conecta tudo
Um único evento (`entrou`, `saiu`, `completou_missão`, `check-in`, `respondeu`) alimenta três visões diferentes: aluno vê só o seu (privado), professor vê o agregado da sala em tempo real, escola vê o agregado por turma ao longo do tempo. Mesma tabela de dados, três filtros — não triplica o trabalho.

## Decisões técnicas já travadas
- **PWA, não app nativo.** Sem bloqueio de sistema — medimos presença (Page Visibility API), não vigiamos o aparelho. Zero fricção de instalação, zero permissão invasiva.
- **Saída da sessão é graciosa.** Perde o bônus daquele momento, nunca o progresso acumulado. Sem punição coletiva (diferente do Forest, que mata a árvore de todo mundo quando alguém sai).
- **Stack:** Go (sessões/eventos, WebSocket ou polling) + React/TS (front) + Postgres (dados de sessão/humor/PF) + API de IA só no tutor (testar rate limit antes de domingo).

## Modelo de dados (rascunho)
- **usuarios** (id, papel: aluno/professor/coordenador, escola_id, turma_id)
- **sessoes** (id, professor_id, turma_id, atividade_id, criada_em, encerrada_em)
- **eventos** (id, usuario_id, sessao_id ou missao_id, tipo, valor, pf_gerado, timestamp)
- **atividades** (id, professor_id, materia, enunciado, tipo, gabarito_ou_criterio)
- **missoes_intercepta** (id, atividade_id, aluno_id, horario_disparo, completada_em)
- **dominio_materia** (aluno_id, materia, nivel, pf_acumulado)

## Fora do MVP de domingo (vira "próximos passos" no pitch)
Bloqueio nativo de outros apps (exige Accessibility Service = app nativo), painel completo de controle parental, suporte a Fundamental 1, geração automática de missões por IA a partir de resumo do professor.

---

# Fluxo de Telas

## A) Onboarding (uma vez, no primeiro acesso)
1. **Boas-vindas** — nome, escola, turma (código fornecido pelo professor).
2. **Check-in de humor inicial** — emoji, 1 toque.
3. **Pacto pessoal** — "hoje eu quero: [chip: focar até o fim / melhorar um pouco / só experimentar]".
4. **Horários de risco** — aluno marca 1–3 janelas do dia em que costuma ficar no celular à toa.

## B) Fluxo do Professor — Modo Aula
1. **Login simples** (nome + escola).
2. **Escolher turma** (lista pré-cadastrada pra demo).
3. **Escolher atividade** (banco pré-pronto, por matéria).
4. **Iniciar sessão** → código de 4 dígitos + QR grande (pra projetar).
5. **Painel ao vivo** — % engajado, onde a turma trava, nível de Domínio da turma, botão "lançar desafio da semana" (dobra PF), botão "encerrar sessão".
6. **Encerrar** → resumo simples da sessão (sem nomes).

## C) Fluxo do Aluno — dentro da aula
1. **Entrar por código/QR.**
2. **Check-in de humor** (se ainda não fez hoje).
3. **Tela da atividade** — pergunta atual, campo de resposta, ícone do tutor.
4. **Chat do tutor** (modal) — pergunta-guia, nunca a resposta pronta.
5. **Tela de transição** — progresso visual da turma, sem nomes.
6. **Fim da sessão** — "colheita": medidor coletivo atualizado + PF ganhos.
7. **Raio-X privado** — tempo de foco, saídas, insight humor×foco (pré-populado na demo).

## D) Fluxo do Aluno — fora da escola (Intercepta)
1. **Notificação** no horário de risco: *"Que tal 5 min de [matéria] em vez do scroll?"*
2. **Tela da missão** — 2–3 perguntas curtas, tutor disponível se travar.
3. **Tela de resultado** — PF em dobro + contador "trocas conscientes essa semana".
4. **Dispensar sem culpa** — botão "agora não", sem penalidade.

## E) Trilha de Domínio (aluno, tela própria)
1. **Lista de matérias** com barra de progresso por matéria.
2. **Ao tocar numa matéria:** histórico de atividades feitas + PF acumulado ali.

## F) Painel da Escola (pode ser semi-simulado na demo)
1. **Login da coordenação.**
2. **Painel semanal por série/turma** (nunca por aluno): sessões pedagógicas registradas (compliance com a Lei 15.100), tendência agregada de humor, ranking de PF coletivo por turma (pra decidir recompensas reais).
3. **Nenhum drill-down individual** — privacidade é regra de design, não promessa verbal.