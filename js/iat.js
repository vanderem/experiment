/**
 * iat.js - Gold standard 7-block Implicit Association Test implementation
 * Readaptação para expões globais de buildIATTrials e loadIAT, mantendo leitura externa de estímulos,
 * reutilização de textos e organização visual via CSS.
 */
(function(global) {
  // ====== UTILITÁRIAS ======
  function snippet(text) {
    const words = text.trim().split(/\s+/);
    return words.slice(0, 6).join(' ') + (words.length > 6 ? '…' : '');
  }
  function shuffle(arr) {
    return arr.slice().sort(() => Math.random() - 0.5);
  }
  const categories = {
    ai:       { key: 'E', label: 'Texto IA' },
    human:    { key: 'I', label: 'Texto Humano' },
    negative: { key: 'E', label: 'Negativo' },
    positive: { key: 'I', label: 'Positivo' }
  };
  function getBlockLabels(id, side) {
    const mapping = {
      1: ['ai','human'],
      2: ['negative','positive'],
      3: ['ai|positive','human|negative'],
      4: ['ai|positive','human|negative'],
      5: ['human','ai'],
      6: ['human|positive','ai|negative'],
      7: ['human|positive','ai|negative']
    };
    const labels = mapping[id] || ['', ''];
    const cats = side === 'left' ? labels[0] : labels[1];
    return cats.split('|').map(c => categories[c].label).join(' ou ');
  }

  // ====== DETERMINAR LADO DO ESTÍMULO ======
  function getStimSide(blockId, cat) {
    const mapping = {
      1: { ai: 'left',    human: 'right' },
      2: { negative: 'left', positive: 'right' },
      3: { ai: 'left', positive: 'left', human: 'right', negative: 'right' },
      4: { ai: 'left', positive: 'left', human: 'right', negative: 'right' },
      5: { human: 'left', ai: 'right' },
      6: { human: 'left', positive: 'left', ai: 'right', negative: 'right' },
      7: { human: 'left', positive: 'left', ai: 'right', negative: 'right' }
    };
    return mapping[blockId][cat];
  }

  // ====== GERAÇÃO DE HTML ======
  function generateIatStimulusHTML(stimulus, leftLabels, rightLabels) {
    return `
    <div class="iat-container">
      <!-- <div class="iat-labels-container">
        <div class="iat-label-left">Pressione E para:<br><strong>${leftLabels}</strong></div>
        <div class="iat-label-right">Pressione I para:<br><strong>${rightLabels}</strong></div>
      </div> -->
      <div class="iat-stimulus"><strong>${stimulus}</strong></div>
       <div class="iat-instructions">
        <br>
        <br>
        <br>
        <br>
        <br>
      </div>
    </div>
    `;
  }

  // ====== CÁLCULO DO ESCORE D ======
  function calculateIATDScore() {
    const data = jsPsych.data.get().filter({ iat_type: 'test' });
    const comp = data.filter({ iat_compatibility: 'compatible' }).select('rt');
    const incomp = data.filter({ iat_compatibility: 'incompatible' }).select('rt');
    if (comp.count() && incomp.count()) {
      const mC = comp.mean(), mI = incomp.mean();
      const sC = comp.std(), sI = incomp.std();
      const pooled = Math.sqrt((sC**2 + sI**2)/2);
      jsPsych.data.addProperties({ iat_d_score: (mI - mC)/pooled });
    }
  }

  // ====== FUNÇÃO DE MONTAGEM ======
  global.buildIATTrials = async function(stimuli) {
    console.log('buildIATTrials received stimuli:', stimuli);
    // Derive category arrays from stimuli
    let ia_texts, human_texts, positive, negative;
    let itemsArray;
    if (Array.isArray(stimuli)) {
      itemsArray = stimuli;
    } else if (Array.isArray(stimuli.texts)) {
      itemsArray = stimuli.texts;
    }
    if (itemsArray) {
      ia_texts    = itemsArray.filter(t => t.authorship.toLowerCase() === 'ai').map(t => t.content);
      human_texts = itemsArray.filter(t => t.authorship.toLowerCase() === 'human').map(t => t.content);
      // default attribute arrays if not provided
      positive    = ['Bom', 'Competente', 'Agradável', 'Alegre', 'Inteligente', 'Sábio'];
      negative    = ['Ruim', 'Desagradável', 'Ineficiente', 'Leigo', 'Triste', 'Tolo'];
    } else {
      ia_texts    = stimuli.ia_texts    || [];
      human_texts = stimuli.human_texts || [];
      positive    = stimuli.positive    || [];
      negative    = stimuli.negative    || [];
    }

    console.log('Derived arrays:', { ia_texts, human_texts, positive, negative });

    // prepara snippets
    const aiSnip  = ia_texts.map(snippet);
    const huSnip  = human_texts.map(snippet);
    const posSnip = positive.map(snippet);
    const negSnip = negative.map(snippet);

    // definições de blocos gold standard (7 blocos)
    const blocks = [
      { id:1, items: [...aiSnip.map(t=>({text:t,cat:'ai'})), ...huSnip.map(t=>({text:t,cat:'human'}))], practice:true },
      { id:2, items: [...negSnip.map(t=>({text:t,cat:'negative'})), ...posSnip.map(t=>({text:t,cat:'positive'}))], practice:true },
      { id:3, items: [...aiSnip.map(t=>({text:t,cat:'ai'})), ...huSnip.map(t=>({text:t,cat:'human'})), ...negSnip.map(t=>({text:t,cat:'negative'})), ...posSnip.map(t=>({text:t,cat:'positive'}))], practice:true },
      { id:4, items: [...aiSnip.map(t=>({text:t,cat:'ai'})), ...huSnip.map(t=>({text:t,cat:'human'})), ...negSnip.map(t=>({text:t,cat:'negative'})), ...posSnip.map(t=>({text:t,cat:'positive'}))], practice:false },
      { id:5, items: [...huSnip.map(t=>({text:t,cat:'human'})), ...aiSnip.map(t=>({text:t,cat:'ai'}))], practice:true },
      { id:6, items: [...huSnip.map(t=>({text:t,cat:'human'})), ...aiSnip.map(t=>({text:t,cat:'ai'})), ...negSnip.map(t=>({text:t,cat:'negative'})), ...posSnip.map(t=>({text:t,cat:'positive'}))], practice:true },
      { id:7, items: [...huSnip.map(t=>({text:t,cat:'human'})), ...aiSnip.map(t=>({text:t,cat:'ai'})), ...negSnip.map(t=>({text:t,cat:'negative'})), ...posSnip.map(t=>({text:t,cat:'positive'}))], practice:false }
    ];

    // instruções e tela final
    const generalInstructions = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `<h2>Teste de Associação Implícita (IAT)</h2>
                 <p>Associe Texto IA vs. Texto Humano e Positivo vs. Negativo.</p>
                 <p>Use E (esquerda) e I (direita) conforme mostrado.</p>`,
      choices: ['Começar'], data:{ phase:'instructions' }
    };
    const completion = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `<h2>IAT Concluído</h2><p>Obrigado! Prosseguiremos para a próxima etapa.</p>`,
      choices: ['Continuar'], on_finish: calculateIATDScore
    };

    // Função auxiliar para instruções de bloco
    function generateBlockInstructions(id, practice) {
      const messages = {
        1: "Etapa 1 de 7: Vamos começar com um treino simples. Você verá trechos de texto gerados por IA ou por humanos. Pressione 'E' para textos de IA e 'I' para textos humanos.",
        2: "Etapa 2 de 7: Agora, o treino é com palavras positivas e negativas. Pressione 'E' para palavras negativas e 'I' para palavras positivas.",
        3: "Etapa 3 de 7: Neste treino, combinamos categorias. Pressione 'E' para textos de IA ou palavras positivas. Pressione 'I' para textos humanos ou palavras negativas.",
        4: "Etapa 4 de 7: Agora faremos o teste com a mesma combinação anterior. Seja rápido e preciso.",
        5: "Etapa 5 de 7: Mudamos os lados! Agora, pressione 'E' para textos humanos e 'I' para textos de IA. Preste atenção!",
        6: "Etapa 6 de 7: Treino com nova combinação. Pressione 'E' para textos humanos ou palavras positivas. Pressione 'I' para textos de IA ou palavras negativas.",
        7: "Etapa 7 de 7: Último teste com a combinação anterior. Tente ser o mais rápido e preciso possível!"
      };
      return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<p><strong>${messages[id]}</strong></p><p>Clique abaixo para começar esta etapa.</p>`,
        choices: ['Iniciar'],
        data: { phase: `instruction_block_${id}` }
      };
    }

    // monta timeline
    const timeline = [generalInstructions];
    blocks.forEach(({id,items,practice}) => {
      // Adiciona instruções do bloco antes dos trials
      timeline.push(generateBlockInstructions(id, practice));
      const trials = shuffle(items).map(({text,cat}) => ({
        type: jsPsychIatHtml,
        prompt: '',
        show_stim_key_prompt: false,
        show_label_prompt: false,
        stimulus: generateIatStimulusHTML(`<span>${text}</span>`, getBlockLabels(id,'left'), getBlockLabels(id,'right')),
        stim_key_association: getStimSide(id, cat),
        left_category_key: 'E', right_category_key: 'I',
        iat_type: practice?'practice':'test',
        iat_compatibility: (!practice && [4,7].includes(id)) ? (id<5?'compatible':'incompatible') : null,
        block: id,
        force_correct_key_press: true,
        display_feedback: true,
        html_when_wrong: '<div class="iat-feedback" style="color:red; font-size:60px; position:absolute; top:10%; left:50%; transform:translateX(-50%);">X</div>',
        response_ends_trial: true,
        left_category_label: getBlockLabels(id,'left').split(' ou '),
        right_category_label: getBlockLabels(id,'right').split(' ou '),
        bottom_instructions: '<p>Use <strong>E</strong> (esquerda) e <strong>I</strong> (direita) para classificar. Se errar, aparecerá um X vermelho, pressione a tecla correta para continuar.</p>',
      }));
      timeline.push({ timeline: trials });
    });
    timeline.push(completion);
    return timeline;
  };

  // ====== FUNÇÃO PRA RODAR DIRETO ======
  global.loadIAT = async function() {
    const res = await fetch('texts/example_texts.json');
    const stims = await res.json();
    const timeline = await global.buildIATTrials(stims);
    jsPsych.run(timeline);
  };

})(window);
