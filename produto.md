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
| **Professor** | Aula mais dinâmica, uso autorizado dentro da Lei 15.100, painel de engajamento e domínio da turma em tempo real (incluindo humor agregado), agência pra lançar desafios e sincronizar conteúdo direto no celular do aluno. |
| **Escola** | Registro automático do uso pedagógico autorizado (compliance com a lei) + sinais agregados (nunca individuais) de bem-estar da turma (obrigação do Decreto 12.385) + programa de recompensas reais que ela mesma define. |

## As cinco peças do MVP

### 1. Modo Aula + Acompanhamento de Aula (professor + aluno, em tempo real)
Professor escolhe turma + atividade (quiz colaborativo, pergunta aberta, enquete), abre uma sessão. Gera código de 4 dígitos / QR. Alunos entram pelo navegador, sem instalar nada.

**Configuração por toggles, ao iniciar a sessão:** permitir anotações / permitir chatbot livre / modo foco ativo / quiz ao final / modo acessibilidade (amplia texto/imagem e gera legenda quando o professor marca um gatilho como "contém imagem"). Simples, sem IA — é um formulário.

Ao abrir a sessão, o professor vê o **humor agregado da turma** (do check-in do dia) antes de começar — nunca por aluno, sempre em conjunto.

Durante a aula, o professor dispara **gatilhos de conteúdo**: sincroniza no celular do aluno, em tempo real, uma foto ampliada, uma fórmula, ou material de apoio pro momento exato da explicação (via Supabase Realtime — mesma infraestrutura do painel de engajamento, só que na direção professor → aluno). Se modo acessibilidade estiver ligado, uma legenda/descrição em texto acompanha a imagem — é o gancho de acessibilidade que a própria Lei 15.100 já prevê como exceção.

**Na tela do aluno (Acompanhamento de Aula):** o conteúdo do gatilho aparece em destaque, com legenda se aplicável. Um botão **"não entendi"** abre o Tutor restrito já contextualizado com o conteúdo daquele momento específico, pedindo explicação mais simples — é personalização sob demanda, puxada pelo aluno, não um sistema analisando histórico de notas por trás. Um botão de **"dúvida"** soma no painel do professor como "X alunos com dúvida agora", sem precisar de reconhecimento de padrão nenhum.

Painel do professor mostra % de engajamento em tempo real, onde a turma travou, contagem de dúvidas sinalizadas, e o nível de "Domínio" da turma por matéria. Professor pode lançar um "desafio da semana" que dobra os Pontos de Foco de uma atividade específica.

**Importante — limite técnico assumido de propósito:** o app entra em "modo foco" *dentro da própria experiência* (tela cheia, sem distração visual, presença monitorada via Page Visibility API). Ele **não silencia o celular no nível do sistema operacional** — isso exigiria um app nativo com permissões de acessibilidade, fora do escopo de um PWA. Essa limitação é discurso no pitch ("zero permissão invasiva, zero instalação"), não um problema a esconder.

**Transcrição automática da fala do professor:** tecnicamente viável via Web Speech API (nativa do navegador, gratuita), mas inconsistente em Safari/iOS. Só incluir na demo se testado e funcionando bem no aparelho real; senão, fallback é legenda manual digitada pelo professor nos momentos-chave.

### 2. Intercepta (fora da escola — absorve os "Desafios")
No onboarding, o aluno marca os horários em que costuma ficar no celular à toa. Nesses horários, chega uma notificação oferecendo uma missão de 3–5 min ligada ao conteúdo do dia (cadastrado pelo professor), no lugar do scroll de sempre.

O que era discutido como "Desafios" (tarefa de casa configurável em vídeo/texto/arquivo livre) **funde-se nesta peça**, mantendo o formato de missão curta e objetiva (resposta certa/errada ou aberta curta avaliável pelo tutor de IA) — formato livre de vídeo/arquivo exigiria revisão manual ou pipeline de avaliação que não cabe em 12h.

Completar rende Pontos de Foco em dobro — o bônus recompensa a troca do impulso, não o tempo de uso do app. Dispensar a missão não gera perda nenhuma.

### 3. Tutor restrito (chat com IA)
Ajuda dentro das missões e atividades. Instruído a nunca entregar resposta pronta — conduz por perguntas até o aluno chegar sozinho na resposta.

### 4. Check-in de humor + Raio-X privado
Toque rápido de humor antes de cada sessão. Alimenta tanto o painel agregado do professor (Modo Aula) quanto o insight privado do aluno: "nos dias que você chega ansioso, se distrai o dobro" (Raio-X). Camada de saúde mental que nasce do dado que já existe.

### 5. Gamificação — Pontos de Foco (PF)
- **Moeda única:** PF, ganho por decisão (escolher estudar), não por tempo de tela.
- **Trilha de Domínio por matéria:** progressão visível (Ex: Domínio em Biologia, nível 3), alimentada por aula + missões de casa daquela matéria.
- **Medidor coletivo da turma:** barra que a turma preenche junto, semana a semana. Nunca regride — só cresce mais devagar com menos participação. Bate meta coletiva = bônus pra todos.
- **Recompensa final é física, não digital:** PF acumulado vira algo real negociado com a escola (minutos de recreio extra, escolha de atividade em grupo, evento de bimestre).

## O fio que conecta tudo
Um único evento (`entrou`, `saiu`, `completou_missão`, `check-in`, `respondeu`, `gatilho_conteudo`) alimenta três visões diferentes: aluno vê só o seu (privado), professor vê o agregado da sala em tempo real, escola vê o agregado por turma ao longo do tempo. Mesma tabela de dados, três filtros — não triplica o trabalho, incluindo a peça nova de gatilhos de conteúdo.

## Decisões técnicas já travadas
- **PWA, não app nativo.** Sem bloqueio de sistema — medimos presença (Page Visibility API), não vigiamos o aparelho nem silenciamos notificações de outros apps. Zero fricção de instalação, zero permissão invasiva.
- **Saída da sessão é graciosa.** Perde o bônus daquele momento, nunca o progresso acumulado. Sem punição coletiva (diferente do Forest, que mata a árvore de todo mundo quando alguém sai).
- **Stack:** Go + Gin (sessões/eventos) + React/TS (front) + Supabase (Postgres + Auth + Realtime) + API de IA só no tutor, chamada pelo backend (testar rate limit antes de domingo).

## Modelo de dados (rascunho)
- **usuarios** (id, papel: aluno/professor/coordenador, escola_id, turma_id)
- **sessoes** (id, professor_id, turma_id, atividade_id, criada_em, encerrada_em)
- **eventos** (id, usuario_id, sessao_id ou missao_id, tipo, valor, pf_gerado, timestamp)
- **atividades** (id, professor_id, materia, enunciado, tipo, gabarito_ou_criterio)
- **missoes_intercepta** (id, atividade_id, aluno_id, horario_disparo, completada_em)
- **dominio_materia** (aluno_id, materia, nivel, pf_acumulado)
- **gatilhos_conteudo** (id, sessao_id, tipo: imagem/formula/anotacao, conteudo, legenda_acessibilidade, disparado_em)
- **config_sessao** (sessao_id, permite_anotacao, permite_chatbot, modo_foco, modo_acessibilidade, quiz_final)
- **duvidas_sinalizadas** (id, sessao_id, usuario_id, timestamp) — agregado no painel do professor, nunca exibido por nome

## Fora do MVP de domingo (vira "próximos passos" no pitch)
- Modo silencioso de sistema / bloqueio de outros apps (exige app nativo com Accessibility Service)
- Importação/geração automática de slides pelo professor
- Gestão completa de notas e faltas
- Fluxo de aula prática/laboratório com registro fotográfico passo a passo
- Painel completo de controle parental
- Suporte a Fundamental 1
- Geração automática de missão via IA a partir de resumo do professor
- Desafios em formato livre (vídeo/arquivo) com avaliação manual
- Adaptação de conteúdo baseada em histórico de notas/desempenho do aluno (motor de recomendação — o "não entendi" sob demanda cobre a mesma necessidade com muito menos esforço)
- Transcrição automática de voz em tempo real, caso não funcione de forma confiável no aparelho da demo

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
4. **Configurar sessão** — toggles: anotações / chatbot livre / modo foco / quiz final / modo acessibilidade.
5. **Iniciar sessão** → código de 4 dígitos + QR grande (pra projetar). Tela mostra o humor agregado da turma antes de começar.
6. **Painel ao vivo** — % engajado, onde a turma trava, contagem de dúvidas sinalizadas, nível de Domínio da turma, botão "enviar gatilho de conteúdo" (imagem/fórmula/anotação + legenda se acessibilidade ativa), botão "lançar desafio da semana" (dobra PF), botão "encerrar sessão".
6. **Encerrar** → resumo simples da sessão (sem nomes).

## C) Fluxo do Aluno — dentro da aula
1. **Entrar por código/QR.**
2. **Check-in de humor** (se ainda não fez hoje).
3. **Tela de Acompanhamento de Aula** — pergunta atual, campo de resposta, ícone do tutor. Recebe gatilhos de conteúdo do professor em tempo real (imagem ampliada, fórmula, legenda de acessibilidade se ativa) nessa mesma tela. Botão "não entendi" (abre o tutor contextualizado) e botão "dúvida" (sinaliza pro professor, agregado).
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