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
        participantTexts = selectRandomTexts(allTexts, 4); // 4 textos por participante
        
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
    addEyeTrackingPhase();

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

    // Consentimento informado
    const consent = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="consent-form">
                <div class="consent-title">TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO</div>
                
                <div class="consent-section">
                    <div class="consent-section-title">Objetivo do Estudo:</div>
                    <p>Este estudo investiga como as pessoas processam e avaliam diferentes tipos de textos.</p>
                </div>
                
                <div class="consent-section">
                    <div class="consent-section-title">Procedimentos:</div>
                    <p>Você lerá textos curtos, responderá a perguntas sobre eles e participará de tarefas de associação. Também será realizado rastreamento ocular através da sua webcam.</p>
                </div>
                
                <div class="consent-section">
                    <div class="consent-section-title">Riscos e Benefícios:</div>
                    <p>Não há riscos conhecidos associados a este estudo. Sua participação contribuirá para o avanço do conhecimento científico sobre processamento de linguagem.</p>
                </div>
                
                <div class="consent-section">
                    <div class="consent-section-title">Confidencialidade:</div>
                    <p>Seus dados serão tratados de forma anônima e confidencial, sendo utilizados apenas para fins de pesquisa.</p>
                </div>
                
                <div class="consent-section">
                    <div class="consent-section-title">Participação Voluntária:</div>
                    <p>Sua participação é voluntária e você pode desistir a qualquer momento sem penalização.</p>
                </div>
                
                <div class="consent-section">
                    <p>Ao clicar em "Concordo", você confirma que leu e entendeu as informações acima e concorda em participar voluntariamente deste estudo.</p>
                </div>
            </div>
        `,
        choices: ["Concordo", "Não Concordo"],
        data: {
            task: "consent"
        },
        on_finish: function(data) {
            // Se o participante não concordar, encerra o experimento
            if (data.response === 1) {
                jsPsych.endExperiment("Obrigado pelo seu interesse. O experimento foi encerrado porque você não concordou com o termo de consentimento.");
            }
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
function addEyeTrackingPhase() {
    // Seleciona a outra metade dos textos para o eye tracking
    const eyeTrackingTexts = participantTexts.slice(0, 4);

    // Implementa o eye tracking
    const eyeTrackingTrials = implementEyeTracking(eyeTrackingTexts);
    timeline.push(...eyeTrackingTrials);
}

/**
 * Adiciona a fase do IAT à timeline
 */
async function addIATPhase() {
    // Carrega estímulos do arquivo externo e gera trials
    const response = await fetch('texts/example_texts.json');
    const stimuli = await response.json();

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
