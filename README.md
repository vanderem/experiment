# Sintonia Invisível: Processamento e Julgamento de Textos Algorítmicos

## Documentação do Projeto jsPsych

### Índice

1. [Introdução](#introdução)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Requisitos e Instalação](#requisitos-e-instalação)
4. [Componentes do Experimento](#componentes-do-experimento)
   - [Leitura Automonitorada](#leitura-automonitorada)
   - [Eye Tracking](#eye-tracking)
   - [Teste de Associação Implícita (IAT)](#teste-de-associação-implícita-iat)
   - [Avaliações Subjetivas e Identificação de Autoria](#avaliações-subjetivas-e-identificação-de-autoria)
5. [Personalização do Experimento](#personalização-do-experimento)
   - [Adição de Novos Textos](#adição-de-novos-textos)
   - [Modificação dos Estímulos do IAT](#modificação-dos-estímulos-do-iat)
   - [Ajuste dos Parâmetros de Eye Tracking](#ajuste-dos-parâmetros-de-eye-tracking)
6. [Execução do Experimento](#execução-do-experimento)
7. [Coleta e Análise de Dados](#coleta-e-análise-de-dados)
8. [Referências](#referências)

### Introdução

Este projeto implementa um experimento de psicologia cognitiva utilizando a biblioteca jsPsych para investigar como as pessoas processam e julgam textos produzidos por humanos versus textos gerados por algoritmos de inteligência artificial. O experimento combina várias metodologias experimentais, incluindo leitura automonitorada, rastreamento ocular (eye tracking), Teste de Associação Implícita (IAT) e avaliações subjetivas.

O objetivo principal é examinar se existem diferenças detectáveis no processamento cognitivo e nas avaliações subjetivas de textos produzidos por humanos em comparação com textos gerados por IA, mesmo quando os participantes não são explicitamente informados sobre a origem dos textos.

### Estrutura do Projeto

```
jspsych-experiment/
├── css/
│   └── style.css                # Estilos personalizados para o experimento
├── js/
│   ├── texts.js                 # Módulo para carregamento e manipulação dos textos
│   ├── self-paced-reading.js    # Implementação da leitura automonitorada
│   ├── eye-tracking.js          # Implementação do rastreamento ocular
│   ├── iat.js                   # Implementação do Teste de Associação Implícita
│   ├── evaluation.js            # Implementação das avaliações subjetivas
│   ├── main.js                  # Arquivo principal que integra todos os componentes
│   └── debug.js                 # Ferramentas de depuração
├── texts/
│   └── example_texts.json       # Arquivo de exemplo com os textos do corpus
├── assets/
│   └── [arquivos de mídia]      # Imagens ou outros recursos necessários
├── data/
│   └── [arquivos de dados]      # Diretório para armazenamento dos dados coletados
├── index.html                   # Página principal do experimento
└── README.md                    # Esta documentação
```

### Requisitos e Instalação

#### Requisitos

- Navegador web moderno (Chrome, Firefox, Edge ou Safari atualizado)
- Servidor web local ou remoto para hospedar os arquivos
- Webcam (para o componente de eye tracking)

#### Instalação

1. Clone ou baixe este repositório para o seu computador.

2. Instale as dependências do jsPsych:

```bash
cd jspsych-experiment
npm install
```

Alternativamente, o projeto está configurado para usar as bibliotecas jsPsych via CDN, então não é estritamente necessário instalar as dependências localmente.

3. Inicie um servidor web local para executar o experimento:

```bash
npx http-server -p 8080
```

4. Acesse o experimento em seu navegador:

```
http://localhost:8080
```

### Componentes do Experimento

#### Leitura Automonitorada

O componente de leitura automonitorada apresenta textos segmentados (por frases ou palavras) e permite que o participante avance no seu próprio ritmo, pressionando uma tecla. O tempo de leitura para cada segmento é registrado, permitindo análises detalhadas do processamento linguístico.

**Principais características:**
- Apresentação segmentada de textos
- Registro dos tempos de leitura para cada segmento
- Perguntas de compreensão após cada texto

**Arquivo de implementação:** `js/self-paced-reading.js`

#### Eye Tracking

O componente de eye tracking utiliza a extensão WebGazer do jsPsych para rastrear os movimentos oculares do participante enquanto ele lê textos completos. Isso permite analisar padrões de fixação, regressões e outros comportamentos de leitura.

**Principais características:**
- Calibração da webcam para rastreamento ocular
- Registro das coordenadas do olhar durante a leitura
- Análise de fixações e movimentos sacádicos

**Arquivo de implementação:** `js/eye-tracking.js`

#### Teste de Associação Implícita (IAT)

O componente IAT implementa um Teste de Associação Implícita adaptado para investigar associações implícitas entre textos (humanos vs. IA) e atributos (naturalidade, qualidade, etc.). Os participantes classificam estímulos em categorias usando teclas de resposta rápida.

**Principais características:**
- Blocos de prática e teste
- Contrabalanceamento das associações
- Cálculo do escore D (medida de efeito IAT)

**Arquivo de implementação:** `js/iat.js`

#### Avaliações Subjetivas e Identificação de Autoria

Este componente coleta avaliações explícitas dos participantes sobre os textos lidos, incluindo julgamentos de naturalidade, clareza e compreensibilidade. Também solicita que os participantes identifiquem se acreditam que cada texto foi escrito por um humano ou gerado por IA.

**Principais características:**
- Escalas Likert para avaliações subjetivas
- Julgamentos de autoria (humano vs. IA)
- Medidas de confiança nas avaliações

**Arquivo de implementação:** `js/evaluation.js`

### Personalização do Experimento

#### Adição de Novos Textos

Para adicionar novos textos ao corpus do experimento:

1. Crie ou edite um arquivo JSON na pasta `texts/` seguindo a estrutura do arquivo de exemplo:

```json
{
  "texts": [
    {
      "id": "text1",
      "content": "Texto completo aqui...",
      "source": "human",
      "segments": ["Segmento 1.", "Segmento 2.", "..."],
      "comprehension_question": {
        "question": "Pergunta sobre o texto?",
        "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
        "correct_answer": 0
      }
    },
    // Mais textos...
  ]
}
```

2. Atualize a referência ao arquivo de textos no arquivo `js/texts.js` se necessário:

```javascript
// Em js/texts.js
async function loadTexts() {
    try {
        const response = await fetch('texts/seu_novo_arquivo.json');
        const data = await response.json();
        return data.texts;
    } catch (error) {
        console.error('Erro ao carregar os textos:', error);
        return [];
    }
}
```

#### Modificação dos Estímulos do IAT

Para modificar os estímulos e categorias do IAT:

1. Edite o arquivo `js/iat.js` para atualizar as categorias e estímulos:

```javascript
// Em js/iat.js
const iatCategories = {
    target1: {
        name: 'Texto Humano',
        stimuli: ['Exemplo 1', 'Exemplo 2', '...']
    },
    target2: {
        name: 'Texto IA',
        stimuli: ['Exemplo 1', 'Exemplo 2', '...']
    },
    attribute1: {
        name: 'Natural',
        stimuli: ['Fluente', 'Autêntico', '...']
    },
    attribute2: {
        name: 'Artificial',
        stimuli: ['Mecânico', 'Robótico', '...']
    }
};
```

2. Ajuste os parâmetros do IAT conforme necessário:

```javascript
// Em js/iat.js
const iatParameters = {
    numPracticeTrials: 20,
    numTestTrials: 40,
    stimulusDuration: 1500,
    interTrialInterval: 250
};
```

#### Ajuste dos Parâmetros de Eye Tracking

Para ajustar os parâmetros de eye tracking:

1. Edite o arquivo `js/eye-tracking.js` para modificar as configurações:

```javascript
// Em js/eye-tracking.js
const eyeTrackingConfig = {
    calibrationPoints: 9,
    calibrationDuration: 3000,
    sampleInterval: 50,  // milissegundos
    showGaze: false,     // mostrar ou não o ponto de fixação durante o experimento
    validationPoints: 5
};
```

### Execução do Experimento

Para executar o experimento completo:

1. Certifique-se de que o servidor web está em execução.

2. Acesse a página principal do experimento no navegador.

3. O experimento seguirá a seguinte sequência:
   - Boas-vindas e consentimento informado
   - Instruções gerais
   - Calibração do eye tracking
   - Fase de leitura automonitorada
   - Fase de eye tracking
   - Teste de Associação Implícita (IAT)
   - Avaliações subjetivas e identificação de autoria
   - Questionário final e agradecimento

4. Os dados serão salvos automaticamente na pasta `data/` (se configurado para armazenamento local) ou enviados para um servidor (se configurado para armazenamento remoto).

### Coleta e Análise de Dados

O experimento coleta diversos tipos de dados:

1. **Dados de leitura automonitorada:**
   - Tempos de leitura para cada segmento
   - Respostas às perguntas de compreensão

2. **Dados de eye tracking:**
   - Coordenadas do olhar ao longo do tempo
   - Fixações e sacadas
   - Padrões de releitura

3. **Dados do IAT:**
   - Tempos de resposta para cada estímulo
   - Precisão das respostas
   - Escore D calculado

4. **Dados de avaliações subjetivas:**
   - Pontuações nas escalas Likert
   - Julgamentos de autoria
   - Níveis de confiança

Os dados são armazenados em formato JSON e podem ser exportados para análise em ferramentas como R, Python ou Excel.

### Referências

1. de Leeuw, J. R. (2015). jsPsych: A JavaScript library for creating behavioral experiments in a Web browser. Behavior Research Methods, 47(1), 1-12.
2. Greenwald, A. G., McGhee, D. E., & Schwartz, J. L. K. (1998). Measuring individual differences in implicit cognition: The Implicit Association Test. Journal of Personality and Social Psychology, 74(6), 1464-1480.
3. Papoutsaki, A., Sangkloy, P., Laskey, J., Daskalova, N., Huang, J., & Hays, J. (2016). WebGazer: Scalable webcam eye tracking using user interactions. Proceedings of the 25th International Joint Conference on Artificial Intelligence (IJCAI), 3839-3845.
4. Just, M. A., & Carpenter, P. A. (1980). A theory of reading: From eye fixations to comprehension. Psychological Review, 87(4), 329-354.

---

Desenvolvido por Manus AI, 2025.

