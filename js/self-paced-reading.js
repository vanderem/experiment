/**
 * Módulo para implementação da leitura automonitorada (self-paced reading)
 * 
 * Este módulo contém funções específicas para a implementação da leitura
 * automonitorada, incluindo segmentação de texto e criação de trials.
 */

/**
 * Cria um bloco de leitura automonitorada para um texto específico
 * @param {Object} text - O texto a ser apresentado
 * @returns {Array} - Array de trials jsPsych para a leitura automonitorada
 */
function createSelfPacedReadingBlock(text) {
    const trials = [];
    
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
            },
            on_finish: function(data) {
                // Registra o tempo de leitura para este segmento
                data.reading_time = data.rt;
                
                // Calcula o tempo de leitura por frase
                const wordCount = segment.split(/\s+/).length;
                data.reading_time_per_word = data.rt / wordCount;
            }
        };
        trials.push(segmentTrial);
    });
    
    // Adiciona uma tela de transição após a leitura completa do texto
    const completionScreen = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h3>Texto Concluído</h3>
                <p>Você terminou de ler este texto.</p>
                <p>Clique em "Continuar" para prosseguir.</p>
            </div>
        `,
        choices: ['Continuar'],
        data: {
            task: 'self_paced_reading_completion',
            text_id: text.id
        }
    };
    trials.push(completionScreen);
    
    return trials;
}

/**
 * Implementa a leitura automonitorada para um conjunto de textos
 * @param {Array} texts - Array de textos a serem apresentados
 * @returns {Array} - Array de trials jsPsych para a leitura automonitorada
 */
function implementSelfPacedReading(texts) {
    const allTrials = [];

    // Instruções gerais só antes do primeiro texto
    const generalInstructions = {
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
        choices: ['Começar'],
        data: {
            task: 'self_paced_reading_general_instructions'
        }
    };
    allTrials.push(generalInstructions);

    // Adiciona os blocos de leitura para apenas quatro textos
    texts.slice(0, 4).forEach((text, index) => {
        // Antes de cada texto, mostra "Primeiro Texto" ou "Segundo Texto"
        const textLabel = index === 0 ? "Primeiro Texto" : "Próximo Texto";
        const textIntro = {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h3>${textLabel}</h3>
                    <p>Clique em "Começar" quando estiver pronto.</p>
                </div>
            `,
            choices: ['Começar'],
            data: {
                task: 'self_paced_reading_text_intro',
                text_id: text.id
            }
        };
        allTrials.push(textIntro);

        const textTrials = createSelfPacedReadingBlock(text);
        allTrials.push(...textTrials);
    });

    // Tela de conclusão da etapa de leitura automonitorada
    const completionScreen = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Etapa Concluída</h2>
                <p>Você concluiu a etapa de leitura automonitorada.</p>
                <p>Agora, passaremos para a próxima etapa do experimento.</p>
                <p>Clique em "Continuar" para prosseguir.</p>
            </div>
        `,
        choices: ['Continuar'],
        data: {
            task: 'self_paced_reading_phase_completion'
        }
    };
    allTrials.push(completionScreen);

    return allTrials;
}

