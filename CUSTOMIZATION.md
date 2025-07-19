# Guia de Personalização do Experimento

Este documento fornece instruções detalhadas sobre como personalizar os diferentes componentes do experimento "Sintonia Invisível: Processamento e Julgamento de Textos Algorítmicos" para atender às suas necessidades específicas de pesquisa.

## Índice

1. [Personalização dos Textos](#personalização-dos-textos)
   - [Formato do Arquivo de Textos](#formato-do-arquivo-de-textos)
   - [Adição de Novos Textos](#adição-de-novos-textos)
   - [Segmentação de Textos](#segmentação-de-textos)
   - [Perguntas de Compreensão](#perguntas-de-compreensão)
2. [Personalização da Leitura Automonitorada](#personalização-da-leitura-automonitorada)
   - [Parâmetros de Apresentação](#parâmetros-de-apresentação)
   - [Método de Resposta](#método-de-resposta)
3. [Personalização do Eye Tracking](#personalização-do-eye-tracking)
   - [Calibração](#calibração)
   - [Parâmetros de Rastreamento](#parâmetros-de-rastreamento)
   - [Visualização em Tempo Real](#visualização-em-tempo-real)
4. [Personalização do IAT](#personalização-do-iat)
   - [Categorias e Estímulos](#categorias-e-estímulos)
   - [Estrutura dos Blocos](#estrutura-dos-blocos)
   - [Parâmetros de Tempo](#parâmetros-de-tempo)
5. [Personalização das Avaliações Subjetivas](#personalização-das-avaliações-subjetivas)
   - [Escalas de Avaliação](#escalas-de-avaliação)
   - [Perguntas Adicionais](#perguntas-adicionais)
6. [Personalização da Interface do Usuário](#personalização-da-interface-do-usuário)
   - [Estilos e Aparência](#estilos-e-aparência)
   - [Instruções e Mensagens](#instruções-e-mensagens)
7. [Personalização da Coleta de Dados](#personalização-da-coleta-de-dados)
   - [Formato dos Dados](#formato-dos-dados)
   - [Armazenamento dos Dados](#armazenamento-dos-dados)

## Personalização dos Textos

### Formato do Arquivo de Textos

Os textos do experimento são armazenados em arquivos JSON na pasta `texts/`. Cada arquivo segue a seguinte estrutura:

```json
{
  "texts": [
    {
      "id": "text1",
      "title": "Título do Texto 1",
      "content": "Texto completo para apresentação no eye tracking...",
      "source": "human",
      "segments": [
        "Este é o primeiro segmento do texto.",
        "Este é o segundo segmento.",
        "E assim por diante."
      ],
      "comprehension_question": {
        "question": "Qual é o tema principal deste texto?",
        "options": [
          "Opção A",
          "Opção B",
          "Opção C",
          "Opção D"
        ],
        "correct_answer": 1
      }
    },
    // Mais textos...
  ]
}
```

### Adição de Novos Textos

Para adicionar novos textos ao corpus:

1. Crie um novo arquivo JSON na pasta `texts/` ou edite o arquivo existente.
2. Adicione novos objetos de texto seguindo o formato acima.
3. Certifique-se de que cada texto tenha um `id` único.
4. Atualize a referência ao arquivo no módulo de carregamento de textos, se necessário:

```javascript
// Em js/texts.js
async function loadTexts() {
    try {
        // Altere o caminho para o seu novo arquivo
        const response = await fetch('texts/seu_novo_arquivo.json');
        const data = await response.json();
        return data.texts;
    } catch (error) {
        console.error('Erro ao carregar os textos:', error);
        return [];
    }
}
```

### Segmentação de Textos

A segmentação dos textos para a leitura automonitorada pode ser feita manualmente ou automaticamente:

1. **Segmentação Manual** (recomendada para maior controle):
   - Divida o texto em segmentos significativos (frases ou orações)
   - Adicione cada segmento como um elemento no array `segments`

2. **Segmentação Automática** (para textos longos ou múltiplos):
   - Implemente uma função de segmentação no arquivo `js/texts.js`:

```javascript
// Em js/texts.js
function segmentText(text) {
    // Segmentação por frases (exemplo simples)
    return text.split(/(?<=[.!?])\s+/);
    
    // Ou segmentação mais sofisticada usando expressões regulares
    // return text.split(/(?<=[.!?])\s+|(?<=[:;])\s+/);
}
```

### Perguntas de Compreensão

Para cada texto, você pode adicionar uma pergunta de compreensão que será apresentada após a leitura:

1. Defina a pergunta no objeto `comprehension_question`
2. Forneça opções de resposta no array `options`
3. Indique a resposta correta pelo índice (começando em 0) em `correct_answer`

Se não quiser incluir perguntas de compreensão, você pode omitir o objeto `comprehension_question` ou definir como `null`.

## Personalização da Leitura Automonitorada

### Parâmetros de Apresentação

Os parâmetros de apresentação da leitura automonitorada podem ser ajustados no arquivo `js/self-paced-reading.js`:

```javascript
// Em js/self-paced-reading.js
const selfPacedReadingConfig = {
    // Tempo mínimo de apresentação de cada segmento (ms)
    minSegmentDuration: 300,
    
    // Tempo máximo de apresentação de cada segmento (ms)
    maxSegmentDuration: 10000,
    
    // Intervalo entre segmentos (ms)
    interSegmentInterval: 250,
    
    // Fonte e tamanho do texto
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    
    // Cor do texto e do fundo
    textColor: 'black',
    backgroundColor: 'white'
};
```

### Método de Resposta

Você pode personalizar o método de resposta para avançar entre os segmentos:

```javascript
// Em js/self-paced-reading.js
function implementSelfPacedReading(texts) {
    const trials = [];
    
    // Instruções
    const instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Leitura Automonitorada</h2>
                <p>Você lerá textos apresentados em segmentos.</p>
                <p>Para avançar para o próximo segmento, pressione a BARRA DE ESPAÇO.</p>
                <p>Leia com atenção, pois haverá perguntas sobre o conteúdo após cada texto.</p>
            </div>
        `,
        choices: ['Iniciar'],
    };
    trials.push(instructions);
    
    // Para cada texto...
    texts.forEach(text => {
        // Configuração para leitura por tecla (barra de espaço)
        const segmentTrials = text.segments.map((segment, index) => {
            return {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: `<div class="reading-segment">${segment}</div>`,
                choices: [' '],
                data: {
                    task: 'self_paced_reading',
                    text_id: text.id,
                    segment_index: index,
                    segment_content: segment
                }
            };
        });
        
        // Adicione os trials de segmentos
        trials.push(...segmentTrials);
        
        // Adicione a pergunta de compreensão, se existir
        if (text.comprehension_question) {
            // Configuração da pergunta...
        }
    });
    
    return trials;
}
```

Para mudar para avanço por clique em vez de tecla:

```javascript
// Substitua o tipo e as escolhas
return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="reading-segment">${segment}</div>`,
    choices: ['Continuar'],
    // ...
};
```

## Personalização do Eye Tracking

### Calibração

Os parâmetros de calibração do eye tracking podem ser ajustados no arquivo `js/eye-tracking.js`:

```javascript
// Em js/eye-tracking.js
function implementEyeTracking(texts) {
    const trials = [];
    
    // Inicialização e calibração do WebGazer
    const initWebgazer = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instructions">
                <h2>Calibração do Rastreamento Ocular</h2>
                <p>Vamos calibrar o sistema de rastreamento ocular.</p>
                <p>Siga as instruções na tela e olhe para os pontos que aparecerem.</p>
            </div>
        `,
        choices: ['Iniciar Calibração'],
        extensions: [
            {
                type: jsPsychExtensionWebgazer,
                params: {
                    targets: ['#jspsych-target'],
                }
            }
        ]
    };
    trials.push(initWebgazer);
    
    // Calibração
    const calibration = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<div id="calibration-container"></div>`,
        choices: ['Continuar'],
        extensions: [
            {
                type: jsPsychExtensionWebgazer,
                params: {
                    calibration: {
                        mode: 'manual',
                        points: [
                            { x: '10%', y: '10%' },
                            { x: '50%', y: '10%' },
                            { x: '90%', y: '10%' },
                            { x: '10%', y: '50%' },
                            { x: '50%', y: '50%' },
                            { x: '90%', y: '50%' },
                            { x: '10%', y: '90%' },
                            { x: '50%', y: '90%' },
                            { x: '90%', y: '90%' }
                        ],
                        point_duration: 1000,
                        pause_duration: 500
                    }
                }
            }
        ],
        on_load: function() {
            // Código para exibir os pontos de calibração
        }
    };
    trials.push(calibration);
    
    // Validação
    const validation = {
        // Configuração da validação...
    };
    trials.push(validation);
    
    // Resto da implementação...
    
    return trials;
}
```

### Parâmetros de Rastreamento

Você pode ajustar os parâmetros de rastreamento ocular:

```javascript
// Em js/eye-tracking.js
const eyeTrackingConfig = {
    // Frequência de amostragem (ms)
    sampleInterval: 50,
    
    // Mostrar o ponto de fixação durante o experimento
    showGaze: false,
    
    // Tamanho do buffer para suavização
    smoothingBufferSize: 5,
    
    // Limiar para detecção de fixação (pixels)
    fixationThreshold: 30,
    
    // Duração mínima para considerar uma fixação (ms)
    minFixationDuration: 100
};
```

### Visualização em Tempo Real

Para habilitar ou desabilitar a visualização do ponto de fixação em tempo real:

```javascript
// Em js/eye-tracking.js
function createEyeTrackingTrial(text) {
    return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<div class="reading-text">${text.content}</div>`,
        choices: ['q'],
        trial_duration: 60000,
        extensions: [
            {
                type: jsPsychExtensionWebgazer,
                params: {
                    showGaze: false,  // Altere para true para mostrar o ponto de fixação
                    saveGaze: true,
                    targets: ['#jspsych-target']
                }
            }
        ],
        data: {
            task: 'eye_tracking',
            text_id: text.id,
            text_content: text.content,
            text_source: text.source
        }
    };
}
```

## Personalização do IAT

### Categorias e Estímulos

Para personalizar as categorias e estímulos do IAT:

```javascript
// Em js/iat.js
const iatCategories = {
    target1: {
        name: 'Texto Humano',
        stimuli: [
            'Trecho de texto humano 1',
            'Trecho de texto humano 2',
            'Trecho de texto humano 3',
            // Adicione mais estímulos...
        ]
    },
    target2: {
        name: 'Texto IA',
        stimuli: [
            'Trecho de texto IA 1',
            'Trecho de texto IA 2',
            'Trecho de texto IA 3',
            // Adicione mais estímulos...
        ]
    },
    attribute1: {
        name: 'Natural',
        stimuli: [
            'Fluente',
            'Autêntico',
            'Espontâneo',
            'Genuíno',
            'Orgânico',
            // Adicione mais estímulos...
        ]
    },
    attribute2: {
        name: 'Artificial',
        stimuli: [
            'Mecânico',
            'Robótico',
            'Sintético',
            'Fabricado',
            'Processado',
            // Adicione mais estímulos...
        ]
    }
};
```

### Estrutura dos Blocos

Você pode personalizar a estrutura dos blocos do IAT:

```javascript
// Em js/iat.js
function implementIAT() {
    const trials = [];
    
    // Instruções
    const instructions = {
        // Configuração das instruções...
    };
    trials.push(instructions);
    
    // Bloco 1: Prática de categorias-alvo (Texto Humano vs. Texto IA)
    const block1 = {
        type: jsPsychIatHtml,
        stimulus: jsPsych.timelineVariable('stimulus'),
        stim_key_association: jsPsych.timelineVariable('stim_key_association'),
        html_when_wrong: '<span style="color: red; font-size: 80px">X</span>',
        bottom_instructions: '<p>Se você errar, um X vermelho aparecerá. Pressione a outra tecla para continuar.</p>',
        force_correct_key_press: true,
        display_feedback: true,
        left_category_key: 'e',
        right_category_key: 'i',
        left_category_label: ['Texto Humano'],
        right_category_label: ['Texto IA'],
        trial_duration: 3000,
        data: {
            iat_block: 1,
            iat_type: 'practice',
            iat_label: 'target_practice'
        }
    };
    
    const block1_timeline_variables = createIATStimuliVariables('target1', 'target2');
    
    const block1_procedure = {
        timeline: [block1],
        timeline_variables: block1_timeline_variables,
        randomize_order: true,
        repetitions: 2
    };
    trials.push(block1_procedure);
    
    // Adicione mais blocos conforme necessário...
    
    return trials;
}
```

### Parâmetros de Tempo

Você pode ajustar os parâmetros de tempo do IAT:

```javascript
// Em js/iat.js
const iatConfig = {
    // Duração máxima de cada trial (ms)
    trialDuration: 3000,
    
    // Intervalo entre trials (ms)
    interTrialInterval: 250,
    
    // Número de repetições para blocos de prática
    practiceRepetitions: 2,
    
    // Número de repetições para blocos de teste
    testRepetitions: 4,
    
    // Teclas de resposta
    leftKey: 'e',
    rightKey: 'i',
    
    // Mostrar feedback para respostas incorretas
    showFeedback: true,
    
    // Forçar tecla correta após erro
    forceCorrectKeyPress: true
};
```

## Personalização das Avaliações Subjetivas

### Escalas de Avaliação

Para personalizar as escalas de avaliação subjetiva:

```javascript
// Em js/evaluation.js
const evaluationScales = {
    naturalidade: {
        prompt: "Quão natural este texto parece para você?",
        labels: [
            "Extremamente artificial",
            "Muito artificial",
            "Artificial",
            "Neutro",
            "Natural",
            "Muito natural",
            "Extremamente natural"
        ]
    },
    clareza: {
        prompt: "Quão claro este texto é para você?",
        labels: [
            "Extremamente confuso",
            "Muito confuso",
            "Confuso",
            "Neutro",
            "Claro",
            "Muito claro",
            "Extremamente claro"
        ]
    },
    // Adicione mais escalas conforme necessário...
};
```

### Perguntas Adicionais

Para adicionar perguntas adicionais às avaliações:

```javascript
// Em js/evaluation.js
function createAuthorshipQuestion(text) {
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="evaluation-question">
                <h3>Identificação de Autoria</h3>
                <p>Você acredita que este texto foi escrito por:</p>
                <div class="text-preview">${text.content.substring(0, 200)}...</div>
            </div>
        `,
        choices: ['Um ser humano', 'Uma inteligência artificial'],
        data: {
            task: 'authorship_identification',
            text_id: text.id,
            text_source: text.source
        },
        on_finish: function(data) {
            // 0 = humano, 1 = IA
            data.correct = (data.response === 0 && text.source === 'human') || 
                          (data.response === 1 && text.source === 'ai');
        }
    };
}

function createConfidenceQuestion() {
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="evaluation-question">
                <h3>Nível de Confiança</h3>
                <p>Qual é o seu nível de confiança nesta identificação?</p>
            </div>
        `,
        choices: ['Nada confiante', 'Pouco confiante', 'Moderadamente confiante', 'Muito confiante', 'Extremamente confiante'],
        data: {
            task: 'confidence_rating'
        }
    };
}
```

## Personalização da Interface do Usuário

### Estilos e Aparência

Para personalizar a aparência do experimento, edite o arquivo `css/style.css`:

```css
/* Em css/style.css */

/* Estilos gerais */
body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f9f9f9;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

/* Estilos para leitura automonitorada */
.reading-segment {
    font-size: 20px;
    line-height: 1.8;
    text-align: left;
    margin: 50px auto;
    max-width: 80%;
}

/* Estilos para eye tracking */
.reading-text {
    font-size: 18px;
    line-height: 1.8;
    text-align: left;
    margin: 30px auto;
    max-width: 80%;
}

/* Estilos para o IAT */
.iat-stimulus {
    font-size: 24px;
    font-weight: bold;
}

.iat-category {
    font-size: 18px;
    font-weight: bold;
    color: #555;
}

/* Estilos para avaliações */
.evaluation-question {
    margin: 30px auto;
    max-width: 90%;
}

.text-preview {
    font-style: italic;
    background-color: #f0f0f0;
    padding: 15px;
    border-left: 4px solid #ddd;
    margin: 20px 0;
}

/* Estilos para instruções */
.instructions {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    padding: 20px;
    border-radius: 5px;
    margin-bottom: 30px;
}

.instructions h2 {
    color: #2c3e50;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}

/* Estilos para consentimento */
.consent-form {
    text-align: left;
    max-width: 90%;
    margin: 0 auto;
}

.consent-title {
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20px;
}

.consent-section {
    margin-bottom: 15px;
}

.consent-section-title {
    font-weight: bold;
    margin-bottom: 5px;
}
```

### Instruções e Mensagens

Para personalizar as instruções e mensagens do experimento, edite os textos nos arquivos JavaScript correspondentes:

```javascript
// Em js/main.js
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
        choices: ['Continuar'],
        data: {
            task: 'welcome'
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
                
                <!-- Adicione ou modifique as seções conforme necessário -->
                
                <div class="consent-section">
                    <p>Ao clicar em "Concordo", você confirma que leu e entendeu as informações acima e concorda em participar voluntariamente deste estudo.</p>
                </div>
            </div>
        `,
        choices: ['Concordo', 'Não Concordo'],
        data: {
            task: 'consent'
        },
        on_finish: function(data) {
            // Se o participante não concordar, encerra o experimento
            if (data.response == 1) {
                jsPsych.endExperiment('Obrigado pelo seu interesse. O experimento foi encerrado porque você não concordou com o termo de consentimento.');
            }
        }
    };
    timeline.push(consent);
}
```

## Personalização da Coleta de Dados

### Formato dos Dados

Para personalizar o formato dos dados coletados, você pode adicionar informações adicionais aos objetos `data` em cada trial:

```javascript
// Exemplo para leitura automonitorada
{
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div class="reading-segment">${segment}</div>`,
    choices: [' '],
    data: {
        task: 'self_paced_reading',
        text_id: text.id,
        segment_index: index,
        segment_content: segment,
        segment_length: segment.length,
        segment_word_count: segment.split(' ').length,
        text_source: text.source,
        participant_id: participantId,
        condition: experimentalCondition
    }
}
```

### Armazenamento dos Dados

Para personalizar o método de armazenamento dos dados:

```javascript
// Em js/main.js
function saveData(data) {
    // Método 1: Salvar localmente (para testes)
    const dataStr = JSON.stringify(data);
    const filename = `participant_${participantId}_${Date.now()}.json`;
    
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Método 2: Enviar para um servidor
    /*
    fetch('https://seu-servidor.com/api/save-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            participant_id: participantId,
            timestamp: Date.now(),
            data: data
        })
    })
    .then(response => response.json())
    .then(result => {
        console.log('Dados salvos com sucesso:', result);
    })
    .catch(error => {
        console.error('Erro ao salvar dados:', error);
    });
    */
}
```

---

Este guia de personalização fornece as informações necessárias para adaptar o experimento às suas necessidades específicas. Se precisar de ajuda adicional ou tiver dúvidas sobre personalizações mais avançadas, consulte a documentação oficial do jsPsych ou entre em contato com o desenvolvedor.

Desenvolvido por Manus AI, 2025.

