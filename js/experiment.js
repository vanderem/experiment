/**
 * Experimento principal em jsPsych
 * 
 * Este arquivo contém a estrutura principal do experimento, incluindo:
 * - Inicialização do jsPsych
 * - Configuração da timeline
 * - Implementação das diferentes etapas do experimento
 */

// Variáveis globais
let jsPsych;
let timeline = [];
let allTexts = [];
let participantTexts = [];
let iatData;

// Inicializa o experimento quando a página carregar
document.addEventListener('DOMContentLoaded', async function() {
    // Inicializa o jsPsych
    jsPsych = initJsPsych({
        on_finish: function() {
            // Salva os dados ao finalizar o experimento
            jsPsych.data.displayData();
            // Aqui poderia ter código para enviar os dados para um servidor
        },
        extensions: [
            {type: jsPsychExtensionWebgazer}
        ]
    });
    
    // Carrega os textos do corpus
    allTexts = await loadTexts();
    
    // Seleciona um subconjunto de textos para este participante
    participantTexts = selectRandomTexts(allTexts, 4); // 10 textos por participante
    
    // Cria os estímulos para o IAT
    iatData = createIatStimuli(allTexts);
    
    // Constrói a timeline do experimento
    buildTimeline();
    
    // Inicia o experimento
    jsPsych.run(timeline);
});

/**
 * Constrói a timeline completa do experimento
 */
function buildTimeline() {
    // 1. Boas-vindas e consentimento informado
    addWelcomeAndConsent();
    
    // 2. Instruções gerais
    addGeneralInstructions();
    
    // 3. Inicialização e calibração do eye tracking
    addEyeTrackingSetup();
    
    // 4. Bloco de leitura automonitorada
    addSelfPacedReadingBlock();
    
    // 5. Bloco de eye tracking
    addEyeTrackingBlock();
    
    // 6. Teste de Associação Implícita (IAT)
    addIATBlock();
    
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
            <p>Este experimento tem duração aproximada de 30 minutos.</p>
            <p>Clique em "Continuar" para prosseguir.</p>
        `,
        choices: ['Continuar']
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
        choices: ['Concordo', 'Não Concordo'],
        on_finish: function(data) {
            // Se o participante não concordar, encerra o experimento
            if (data.response == 1) {
                jsPsych.endExperiment('Obrigado pelo seu interesse. O experimento foi encerrado porque você não concordou com o termo de consentimento.');
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
                    <li><strong>Avaliações:</strong> Após cada texto, você responderá a perguntas sobre naturalidade, clareza e compreensão.</li>
                    <li><strong>Teste de Associação:</strong> Você classificará palavras e trechos de texto em categorias.</li>
                    <li><strong>Identificação de Autoria:</strong> Você indicará se acredita que cada texto foi escrito por um humano ou por IA.</li>
                </ol>
                
                <p>Antes de começar, faremos uma calibração do sistema de rastreamento ocular usando sua webcam.</p>
                
                <p>Clique em "Continuar" quando estiver pronto para começar.</p>
            </div>
        `,
        choices: ['Continuar']
    };
    timeline.push(instructions);
}

/**
 * Adiciona a configuração e calibração do eye tracking à timeline
 */
function addEyeTrackingSetup() {
    // Inicialização da câmera
    const initCamera = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Configuração do Rastreamento Ocular</h2>
                <p>Este experimento utiliza sua webcam para rastrear seus movimentos oculares durante a leitura.</p>
                <p>Na próxima tela, você será solicitado a permitir o acesso à sua câmera.</p>
                <p>Por favor, certifique-se de estar em um ambiente bem iluminado e posicione seu rosto de forma que esteja claramente visível na câmera.</p>
                <p>Clique em "Iniciar Câmera" para continuar.</p>
            </div>
        `,
        choices: ['Iniciar Câmera'],
        on_finish: function() {
            // Inicia a extensão WebGazer
            jsPsych.extensions.webgazer.start();
        }
    };
    timeline.push(initCamera);
    
    // Instruções de calibração
    const calibrationInstructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Calibração do Rastreamento Ocular</h2>
                <p>Agora vamos calibrar o sistema de rastreamento ocular.</p>
                <p>Na próxima tela, você verá uma série de pontos aparecendo em diferentes posições da tela.</p>
                <p>Por favor, olhe diretamente para cada ponto e clique nele quando estiver focado nele.</p>
                <p>É importante que você mantenha a cabeça relativamente estável durante todo o experimento.</p>
                <p>Clique em "Iniciar Calibração" quando estiver pronto.</p>
            </div>
        `,
        choices: ['Iniciar Calibração']
    };
    timeline.push(calibrationInstructions);
    
    // Aqui seria adicionada a calibração real do WebGazer
    // Como exemplo, estamos usando um placeholder simples
    // Em um experimento real, você usaria os plugins específicos do WebGazer
    const calibrationPlaceholder = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Calibração</h2>
                <p>Neste ponto, seria realizada a calibração real do rastreamento ocular.</p>
                <p>Para este protótipo, vamos prosseguir sem a calibração completa.</p>
                <p>Em um experimento real, você usaria os plugins webgazer-calibrate e webgazer-validate.</p>
            </div>
        `,
        choices: ['Continuar']
    };
    timeline.push(calibrationPlaceholder);
}

/**
 * Adiciona o bloco de leitura automonitorada à timeline
 */
function addSelfPacedReadingBlock() {
    // Instruções para a leitura automonitorada
    const selfPacedInstructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Leitura Automonitorada</h2>
                <p>Nesta parte do experimento, você lerá textos apresentados em segmentos (frases).</p>
                <p>Cada segmento será apresentado um por vez.</p>
                <p>Para avançar para o próximo segmento, pressione a <strong>barra de espaço</strong>.</p>
                <p>Leia no seu ritmo natural, mas tente não fazer pausas desnecessárias entre os segmentos.</p>
                <p>Após cada texto, você responderá a algumas perguntas sobre ele.</p>
                <p>Clique em "Começar" quando estiver pronto.</p>
            </div>
        `,
        choices: ['Começar']
    };
    timeline.push(selfPacedInstructions);
    
    // Cria um bloco de leitura automonitorada para cada texto
    participantTexts.forEach((text, textIndex) => {
        // Divide o texto em segmentos (frases)
        const segments = segmentText(text.content);
        
        // Cria um trial para cada segmento do texto
        segments.forEach((segment, segmentIndex) => {
            const segmentTrial = {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: `<div class="reading-segment">${segment}</div>`,
                choices: [' '],
                data: {
                    task: 'self_paced_reading',
                    text_id: text.id,
                    text_authorship: text.authorship,
                    segment_index: segmentIndex,
                    segment_content: segment
                }
            };
            timeline.push(segmentTrial);
        });
        
        // Após cada texto, adiciona as perguntas de avaliação
        addTextEvaluationQuestions(text, textIndex);
    });
}

/**
 * Adiciona o bloco de eye tracking à timeline
 */
function addEyeTrackingBlock() {
    // Instruções para o eye tracking
    const eyeTrackingInstructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Rastreamento Ocular</h2>
                <p>Nesta parte do experimento, você lerá textos completos enquanto seus movimentos oculares são registrados.</p>
                <p>Cada texto será apresentado por um tempo fixo. Por favor, leia o texto naturalmente.</p>
                <p>Tente manter sua cabeça relativamente estável durante a leitura.</p>
                <p>Após o tempo de leitura, você responderá a algumas perguntas sobre o texto.</p>
                <p>Clique em "Começar" quando estiver pronto.</p>
            </div>
        `,
        choices: ['Começar']
    };
    timeline.push(eyeTrackingInstructions);
    
    // Cria um bloco de eye tracking para cada texto
    // Usamos os mesmos textos da leitura automonitorada, mas em ordem diferente
    const shuffledTexts = shuffleArray([...participantTexts]);
    
    shuffledTexts.forEach((text, textIndex) => {
        // Trial de eye tracking para o texto completo
        const eyeTrackingTrial = {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: `<div class="eye-tracking-text">${text.content}</div>`,
            choices: "NO_KEYS",
            trial_duration: 20000, // 20 segundos para ler o texto
            extensions: [
                {
                    type: jsPsychExtensionWebgazer,
                    params: {
                        targets: ['#jspsych-target'],
                        showPredictions: false
                    }
                }
            ],
            data: {
                task: 'eye_tracking',
                text_id: text.id,
                text_authorship: text.authorship,
                text_content: text.content
            }
        };
        timeline.push(eyeTrackingTrial);
        
        // Após cada texto, adiciona as perguntas de avaliação
        addTextEvaluationQuestions(text, textIndex + participantTexts.length);
    });
}

/**
 * Adiciona o bloco do IAT à timeline
 */
function addIATBlock() {
    // Obtém os blocos do IAT
    const iatBlocks = createIatBlocks(iatData);
    
    // Instruções de boas-vindas para o IAT
    const iatWelcome = {
        type: jsPsychHtmlButtonResponse,
        stimulus: iatBlocks.instructions.welcome,
        choices: ['Continuar']
    };
    timeline.push(iatWelcome);
    
    // Bloco 1: Categorização de conceitos (IA vs. Humano)
    const iatBlock1Instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: iatBlocks.instructions.block1,
        choices: ['Continuar']
    };
    timeline.push(iatBlock1Instructions);
    
    // Aqui seria implementado o bloco 1 do IAT
    // Como exemplo, estamos usando um placeholder simples
    const iatBlock1Placeholder = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Bloco 1 do IAT</h3>
                <p>Neste ponto, seria implementado o Bloco 1 do IAT usando o plugin jspsych-iat-html.</p>
                <p>Para este protótipo, vamos prosseguir sem a implementação completa.</p>
            </div>
        `,
        choices: ['Continuar']
    };
    timeline.push(iatBlock1Placeholder);
    
    // Bloco 2: Categorização de atributos (Positivo vs. Negativo)
    const iatBlock2Instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: iatBlocks.instructions.block2,
        choices: ['Continuar']
    };
    timeline.push(iatBlock2Instructions);
    
    // Placeholder para o Bloco 2
    const iatBlock2Placeholder = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Bloco 2 do IAT</h3>
                <p>Neste ponto, seria implementado o Bloco 2 do IAT.</p>
                <p>Para este protótipo, vamos prosseguir sem a implementação completa.</p>
            </div>
        `,
        choices: ['Continuar']
    };
    timeline.push(iatBlock2Placeholder);
    
    // Bloco 3: Categorização combinada (IA/Positivo vs. Humano/Negativo)
    const iatBlock3Instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: iatBlocks.instructions.block3,
        choices: ['Continuar']
    };
    timeline.push(iatBlock3Instructions);
    
    // Placeholder para o Bloco 3
    const iatBlock3Placeholder = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Bloco 3 do IAT</h3>
                <p>Neste ponto, seria implementado o Bloco 3 do IAT.</p>
                <p>Para este protótipo, vamos prosseguir sem a implementação completa.</p>
            </div>
        `,
        choices: ['Continuar']
    };
    timeline.push(iatBlock3Placeholder);
    
    // Bloco 4: Categorização de conceitos invertida (Humano vs. IA)
    const iatBlock4Instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: iatBlocks.instructions.block4,
        choices: ['Continuar']
    };
    timeline.push(iatBlock4Instructions);
    
    // Placeholder para o Bloco 4
    const iatBlock4Placeholder = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Bloco 4 do IAT</h3>
                <p>Neste ponto, seria implementado o Bloco 4 do IAT.</p>
                <p>Para este protótipo, vamos prosseguir sem a implementação completa.</p>
            </div>
        `,
        choices: ['Continuar']
    };
    timeline.push(iatBlock4Placeholder);
    
    // Bloco 5: Categorização combinada invertida (Humano/Positivo vs. IA/Negativo)
    const iatBlock5Instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: iatBlocks.instructions.block5,
        choices: ['Continuar']
    };
    timeline.push(iatBlock5Instructions);
    
    // Placeholder para o Bloco 5
    const iatBlock5Placeholder = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Bloco 5 do IAT</h3>
                <p>Neste ponto, seria implementado o Bloco 5 do IAT.</p>
                <p>Para este protótipo, vamos prosseguir sem a implementação completa.</p>
            </div>
        `,
        choices: ['Continuar']
    };
    timeline.push(iatBlock5Placeholder);
}

/**
 * Adiciona as perguntas de avaliação após cada texto
 * @param {Object} text - O texto que foi lido
 * @param {number} textIndex - O índice do texto na sequência
 */
function addTextEvaluationQuestions(text, textIndex) {
    // Perguntas de avaliação subjetiva (escalas Likert)
    const likertQuestions = {
        type: jsPsychSurveyLikert,
        preamble: `<div class="instructions"><h3>Avaliação do Texto</h3><p>Por favor, avalie o texto que você acabou de ler:</p></div>`,
        questions: [
            {
                prompt: "Quão natural você achou este texto?",
                name: "naturalidade",
                labels: ["1<br>Nada natural", "2", "3", "4", "5", "6", "7<br>Muito natural"]
            },
            {
                prompt: "Quão claro você achou este texto?",
                name: "clareza",
                labels: ["1<br>Nada claro", "2", "3", "4", "5", "6", "7<br>Muito claro"]
            },
            {
                prompt: "Quão fácil foi compreender este texto?",
                name: "compreensao",
                labels: ["1<br>Muito difícil", "2", "3", "4", "5", "6", "7<br>Muito fácil"]
            }
        ],
        data: {
            task: 'text_evaluation',
            text_id: text.id,
            text_authorship: text.authorship
        }
    };
    timeline.push(likertQuestions);
    
    // Pergunta de compreensão simples
    // Esta pergunta seria personalizada para cada texto em um experimento real
    const comprehensionQuestion = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Pergunta de Compreensão</h3>
                <p>O texto que você acabou de ler era sobre:</p>
            </div>
        `,
        choices: ['Tecnologia', 'Meio Ambiente', 'Cultura', 'Política', 'Outro'],
        data: {
            task: 'comprehension_question',
            text_id: text.id,
            text_authorship: text.authorship
        }
    };
    timeline.push(comprehensionQuestion);
    
    // Identificação de autoria
    const authorshipIdentification = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Identificação de Autoria</h3>
                <p>Você acredita que este texto foi escrito por:</p>
            </div>
        `,
        choices: ['Um ser humano', 'Uma inteligência artificial (IA)'],
        data: {
            task: 'authorship_identification',
            text_id: text.id,
            text_authorship: text.authorship,
            correct_authorship: text.authorship === 'human' ? 0 : 1
        }
    };
    timeline.push(authorshipIdentification);
    
    // Grau de confiança na identificação de autoria
    const confidenceRating = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Grau de Confiança</h3>
                <p>Qual é o seu grau de confiança nesta identificação?</p>
            </div>
        `,
        choices: ['1 (Nada confiante)', '2', '3', '4', '5', '6', '7 (Muito confiante)'],
        data: {
            task: 'confidence_rating',
            text_id: text.id,
            text_authorship: text.authorship
        }
    };
    timeline.push(confidenceRating);
    
    // Justificativa para a identificação de autoria
    const authorshipJustification = {
        type: jsPsychSurveyText,
        questions: [
            {
                prompt: "Por favor, justifique brevemente por que você acredita que este texto foi escrito por um ser humano ou por IA:",
                name: 'justificativa',
                required: true
            }
        ],
        data: {
            task: 'authorship_justification',
            text_id: text.id,
            text_authorship: text.authorship
        }
    };
    timeline.push(authorshipJustification);
}

/**
 * Adiciona o questionário final e agradecimento à timeline
 */
function addFinalQuestionnaire() {
    // Questionário demográfico e de familiaridade com IA
    const finalQuestionnaire = {
        type: jsPsychSurveyText,
        preamble: `
            <div class="instructions">
                <h2>Questionário Final</h2>
                <p>Por favor, responda às seguintes perguntas:</p>
            </div>
        `,
        questions: [
            {
                prompt: "Qual é a sua idade?",
                name: 'idade',
                required: true
            },
            {
                prompt: "Qual é o seu gênero?",
                name: 'genero',
                required: true
            },
            {
                prompt: "Qual é o seu nível de escolaridade?",
                name: 'escolaridade',
                required: true
            },
            {
                prompt: "Qual é o seu nível de familiaridade com inteligência artificial (IA) em uma escala de 1 a 7, onde 1 é 'Nada familiarizado' e 7 é 'Muito familiarizado'?",
                name: 'familiaridade_ia',
                required: true
            },
            {
                prompt: "Com que frequência você interage com sistemas de IA (como chatbots, assistentes virtuais, etc.)?",
                name: 'frequencia_ia',
                required: true
            }
        ],
        data: {
            task: 'final_questionnaire'
        }
    };
    timeline.push(finalQuestionnaire);
    
    // Tela de agradecimento
    const thankYou = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Experimento Concluído</h2>
                <p>Muito obrigado pela sua participação!</p>
                <p>Sua contribuição é muito valiosa para nossa pesquisa sobre processamento de textos.</p>
                <p>Você pode fechar esta janela agora.</p>
            </div>
        `,
        choices: ['Finalizar'],
        on_finish: function() {
            // Finaliza o eye tracking
            jsPsych.extensions.webgazer.stop();
        }
    };
    timeline.push(thankYou);
}

