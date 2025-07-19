/**
 * iat.js
 *
 * Single‑file implementation of the 7‑block implicit‑association test (IAT)
 * described in the research protocol.  It relies on jsPsych v7+ and the
 * official `jspsych‑iat‑html` plugin.
 *
 * HOW TO USE
 * 1. Place this file in the same folder as your index.html (or adjust paths).
 * 2. Put a file `stimuli/stimuli.json` on your server with this structure:
 *    {
 *      "ia_texts": ["gerado por algoritmo", "..."],
 *      "human_texts": ["escrito pela jornalista", "..."],
 *      "positive": ["claro", "fluente", "..."],
 *      "negative": ["artificial", "confuso", "..."]
 *    }
 * 3. In your HTML, import this script and call `loadIAT();`
 */

/**
 * Renderiza o HTML centralizado do estímulo IAT
 */
function generateIatStimulusHTML(stimulus, leftLabels, rightLabels) {
    return `
    <div class="iat-container" style="
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        padding:40px;">
      <div class="iat-stimulus" style="
          font-size:22px;font-weight:bold;
          margin-bottom:40px;max-width:600px;
          text-align:center;">
        ${stimulus}
      </div>
      <div class="iat-instructions" style="
          margin-bottom:30px;font-size:14px;color:#555;">
        Pressione a tecla <strong>E</strong> para: ${leftLabels}<br>
        Pressione a tecla <strong>I</strong> para: ${rightLabels}
      </div>
      <div class="iat-category-labels" style="
          display:flex;justify-content:space-between;
          width:100%;font-size:18px;font-weight:bold;">
        <div style="text-align:left;">${leftLabels}</div>
        <div style="text-align:right;">${rightLabels}</div>
      </div>
    </div>
    `;
}

// iat.js - Construtor de blocos do IAT

function snippet(text) {
  const words = text.trim().split(/\s+/);
  return words.slice(0, 6).join(' ') + (words.length > 6 ? '…' : '');
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getBlockLabels(blockId, side) {
  const labels = {
    1: { left: 'Texto IA', right: 'Texto Humano' },
    2: { left: 'Negativo', right: 'Positivo' },
    3: { left: 'Texto IA ou Positivo', right: 'Texto Humano ou Negativo' },
    4: { left: 'Texto IA ou Positivo', right: 'Texto Humano ou Negativo' },
    5: { left: 'Texto Humano', right: 'Texto IA' },
    6: { left: 'Texto Humano ou Positivo', right: 'Texto IA ou Negativo' },
    7: { left: 'Texto Humano ou Positivo', right: 'Texto IA ou Negativo' },
  };
  return side === 'left' ? labels[blockId]?.left : labels[blockId]?.right;
}

function buildTrials(words, side, blockId) {
  return words.map(w => ({
    type: jsPsychIatHtml,
    stimulus: generateIatStimulusHTML(
      `<span style="font-size:32px">${w}</span>`,
      getBlockLabels(blockId, 'left'),
      getBlockLabels(blockId, 'right')
    ),
    stim_key_association: side,
    left_category_key: 'e',
    right_category_key: 'i',
    left_category_label: ['TEXTO IA', 'NEGATIVO'],
    right_category_label: ['TEXTO HUMANO', 'POSITIVO'],
    html_when_wrong: '<div style="color:red; font-size:60px; position:absolute; top:10%; left:50%; transform:translateX(-50%);">X</div>',
    bottom_instructions:
      '<p>Use <strong>E</strong> (esquerda) e <strong>I</strong> (direita) para classificar. ' +
      'Se errar, aparecerá um X vermelho; pressione a tecla correta para continuar.</p>',
    force_correct_key_press: true,
    display_feedback: true,
    response_ends_trial: true,
    trial_duration: null,
    block: blockId
  }));
}

window.buildIATTrials = function(texts) {
  const generalInstructions = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions">
        <h2>Teste de Associação Implícita (IAT)</h2>
        <p>Neste teste você associará textos IA vs. Humano e palavras Positivo vs. Negativo.</p>
        <p>Use as teclas <strong>E</strong> e <strong>I</strong> conforme mostrado.</p>
        <p>Clique em "Continuar" para iniciar.</p>
      </div>`,
    choices: ['Continuar'],
    data: { task: 'iat_general_instructions' }
  };

  const iaTexts = texts.filter(t => t.authorship.toLowerCase() === 'ai').map(t => snippet(t.content));
  const humanTexts = texts.filter(t => t.authorship.toLowerCase() === 'human').map(t => snippet(t.content));
  const positive = ['claro', 'fluente', 'confiável', 'natural', 'envolvente', 'coerente'];
  const negative = ['artificial', 'confuso', 'forçado', 'robótico', 'impreciso', 'incoerente'];

  const block1 = [...buildTrials(iaTexts, 'left', 1), ...buildTrials(humanTexts, 'right', 1)];
  const block2 = [...buildTrials(negative, 'left', 2), ...buildTrials(positive, 'right', 2)];
  const block3practice = [...buildTrials(iaTexts, 'left', 3), ...buildTrials(humanTexts, 'right', 3), ...buildTrials(negative, 'left', 3), ...buildTrials(positive, 'right', 3)];
  const block4test = [...buildTrials(iaTexts, 'left', 4), ...buildTrials(humanTexts, 'right', 4), ...buildTrials(negative, 'left', 4), ...buildTrials(positive, 'right', 4)];
  const block5 = [...buildTrials(humanTexts, 'left', 5), ...buildTrials(iaTexts, 'right', 5)];
  const block6practice = [...buildTrials(humanTexts, 'left', 6), ...buildTrials(iaTexts, 'right', 6), ...buildTrials(negative, 'left', 6), ...buildTrials(positive, 'right', 6)];
  const block7test = [...buildTrials(humanTexts, 'left', 7), ...buildTrials(iaTexts, 'right', 7), ...buildTrials(negative, 'left', 7), ...buildTrials(positive, 'right', 7)];

  const completionScreen = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions">
        <h2>IAT Concluído</h2>
        <p>Você concluiu o IAT. Agora avançaremos para a próxima parte.</p>
      </div>`,
    choices: ['Continuar'],
    data: { task: 'iat_completion' },
    on_finish: calculateIATDScore
  };

  return [
    generalInstructions,
    { timeline: shuffle(block1) },
    { timeline: shuffle(block2) },
    { timeline: shuffle(block3practice) },
    { timeline: shuffle(block4test) },
    { timeline: shuffle(block5) },
    { timeline: shuffle(block6practice) },
    { timeline: shuffle(block7test) },
    completionScreen
  ];
};

/**
 * Calcula o escore D do IAT e o adiciona aos dados do jsPsych
 */
function calculateIATDScore() {
  // Filtra trials compatíveis e incompatíveis (blocos 4 e 7)
  const compatible = jsPsych.data.get()
    .filter({ iat_type: 'test', iat_compatibility: 'compatible' });
  const incompatible = jsPsych.data.get()
    .filter({ iat_type: 'test', iat_compatibility: 'incompatible' });

  if (compatible.count() && incompatible.count()) {
    const meanC = compatible.select('rt').mean();
    const meanI = incompatible.select('rt').mean();
    const sdC = compatible.select('rt').sd();
    const sdI = incompatible.select('rt').sd();
    const pooledSD = Math.sqrt((sdC*sdC + sdI*sdI) / 2);
    const dScore = (meanI - meanC) / pooledSD;
    jsPsych.data.addProperties({ iat_d_score: dScore });
  }
}