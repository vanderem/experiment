/**
 * Módulo para implementação do eye tracking com WebGazer
 * 
 * Este módulo contém funções específicas para a implementação do rastreamento ocular,
 * incluindo inicialização, calibração, validação e apresentação de textos.
 */

/**
 * Inicializa e configura o WebGazer para rastreamento ocular
 * @returns {Array} - Array de trials jsPsych para inicialização do WebGazer
 */
function initializeEyeTracking() {
    const trials = [];

    // Instruções para inicialização do rastreamento ocular
    const cameraInstructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Configuração do Rastreamento Ocular</h2>
                <p>Este experimento utiliza sua webcam para rastrear seus movimentos oculares durante a leitura.</p>
                <p>Na próxima tela, você será solicitado a permitir o acesso à sua câmera.</p>
                <p>Clique em "Continuar" para iniciar a verificação da câmera.</p>
            </div>
        `,
        choices: ["Continuar"],
        data: {
            task: "eye_tracking_camera_instructions"
        }
    };
    trials.push(cameraInstructions);

    // Inicialização do rastreamento ocular com o plugin oficial
    const initCamera = {
        type: jsPsychWebgazerInitCamera,
        instructions: `
            <p>Por favor, posicione seu rosto de forma que a câmera tenha uma visão clara.</p>
            <p>Quando o navegador solicitar, clique em "Permitir" para conceder acesso à câmera.</p>
        `,
        data: {
            task: "eye_tracking_init_camera"
        }
    };
    trials.push(initCamera);

    return trials;
}

/**
 * Cria os trials para calibração do WebGazer
 * @returns {Array} - Array de trials jsPsych para calibração do WebGazer
 */
function calibrateEyeTracking() {
    const trials = [];

    // Instruções para calibração
    const calibrationInstructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Calibração do Rastreamento Ocular</h2>
                <p>Agora vamos calibrar o sistema de rastreamento ocular.</p>
                <p>Na próxima tela, você verá uma série de pontos aparecendo em diferentes posições da tela.</p>
                <p>Por favor, olhe diretamente para cada ponto e clique nele quando estiver focado nele.</p>
                <p>Na sequência, apenas olhe para o ponto quando estiver focado nele, não precisa mais clicar.</p>
                <p>É importante que você mantenha a cabeça relativamente estável durante todo o experimento.</p>
                <p>Clique em "Iniciar Calibração" quando estiver pronto.</p>
            </div>
        `,
        choices: ["Iniciar Calibração"],
        data: {
            task: "eye_tracking_calibration_instructions"
        }
    };
    trials.push(calibrationInstructions);

    // Calibração do WebGazer
    const calibration = {
        type: jsPsychWebgazerCalibrate,
        calibration_points: [
            [10, 10], [50, 10], [90, 10],
            [10, 50], [50, 50], [90, 50],
            [10, 90], [50, 90], [90, 90]
        ],
        point_duration: 1000,
        repetitions_per_point: 2,
        randomize_calibration_order: true,
        data: {
            task: "eye_tracking_calibration"
        }
    };
    trials.push(calibration);

    // Validação do WebGazer
    const validation = {
        type: jsPsychWebgazerValidate,
        validation_points: [
            [10, 10], [50, 10], [90, 10],
            [10, 50], [50, 50], [90, 50],
            [10, 90], [50, 90], [90, 90]
        ],
       /* [10, 10], [30, 10], [50, 10], [70, 10], [90, 10],
        [10, 30], [30, 30], [50, 30], [70, 30], [90, 30],
        [10, 50], [30, 50], [50, 50], [70, 50], [90, 50],
        [10, 70], [30, 70], [50, 70], [70, 70], [90, 70],
        [10, 90], [30, 90], [50, 90], [70, 90], [90, 90]*/
        show_validation_data: true,
        roi_radius: 200,
        time_to_saccade: 1000,
        validation_duration: 2000,
        data: {
            task: "eye_tracking_validation"
        },
        on_finish: function(data){
            // 'validation_mean_error' pode variar dependendo da versão do plugin
            // Ajuste o nome se necessário, verifique nos dados salvos!
            const erroMedio = data.validation_mean_error;
            if (erroMedio > 50) { // o valor ideal
                alert("A calibração não ficou precisa o suficiente. Vamos repetir a calibração!");
                // jsPsych.endCurrentTimeline(); // OU: Você pode reinserir a timeline de calibração aqui
            }
        }
    };
    trials.push(validation);

    return trials;
}

/**
 * Cria um bloco de eye tracking para um texto específico
 * @param {Object} text - O texto a ser apresentado
 * @returns {Array} - Array de trials jsPsych para o eye tracking
 */
function createEyeTrackingBlock(text) {
    const trials = [];

    // Tela de fixação central antes do texto
    const fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<div style="font-size: 40px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">+</div>`,
        choices: "NO_KEYS",
        trial_duration: 1000,
        data: {
            task: "eye_tracking_fixation",
            text_id: text.id
        }
    };
    trials.push(fixation);

    // Trial de eye tracking para o texto completo
    const eyeTrackingTrial = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="eye-tracking-text" id="eye-tracking-text-${text.id}">
                ${text.content}
            </div>
        `,
        choices: ["Concluído"],
        extensions: [
            {
                type: jsPsychExtensionWebgazer,
                params: {
                    targets: [`#eye-tracking-text-${text.id}`],
                    showPredictions: false,
                    saveGaze: true // Garante que os dados de gaze são salvos
                }
            }
        ],
        data: {
            task: "eye_tracking",
            text_id: text.id,
            text_authorship: text.authorship,
            text_content: text.content
        },
        on_finish: function(data) {
            // Processa os dados de eye tracking
            const eyeGazeData = data.webgazer_data;

            if (eyeGazeData && eyeGazeData.length > 0) {
                // Calcula métricas básicas de eye tracking

                // Número total de amostras
                data.total_samples = eyeGazeData.length;

                // Tempo total de leitura
                data.total_reading_time = data.rt;

                // Número de palavras no texto
                const wordCount = text.content.split(/\s+/).length;

                // Tempo médio por palavra
                data.reading_time_per_word = data.rt / wordCount;

                // Número de regressões: conta quantas vezes o olhar volta (x diminui em relação ao anterior)
                let regressions = 0;
                for (let i = 1; i < eyeGazeData.length; i++) {
                    if (eyeGazeData[i].x < eyeGazeData[i - 1].x) {
                        regressions++;
                    }
                }
                data.number_of_regressions = regressions;

                // Tempo de fixação por região (simplificado: divide a tela em regiões horizontais de 25%)
                const regionWidth = window.innerWidth / 4;
                const regionTimes = [0, 0, 0, 0];
                for (let i = 1; i < eyeGazeData.length; i++) {
                    const regionIndex = Math.min(Math.floor(eyeGazeData[i].x / regionWidth), 3);
                    const deltaT = eyeGazeData[i].t - eyeGazeData[i - 1].t;
                    regionTimes[regionIndex] += deltaT;
                }
                data.fixation_time_by_region = regionTimes;

                // ------------------------------------
                // Cálculo de quantidade de fixações
                // ------------------------------------
                const MIN_FIXATION_DURATION = 100; // ms
                const MAX_FIXATION_RADIUS = 35; // px

                function euclideanDistance(a, b) {
                    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
                }

                let fixations = [];
                let currentFixation = [];

                for (let i = 0; i < eyeGazeData.length; i++) {
                    if (currentFixation.length === 0) {
                        currentFixation.push(eyeGazeData[i]);
                    } else {
                        let lastPoint = currentFixation[0];
                        if (euclideanDistance(lastPoint, eyeGazeData[i]) < MAX_FIXATION_RADIUS) {
                            currentFixation.push(eyeGazeData[i]);
                        } else {
                            let duration = currentFixation[currentFixation.length - 1].t - currentFixation[0].t;
                            if (duration >= MIN_FIXATION_DURATION) {
                                fixations.push({
                                    x: lastPoint.x,
                                    y: lastPoint.y,
                                    start: currentFixation[0].t,
                                    end: currentFixation[currentFixation.length - 1].t,
                                    duration: duration
                                });
                            }
                            currentFixation = [eyeGazeData[i]];
                        }
                    }
                }
                // Checa a última fixação
                if (currentFixation.length > 0) {
                    let duration = currentFixation[currentFixation.length - 1].t - currentFixation[0].t;
                    if (duration >= MIN_FIXATION_DURATION) {
                        fixations.push({
                            x: currentFixation[0].x,
                            y: currentFixation[0].y,
                            start: currentFixation[0].t,
                            end: currentFixation[currentFixation.length - 1].t,
                            duration: duration
                        });
                    }
                }
                data.number_of_fixations = fixations.length;

            }
        }
    };
    trials.push(eyeTrackingTrial);

    return trials;
}

/**
 * Implementa o eye tracking para um conjunto de textos
 * @param {Array} texts - Array de textos a serem apresentados
 * @returns {Array} - Array de trials jsPsych para o eye tracking
 */
function implementEyeTracking(texts) {
    const allTrials = [];

    // Inicialização e calibração do WebGazer
    const initTrials = initializeEyeTracking();
    allTrials.push(...initTrials);

    const calibrationTrials = calibrateEyeTracking();
    allTrials.push(...calibrationTrials);

    // Instruções gerais para a primeira vez apenas
    const generalInstructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Rastreamento Ocular</h2>
                <p>Nesta parte do experimento, você lerá textos completos enquanto seus movimentos oculares são registrados.</p>
                <p>Por favor, leia cada texto naturalmente, como você normalmente faria.</p>
                <p>Tente manter sua cabeça relativamente estável durante a leitura.</p>
                <p>Clique em "Começar" quando estiver pronto.</p>
            </div>
        `,
        choices: ["Começar"],
        data: {
            task: "eye_tracking_general_instructions"
        }
    };
    allTrials.push(generalInstructions);

    // Usa apenas os mesmos quatro textos (como no self-paced reading)
    texts.slice(0, 4).forEach((text, index) => {
        // Mensagem curta para cada texto, após o primeiro
        if (index > 0) {
            const shortIntro = {
                type: jsPsychHtmlButtonResponse,
                stimulus: `
                    <div class="instructions">
                        <h3>Próximo Texto</h3>
                        <p>Clique em "Começar" para continuar.</p>
                    </div>
                `,
                choices: ["Começar"],
                data: {
                    task: "eye_tracking_text_intro",
                    text_id: text.id
                }
            };
            allTrials.push(shortIntro);
        }

        const textTrials = createEyeTrackingBlock(text);
        allTrials.push(...textTrials);
    });

    // Tela de conclusão da etapa de eye tracking
    const completionScreen = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Etapa Concluída</h2>
                <p>Você concluiu a etapa de rastreamento ocular.</p>
                <p>Agora, passaremos para a próxima etapa do experimento.</p>
                <p>Clique em "Continuar" para prosseguir.</p>
            </div>
        `,
        choices: ["Continuar"],
        data: {
            task: "eye_tracking_phase_completion"
        },
        on_finish: function() {
            jsPsych.extensions.webgazer.pause();
        }
    };
    allTrials.push(completionScreen);

    return allTrials;
}
