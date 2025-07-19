/**
 * Estímulos para o Teste de Associação Implícita (IAT)
 * Compatível com o iat.js atual
 */

const iatAttributes = {
    positive: [
        { stimulus: 'Bom', category: 'Positivo' },
        { stimulus: 'Competente', category: 'Positivo' },
        { stimulus: 'Agradável', category: 'Positivo' },
        { stimulus: 'Alegre', category: 'Positivo' },
        { stimulus: 'Inteligente', category: 'Positivo' },
        { stimulus: 'Sábio', category: 'Positivo' }
    ],
    negative: [
        { stimulus: 'Ruim', category: 'Negativo' },
        { stimulus: 'Desagradável', category: 'Negativo' },
        { stimulus: 'Ineficiente', category: 'Negativo' },
        { stimulus: 'Leigo', category: 'Negativo' },
        { stimulus: 'Triste', category: 'Negativo' },
        { stimulus: 'Tolo', category: 'Negativo' }
    ]
};

/**
 * Cria os estímulos para o IAT a partir dos textos carregados
 * @param {Array} texts - Array de objetos com os textos (autoria e conteúdo)
 * @returns {Object} Objeto contendo arrays de estímulos por categoria
 */
function createIatStimuli(texts) {
    const aiTexts = texts.filter(text => text.authorship === 'AI').slice(0, 4);
    const humanTexts = texts.filter(text => text.authorship === 'human').slice(0, 4);

    const aiStimuli = aiTexts.map(text => ({
        stimulus: text.content.split(' ').slice(0, 12).join(' ') + '...',
        category: 'IA'
    }));

    const humanStimuli = humanTexts.map(text => ({
        stimulus: text.content.split(' ').slice(0, 12).join(' ') + '...',
        category: 'Humano'
    }));

    return {
        aiStimuli,
        humanStimuli,
        positiveAttributes: iatAttributes.positive,
        negativeAttributes: iatAttributes.negative
    };
}