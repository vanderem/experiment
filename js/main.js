/**
 * Arquivo principal do experimento
 * 
 * Este arquivo integra todos os módulos e implementa a timeline completa do experimento.
 */

// Variáveis globais
let jsPsych;
let timeline = [];
let allTexts = [];
let participantTexts = [];

// Gera timestamp ISO (com timezone do navegador)
function nowISO() {
    return new Date().toISOString();
}

// Hash síncrono leve (FNV-1a 32-bit) para "versionar" o HTML do TCLE
function hashFnv1a32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8); // hex fixo 8 dígitos
}

// Inicializa o experimento quando a página carregar
document.addEventListener("DOMContentLoaded", async function() {
    try {
        console.log("Inicializando o experimento...");
        
        // Inicializa o jsPsych
        jsPsych = initJsPsych({
            on_finish: function() {

                // Mostra os dados ao finalizar o experimento
                //jsPsych.data.displayData();
                console.log("Experimento concluído!");

                // Salva os dados em um arquivo json
                const participant_id = jsPsych.data.get().values()[0].participant_id;
                const dataJSON = jsPsych.data.get().json();

                //baixar localmente (fase de dev)
                /*const blob = new Blob([dataJSON], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dados_participante_${participant_id}.json`;
                a.click();
                URL.revokeObjectURL(url);*/

                console.log("Tamanho do JSON em caracteres:", dataJSON.length);
                console.log("Aproximadamente em bytes:", new TextEncoder().encode(dataJSON).length);

                // salvar no servidor
                fetch('https://experimento-jp83.onrender.com/salvar-dados', {
                //fetch('http://localhost:3000/salvar-dados', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        participant_id: participant_id,
                        data: JSON.parse(dataJSON)
                    })
                }).then(response => {
                    if (!response.ok) throw new Error("Falha ao enviar dados");
                    //console.log("Dados enviados com sucesso.");
                    return response.json();
                }).then(result => {
                    console.log("Dados enviados e salvos como:", result.filename);
                }).catch(error => {
                    console.error("Erro ao enviar dados:", error);
                });

            },
            extensions: [
                {type: jsPsychExtensionWebgazer}
            ]
        });

        // gera uma string de 8 caracteres aleatórios para identificar o participante único
        var participant_id = jsPsych.randomization.randomID(8);
        jsPsych.data.addProperties({ participant_id: participant_id });
        console.log("Seu participant_id é", participant_id);

        console.log("jsPsych inicializado com sucesso");
        
        // Carrega os textos do corpus
        allTexts = await loadTexts();
        
        // Seleciona um subconjunto de textos para este participante
        /**
         * Seleciona textos de forma balanceada: 2 categorias, 2 textos por categoria, autores diferentes dentro da categoria
         * @param {Array} allTexts - Array de todos os textos disponíveis
         * @param {number} count - Número total de textos a selecionar (deve ser múltiplo de 2)
         * @returns {Array} Array de textos selecionados
         */
        function selectBalancedTexts(allTexts, count) {
            // Verifica se count é par
            if (count % 2 !== 0) {
                throw new Error("O número de textos a selecionar deve ser par.");
            }

            // Agrupa textos por categoria
            const textsByCategory = {};
            allTexts.forEach(text => {
                if (!textsByCategory[text.category]) {
                    textsByCategory[text.category] = [];
                }
                textsByCategory[text.category].push(text);
            });

            // Filtra categorias que têm pelo menos 2 autores diferentes
            const validCategories = {};
            Object.keys(textsByCategory).forEach(category => {
                const authors = new Set(textsByCategory[category].map(t => t.authorship));
                if (authors.size >= 2) {
                    validCategories[category] = textsByCategory[category];
                }
            });

            // Se não houver categorias suficientes, lança erro
            if (Object.keys(validCategories).length < count / 2) {
                throw new Error(`Não há categorias suficientes com pelo menos 2 autores diferentes. Necessário: ${count/2}, Disponível: ${Object.keys(validCategories).length}`);
            }

            // Seleciona aleatoriamente count/2 categorias
            const selectedCategories = jsPsych.randomization.sampleWithoutReplacement(Object.keys(validCategories), count / 2);

            // Para cada categoria selecionada, seleciona 2 textos de autores diferentes
            const selectedTexts = [];
            selectedCategories.forEach(category => {
                const categoryTexts = validCategories[category];
                // Agrupa por autor
                const textsByAuthor = {};
                categoryTexts.forEach(text => {
                    if (!textsByAuthor[text.authorship]) {
                        textsByAuthor[text.authorship] = [];
                    }
                    textsByAuthor[text.authorship].push(text);
                });

                // Seleciona 2 autores aleatoriamente
                const authors = Object.keys(textsByAuthor);
                const selectedAuthors = jsPsych.randomization.sampleWithoutReplacement(authors, 2);

                // Seleciona um texto aleatório de cada autor selecionado
                selectedAuthors.forEach(author => {
                    const authorTexts = textsByAuthor[author];
                    const selectedText = jsPsych.randomization.sampleWithoutReplacement(authorTexts, 1)[0];
                    selectedTexts.push(selectedText);
                });
            });

            return selectedTexts;
        }

        // Seleciona um subconjunto de textos para este participante
        try {
            participantTexts = selectBalancedTexts(allTexts, 4); // 4 textos por participante, balanceados
        } catch (error) {
            console.error("Erro ao selecionar textos balanceados:", error);
            document.getElementById("jspsych-target").innerHTML = `
        <div style="text-align: center; margin-top: 50px;">
            <h1>Erro na seleção dos textos</h1>
            <p>Ocorreu um erro ao selecionar os textos para o experimento. Por favor, verifique o console para mais detalhes.</p>
            <pre style="text-align: left; background: #f8f8f8; padding: 10px; border: 1px solid #ddd; margin: 20px; overflow: auto;">${error.message}\n${error.stack}</pre>
        </div>
    `;
            return; // Encerra a inicialização
        }

        // Constrói a timeline do experimento
        await buildTimeline();

        // Inicia o experimento
        console.log("Iniciando o experimento...");
        jsPsych.run(timeline);


    } catch (error) {
        console.error("Erro ao inicializar o experimento:", error);
        document.getElementById("jspsych-target").innerHTML = `
            <div style="text-align: center; margin-top: 50px;">
                <h1>Erro ao carregar o experimento</h1>
                <p>Ocorreu um erro ao inicializar o experimento. Por favor, verifique o console para mais detalhes.</p>
                <pre style="text-align: left; background: #f8f8f8; padding: 10px; border: 1px solid #ddd; margin: 20px; overflow: auto;">${error.message}\n${error.stack}</pre>
            </div>
        `;
    }
});

/**
 * Constrói a timeline completa do experimento
 */
async function buildTimeline() {
    // 1. Boas-vindas e consentimento informado
    addWelcomeAndConsent();

    // 2. Instruções gerais
    addGeneralInstructions();

    // 3. Leitura automonitorada
    addSelfPacedReadingPhase();

    // 4. Eye tracking
    await addEyeTrackingPhase();

    // 5. Teste de Associação Implícita (IAT)
    await addIATPhase();

    // 6. Avaliações subjetivas e identificação de autoria
    addEvaluationPhase();

    // 7. Questionário final e agradecimento
    addFinalQuestionnaire();
}

/**
 * Adiciona as telas de boas-vindas e consentimento informado à timeline
 */
function addWelcomeAndConsent() {
    // Tela de boas-vindas
    const welcome = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <h1>Bem-vindo ao Experimento</h1>
            <p>Obrigado por participar deste estudo sobre processamento de textos.</p>
            <p>Pare realizar os teste você precisa usar o seu computador.</p>
            <p>Desculpe, mas o celular ou tablet não irão funcionar adequadamente.</p>
            <p>O experimento dura menos que 10 minutos.</p>
            <p>Clique em "Continuar" para prosseguir.</p>
        `,
        choices: ["Continuar"],
        data: {
            task: "welcome"
        }
    };
    timeline.push(welcome);

    // TCLE
    const consent = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
        <div class="consent-form">
          <div class="consent-title">TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)</div>

          <div class="consent-section">
              <div class="consent-section-title">Título do Estudo</div>
              <p>Processamento e Julgamento de Textos Algorítmicos sob Medidas Comportamentais e Oculares</p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">Pesquisador responsável</div>
              <p>Nome: Vander Muniz<br>
              Instituição: IDP – Instituto Brasileiro de Desenvolvimento, Ensino e Pesquisa<br>
              E-mail: vanderem@uol.com.br</p>
              <p><strong>Co-pesquisadora:</strong> Profª Drª Ébida Rosa dos Santos</p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">Comitê de Ética em Pesquisa (CEP)</div>
              <p>Instituição: Centro Universitário UNIEURO<br>
              Nº do Parecer: 7.890.803</p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">1. Convite</div>
              <p>Aqui está um convite para você participar voluntariamente de um estudo online que investiga como adultos leem e avaliam textos produzidos por Inteligência Artificial (IA) e por autores humanos. Antes de aceitar, leia com atenção as informações abaixo. Em caso de dúvida, entre em contato pelos e-mails fornecidos.</p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">2. Objetivo</div>
              <p>Compreender se há diferenças no esforço de leitura, na percepção de naturalidade e nas associações implícitas quando os textos são gerados por IA ou por humanos. Os resultados poderão ajudar a criar práticas de transparência sobre conteúdo algorítmico.</p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">3. O que será solicitado a você</div>
              <ol>
                  <li>Ler quatro textos curtos (100–200 palavras cada) em seu computador, frase a frase, no seu ritmo.</li>
                  <li>Permitir o uso da webcam apenas para captar pontos de olhar (eye tracking); nenhuma imagem de vídeo será gravada.</li>
                  <li>Realizar um Teste de Associação Implícita (IAT) com palavras-alvo “Texto-IA” e “Texto-Humano”.</li>
                  <li>Responder a breves perguntas de múltipla escolha e escalas de 1 a 7 sobre clareza, naturalidade, compreensão e percepção de autoria.</li>
                  <li>Preencher rapidamente dados demográficos (idade, sexo, escolaridade, região).</li>
              </ol>
              <p><strong>Tempo total aproximado:</strong> 10 minutos.</p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">4. Benefícios esperados</div>
              <p><strong>Para os participantes:</strong></p>
              <ul>
                  <li>Autoconhecimento sobre padrões de leitura e estratégias cognitivas (feedback coletivo resumido).</li>
                  <li>Reflexão crítica sobre autoria e uso de IA na vida acadêmica.</li>
              </ul>
              <p><strong>Para a comunidade científica:</strong></p>
              <ul>
                  <li>Dados inéditos em língua portuguesa cruzando Eye tracking, IAT e julgamentos explícitos.</li>
                  <li>Avanço teórico em psicolinguística e comunicação algorítmica.</li>
              </ul>
              <p><strong>Para a sociedade:</strong></p>
              <ul>
                  <li>Evidências que podem embasar políticas de rotulagem de conteúdo gerado por IA, programas de alfabetização midiática e guias de boas práticas para uso responsável de modelos generativos.</li>
              </ul>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">5. Riscos do estudo</div>
              <table style="border-collapse: collapse; width: 100%;">
                  <tr><th style="border:1px solid #ccc;">Categoria</th><th style="border:1px solid #ccc;">Descrição</th><th style="border:1px solid #ccc;">Gravidade</th><th style="border:1px solid #ccc;">Probabilidade</th></tr>
                  <tr><td style="border:1px solid #ccc;">Desconforto ocular</td><td style="border:1px solid #ccc;">Cansaço visual leve por leitura prolongada em tela</td><td style="border:1px solid #ccc;">Baixa</td><td style="border:1px solid #ccc;">Baixa</td></tr>
                  <tr><td style="border:1px solid #ccc;">Exposição de imagem</td><td style="border:1px solid #ccc;">Captura temporária de quadro facial para calibração do eye tracking</td><td style="border:1px solid #ccc;">Baixa</td><td style="border:1px solid #ccc;">Baixa</td></tr>
                  <tr><td style="border:1px solid #ccc;">Desconforto psicológico</td><td style="border:1px solid #ccc;">Possível frustração ao errar no palpite de autoria no IAT</td><td style="border:1px solid #ccc;">Baixa</td><td style="border:1px solid #ccc;">Muito baixa</td></tr>
                  <tr><td style="border:1px solid #ccc;">Violação de confidencialidade</td><td style="border:1px solid #ccc;">Risco de reidentificação se dados fossem vazados</td><td style="border:1px solid #ccc;">Moderada</td><td style="border:1px solid #ccc;">Muito baixa</td></tr>
              </table>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">6. Privacidade e confidencialidade</div>
              <ul>
                  <li>Os registros (tempos de leitura, coordenadas de olhar, respostas) serão anonimizados usando um código alfanumérico.</li>
                  <li>Os arquivos ficarão criptografados em servidor seguro por 5 anos e depois destruídos (wipe 3-pass).</li>
                  <li>Resultados científicos poderão ser publicados em revistas ou repositórios, sempre sem identificar nenhum participante.</li>
                  <li>Você pode solicitar exclusão dos dados até a divulgação final, conforme a LGPD (Lei 13.709/2018).</li>
              </ul>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">7. Voluntariedade e direito de retirada</div>
              <p>Sua participação é inteiramente voluntária. Você pode recusar ou deixar o estudo a qualquer momento, sem explicar o motivo e sem perder o vale-compra proporcional ao tempo investido.</p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">8. Custos e indenizações</div>
              <p>Não há custos para você. Caso ocorra algum dano inesperado, o pesquisador oferecerá suporte e encaminhamento adequados.</p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">9. Esclarecimentos e contatos</div>
              <p>Pesquisador responsável: <strong>Prof. Vander Muniz</strong> – <a href="mailto:vanderem@uol.com.br">vanderem@uol.com.br</a></p>
          </div>

          <div class="consent-section">
              <div class="consent-section-title">10. Declaração de consentimento</div>
              <p>Li e compreendi todas as informações acima. Declaro que:</p>
              <ul>
                  <li>Sou maior de 18 anos.</li>
                  <li>Possuo equipamento com webcam e concordo em usá-la nos termos explicados.</li>
                  <li>Autorizo o armazenamento dos meus dados pelos próximos 5 anos, exclusivos para esta pesquisa e eventuais reanálises anonimizadas.</li>
              </ul>
              
          <label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;">
            <input id="consent-check" type="checkbox"/>
            <span>Declaro que li e entendi as informações e concordo em participar voluntariamente deste estudo.</span>
          </label>
              
          </div>
        </div>
        `,
        choices: ["Concordo", "Não Concordo"],
        data: { task: "consent" },
        on_load: function () {
            // pega o grupo de botões e os <button> reais
            const btnGroup = document.getElementById('jspsych-html-button-response-btngroup');
            const buttons = btnGroup ? btnGroup.querySelectorAll('button') : document.querySelectorAll('button.jspsych-btn');

            // pela ordem de choices, [0] é "Concordo"
            const agreeBtn = buttons && buttons[0];
            const checkBox = document.getElementById('consent-check');

            function setAgreeEnabled(enabled) {
                if (!agreeBtn) return;
                agreeBtn.disabled = !enabled;
                // reforça visualmente e bloqueia cliques por segurança
                if (!enabled) {
                    agreeBtn.setAttribute('aria-disabled', 'true');
                    agreeBtn.style.opacity = '0.6';
                    agreeBtn.style.pointerEvents = 'none';
                } else {
                    agreeBtn.removeAttribute('aria-disabled');
                    agreeBtn.style.opacity = '';
                    agreeBtn.style.pointerEvents = '';
                }
            }

            setAgreeEnabled(false); // começa desabilitado
            if (checkBox) {
                checkBox.addEventListener('change', () => setAgreeEnabled(checkBox.checked));
            }
        },
        on_finish: function (data) {  // manter síncrono!
            const agreed = data.response === 0;

            const consentHTMLContainer = document.querySelector(".consent-form");
            const consentHTML = consentHTMLContainer ? consentHTMLContainer.innerHTML : "";

            const consent_hash = hashFnv1a32(consentHTML);
            const consent_version = "v1-08-10-2025";           // atualize quando mudar o texto

            // Anexa os metadados AO PRÓPRIO TRIAL DE CONSENTIMENTO
            const fields = {
                consent_agreed: agreed,
                consent_timestamp: nowISO(),
                consent_version: consent_version,
                consent_hash: consent_hash,
                user_agent: navigator.userAgent,
                language: navigator.language || null,
                screen_w: window.screen?.width || null,
                screen_h: window.screen?.height || null
            };
            jsPsych.data.getLastTrialData().addToAll(fields);

            if (!agreed) {
                jsPsych.endExperiment(
                    "Obrigado pelo seu interesse. O experimento foi encerrado porque você não concordou com o termo de consentimento."
                );
                return;
            }

            // Propriedades globais
            jsPsych.data.addProperties({
                consent_agreed: true,
                consent_version: consent_version,
                consent_hash: consent_hash
            });
        }
    };
    timeline.push(consent);
}

/**
 * Adiciona as instruções gerais à timeline
 */
function addGeneralInstructions() {
    const instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Instruções Gerais</h2>
                
                <p>Este experimento está dividido em várias etapas:</p>
                
                <ol>
                    <li><strong>Leitura Automonitorada:</strong> Você lerá textos apresentados em segmentos (frases), avançando no seu próprio ritmo.</li>
                    <li><strong>Rastreamento Ocular:</strong> Você lerá textos completos enquanto seus movimentos oculares são registrados pela webcam.</li>
                    <li><strong>Teste de Associação:</strong> Você classificará palavras e trechos de texto em categorias.</li>
                    <li><strong>Avaliações:</strong> Você avaliará a naturalidade, clareza e compreensão dos textos.</li>
                    <li><strong>Identificação de Autoria:</strong> Você indicará se acredita que cada texto foi escrito por um humano ou por IA.</li>
                </ol>
                
                <p>Antes de começar, faremos uma calibração do sistema de rastreamento ocular usando sua webcam.</p>
                
                <p>Clique em "Continuar" quando estiver pronto para começar.</p>
            </div>
        `,
        choices: ["Continuar"],
        data: {
            task: "general_instructions"
        }
    };
    timeline.push(instructions);
}

/**
 * Adiciona a fase de leitura automonitorada à timeline
 */
function addSelfPacedReadingPhase() {
    // Seleciona metade dos textos para a leitura automonitorada
    const selfPacedTexts = participantTexts.slice(0, 4);

    // Implementa a leitura automonitorada
    const selfPacedTrials = implementSelfPacedReading(selfPacedTexts);
    timeline.push(...selfPacedTrials);
}

/**
 * Adiciona a fase de eye tracking à timeline
 */
async function addEyeTrackingPhase() {
    // Seleciona os textos para o eye tracking
    const eyeTrackingTexts = participantTexts.slice(0, 4);

    // Implementa o eye tracking
    const eyeTrackingTrials = await implementEyeTracking(eyeTrackingTexts);
    timeline.push(...eyeTrackingTrials);
}

/**
 * Adiciona a fase do IAT à timeline
 */
async function addIATPhase() {
    // Carrega estímulos do arquivo externo e gera trials
    const stimuli = participantTexts.slice(0, 4);

    // Cria timeline do IAT a partir dos estímulos carregados
    const iatTimeline = await buildIATTrials(stimuli);
    // Insere todos os trials do IAT na timeline principal
    timeline.push(...iatTimeline);
}

/**
 * Adiciona a fase de avaliações subjetivas e identificação de autoria à timeline
 */
function addEvaluationPhase() {
    // Implementa as avaliações
    const evaluationTrials = implementEvaluations(participantTexts.slice(0, 4));
    timeline.push(...evaluationTrials);
}

/**
 * Adiciona o questionário final e agradecimento à timeline
 */
function addFinalQuestionnaire() {
    // Implementa o questionário final
    const questionnaireTrials = createFinalQuestionnaire();
    timeline.push(...questionnaireTrials);
}

