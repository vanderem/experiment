/**
 * Carrega os textos do corpus a partir do arquivo JSON
 */
async function loadTexts() {
    try {
        const response = await fetch('texts/example_texts.json');
        const data = await response.json();
        return data.texts;
    } catch (error) {
        console.error('Erro ao carregar os textos:', error);
        return [];
    }
}

/**
 * Divide um texto em segmentos (frases) para a leitura automonitorada
 * @param {string} text - O texto completo a ser segmentado
 * @returns {Array} - Array de segmentos (frases)
 */
function segmentText(text) {
    // Divide o texto em frases usando pontuação como delimitador
    // Esta é uma implementação simples; pode ser refinada conforme necessário
    const segments = text.split(/(?<=[.!?])\s+/);
    
    // Filtra segmentos vazios
    return segments.filter(segment => segment.trim().length > 0);
}

/**
 * Seleciona textos aleatórios do corpus, garantindo equilíbrio entre textos de IA e humanos
 * @param {Array} texts - Array com todos os textos disponíveis
 * @param {number} count - Número de textos a serem selecionados
 * @returns {Array} - Array com os textos selecionados
 */
function selectRandomTexts(texts, count) {
    // Divide os textos por autoria
    const aiTexts = texts.filter(text => text.authorship === 'AI');
    const humanTexts = texts.filter(text => text.authorship === 'human');
    
    // Calcula quantos textos de cada tipo selecionar
    const aiCount = Math.ceil(count / 2);
    const humanCount = count - aiCount;
    
    // Seleciona aleatoriamente textos de cada tipo
    const selectedAiTexts = shuffleArray(aiTexts).slice(0, aiCount);
    const selectedHumanTexts = shuffleArray(humanTexts).slice(0, humanCount);
    
    // Combina e embaralha os textos selecionados
    return shuffleArray([...selectedAiTexts, ...selectedHumanTexts]);
}

/**
 * Embaralha um array (algoritmo Fisher-Yates)
 * @param {Array} array - O array a ser embaralhado
 * @returns {Array} - O array embaralhado
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

