/**
 * Módulo para implementação dos julgamentos subjetivos e identificação de autoria
 * 
 * Este módulo contém funções específicas para a implementação das avaliações
 * subjetivas dos textos e identificação de autoria.
 */

/**
 * Cria um bloco de avaliação para um texto específico
 * @param {Object} text - O texto a ser avaliado
 * @returns {Array} - Array de trials jsPsych para a avaliação do texto
 */
function createEvaluationBlock(text) {
    const trials = [];

    // Perguntas de avaliação subjetiva (escalas Likert)
    const likertQuestions = {
        type: jsPsychSurveyLikert,
        preamble: `
            <div class="instructions">
                <h3>Avaliação do Texto</h3>
                <p>Por favor, avalie o texto que você acabou de ler:</p>
                <div class="text-preview" style="font-style: italic; margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #ccc;">
                    "${text.content.substring(0, 100)}..."
                </div>
            </div>
        `,
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
        },
        on_finish: function(data) {
            // Armazena as respostas em um formato mais acessível
            data.naturalidade = data.response.naturalidade;
            data.clareza = data.response.clareza;
            data.compreensao = data.response.compreensao;
        }
    };
    trials.push(likertQuestions);

    return trials;
}

/**
 * Cria um bloco de identificação de autoria para um texto específico
 * @param {Object} text - O texto a ser avaliado
 * @returns {Array} - Array de trials jsPsych para a identificação de autoria
 */
function createAuthorshipIdentificationBlock(text) {
    const trials = [];

    // Identificação de autoria
    const authorshipIdentification = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Identificação de Autoria</h3>
                <p>Você acredita que este texto foi escrito por:</p>
                <div class="text-preview" style="font-style: italic; margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #ccc;">
                    "${text.content.substring(0, 150)}..."
                </div>
            </div>
        `,
        choices: ['Um ser humano', 'Uma inteligência artificial (IA)'],
        data: {
            task: 'authorship_identification',
            text_id: text.id,
            text_authorship: text.authorship,
            correct_authorship: text.authorship === 'human' ? 0 : 1
        },
        on_finish: function(data) {
            // Verifica se a identificação está correta
            data.authorship_correct = data.response === data.correct_authorship;
        }
    };
    trials.push(authorshipIdentification);

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
    trials.push(confidenceRating);

    return trials;
}

/**
 * Implementa as avaliações subjetivas e identificação de autoria para um conjunto de textos
 * @param {Array} texts - Array de textos a serem avaliados
 * @returns {Array} - Array de trials jsPsych para as avaliações
 */
function implementEvaluations(texts) {
    const allTrials = [];

    // Usa diretamente o array de textos recebido (deve conter apenas os textos usados)
    const selectedTexts = texts;

    // Instruções gerais para as avaliações
    const generalInstructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Avaliações e Identificação de Autoria</h2>
                <p>Nesta parte do experimento, você avaliará cada texto que leu anteriormente.</p>
                <p>Para cada texto, você:</p>
                <ol>
                    <li>Avaliará sua naturalidade, clareza e compreensão em escalas de 1 a 7.</li>
                    <li>Responderá a uma pergunta simples de compreensão.</li>
                    <li>Indicará se acredita que o texto foi escrito por um ser humano ou por IA.</li>
                    <li>Indicará seu grau de confiança nessa identificação.</li>
                </ol>
                <p>Clique em "Começar" quando estiver pronto.</p>
            </div>
        `,
        choices: ['Começar'],
        data: {
            task: 'evaluation_general_instructions'
        }
    };
    allTrials.push(generalInstructions);

    // Adiciona blocos de avaliação para cada texto
    selectedTexts.forEach((text, index) => {
        // Adiciona uma tela de transição antes de cada texto
        const transitionScreen = {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h3>Texto ${index + 1} de ${texts.length}</h3>
                    <p>Agora você avaliará o próximo texto.</p>
                    <p>Clique em "Continuar" para prosseguir.</p>
                </div>
            `,
            choices: ['Continuar'],
            data: {
                task: 'evaluation_transition',
                text_id: text.id
            }
        };
        allTrials.push(transitionScreen);

        // Adiciona o bloco de avaliação para este texto
        const evaluationTrials = createEvaluationBlock(text);
        allTrials.push(...evaluationTrials);

        // Adiciona o bloco de identificação de autoria para este texto
        const authorshipTrials = createAuthorshipIdentificationBlock(text);
        allTrials.push(...authorshipTrials);
    });

    // Tela de conclusão das avaliações
    const completionScreen = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Avaliações Concluídas</h2>
                <p>Você concluiu todas as avaliações de textos.</p>
                <p>Agora, passaremos para a etapa final do experimento.</p>
                <p>Clique em "Continuar" para prosseguir.</p>
            </div>
        `,
        choices: ['Continuar'],
        data: {
            task: 'evaluation_completion'
        }
    };
    allTrials.push(completionScreen);

    return allTrials;
}

/**
 * Cria o questionário final do experimento
 * @returns {Array} - Array de trials jsPsych para o questionário final
 */
function createFinalQuestionnaire() {
    const trials = [];

    // Questionário demográfico e de familiaridade com IA
    // Pergunta de idade - campo livre
    const ageQuestion = {
        type: jsPsychSurveyText,
        preamble: `
        <div class="instructions">
            <h2>Questionário Demográfico</h2>
            <p>Por favor, responda às seguintes perguntas:</p>
        </div>
    `,
        questions: [
            {
                prompt: "Qual é a sua idade?",
                name: 'idade',
                required: true
            }
        ],
        data: {
            task: 'demographic_questionnaire_age'
        }
    };
    trials.push(ageQuestion);

// Perguntas de gênero e escolaridade como combo box (alternativas)
    const genderEducationQuestion = {
        type: jsPsychSurveyMultiChoice,
        questions: [
            {
                prompt: "Qual é o seu gênero?",
                name: 'genero',
                options: [
                    "Masculino",
                    "Feminino",
                    "Prefiro não informar"
                ],
                required: true
            },
            {
                prompt: "Qual é o seu nível de escolaridade?",
                name: 'escolaridade',
                options: [
                    "Ensino Fundamental incompleto",
                    "Ensino Fundamental completo",
                    "Ensino Médio incompleto",
                    "Ensino Médio completo",
                    "Superior incompleto",
                    "Superior completo",
                    "Pós-graduação",
                    "Mestrado",
                    "Doutorado",
                    "Prefiro não informar"
                ],
                required: true
            }
        ],
        data: {
            task: 'demographic_questionnaire_gender_education'
        }
    };
    trials.push(genderEducationQuestion);

    // Questionário de familiaridade com IA
    const aiQuestionnaire = {
        type: jsPsychSurveyLikert,
        preamble: `
            <div class="instructions">
                <h2>Familiaridade com Inteligência Artificial</h2>
                <p>Por favor, responda às seguintes perguntas:</p>
            </div>
        `,
        questions: [
            {
                prompt: "Qual é o seu nível de familiaridade com inteligência artificial (IA)?",
                name: "familiaridade_ia",
                labels: ["1<br>Nada familiarizado", "2", "3", "4", "5", "6", "7<br>Muito familiarizado"]
            },
            {
                prompt: "Com que frequência você interage com sistemas de IA (como chatbots, assistentes virtuais, etc.)?",
                name: "frequencia_ia",
                labels: ["1<br>Nunca", "2", "3", "4", "5", "6", "7<br>Muito frequentemente"]
            },
            {
                prompt: "Quão confiante você se sente em identificar textos gerados por IA?",
                name: "confianca_identificacao",
                labels: ["1<br>Nada confiante", "2", "3", "4", "5", "6", "7<br>Muito confiante"]
            }
        ],
        data: {
            task: 'ai_familiarity_questionnaire'
        }
    };
    trials.push(aiQuestionnaire);

    /*// Questionário de Need for Cognition (versão reduzida)
    const nfcQuestionnaire = {
        type: jsPsychSurveyLikert,
        preamble: `
            <div class="instructions">
                <h2>Perfil Cognitivo</h2>
                <p>Por favor, indique o quanto você concorda ou discorda de cada afirmação:</p>
            </div>
        `,
        questions: [
            {
                prompt: "Eu prefiro problemas complexos a problemas simples.",
                name: "nfc_1",
                labels: ["1<br>Discordo totalmente", "2", "3", "4", "5", "6", "7<br>Concordo totalmente"]
            },
            {
                prompt: "Eu gosto de ter a responsabilidade de lidar com situações que exigem muito pensamento.",
                name: "nfc_2",
                labels: ["1<br>Discordo totalmente", "2", "3", "4", "5", "6", "7<br>Concordo totalmente"]
            },
            {
                prompt: "Pensar não é minha ideia de diversão.",
                name: "nfc_3",
                labels: ["1<br>Discordo totalmente", "2", "3", "4", "5", "6", "7<br>Concordo totalmente"]
            },
            {
                prompt: "Eu prefiro fazer algo que exige pouco pensamento do que algo que certamente desafiará minhas habilidades de pensamento.",
                name: "nfc_4",
                labels: ["1<br>Discordo totalmente", "2", "3", "4", "5", "6", "7<br>Concordo totalmente"]
            },
            {
                prompt: "Eu tento antecipar e evitar situações onde há uma chance provável de eu ter que pensar profundamente sobre algo.",
                name: "nfc_5",
                labels: ["1<br>Discordo totalmente", "2", "3", "4", "5", "6", "7<br>Concordo totalmente"]
            }
        ],
        data: {
            task: 'need_for_cognition_questionnaire'
        },*/
/*
        on_finish: function(data) {
            // Calcula o escore de Need for Cognition
            // Itens 3, 4 e 5 são invertidos
            const nfc1 = data.response.nfc_1;
            const nfc2 = data.response.nfc_2;
            const nfc3 = 8 - data.response.nfc_3; // Invertido
            const nfc4 = 8 - data.response.nfc_4; // Invertido
            const nfc5 = 8 - data.response.nfc_5; // Invertido

            const nfcScore = (nfc1 + nfc2 + nfc3 + nfc4 + nfc5) / 5;

            // Armazena o escore nos dados
            jsPsych.data.addProperties({
                nfc_score: nfcScore
            });
        }
    };
    trials.push(nfcQuestionnaire);
*/

    // Tela de agradecimento
    const thankYou = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Experimento Concluído</h2>
                <p>Muito obrigado pela sua participação!</p>
                <p>Sua contribuição é muito valiosa para nossa pesquisa sobre processamento de textos.</p>
                <p>O objetivo deste estudo é investigar como as pessoas processam e avaliam textos gerados por humanos e por inteligência artificial.</p>
                <p>Os dados coletados serão analisados de forma anônima e utilizados apenas para fins de pesquisa.</p>
                <p>Se você tiver alguma dúvida sobre o estudo, entre em contato com o pesquisador responsável.</p>
                <p>Você pode fechar esta janela agora.</p>
            </div>
        `,
        choices: ['Finalizar'],
        data: {
            task: 'thank_you'
        },
        on_finish: function() {
            // Finaliza o experimento e salva os dados
            jsPsych.data.displayData();

            // aqui adicionar código para
            // enviar os dados para um servidor ou salvá-los localmente
        }
    };
    trials.push(thankYou);

    return trials;
}

