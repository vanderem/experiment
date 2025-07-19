/**
 * Script de depuração para o experimento jsPsych
 */

// Função para verificar se todos os módulos foram carregados corretamente
function checkModulesLoaded() {
    console.log('Verificando módulos carregados:');
    
    // Verifica o jsPsych core
    if (typeof jsPsych !== 'undefined') {
        console.log('✓ jsPsych core carregado');
    } else {
        console.error('✗ jsPsych core NÃO carregado');
    }
    
    // Verifica os plugins
    const plugins = [
        'jsPsychHtmlKeyboardResponse',
        'jsPsychHtmlButtonResponse',
        'jsPsychSurveyText',
        'jsPsychSurveyLikert',
        'jsPsychIatHtml'
    ];
    
    plugins.forEach(plugin => {
        if (typeof window[plugin] !== 'undefined') {
            console.log(`✓ Plugin ${plugin} carregado`);
        } else {
            console.error(`✗ Plugin ${plugin} NÃO carregado`);
        }
    });
    
    // Verifica a extensão WebGazer
    if (typeof jsPsychExtensionWebgazer !== 'undefined') {
        console.log('✓ Extensão WebGazer carregada');
    } else {
        console.error('✗ Extensão WebGazer NÃO carregada');
    }
    
    // Verifica os módulos personalizados
    const customModules = [
        'loadTexts',
        'segmentText',
        'selectRandomTexts',
        'shuffleArray',
        'implementSelfPacedReading',
        'implementEyeTracking',
        'implementIAT',
        'implementEvaluations',
        'createFinalQuestionnaire'
    ];
    
    customModules.forEach(module => {
        if (typeof window[module] !== 'undefined') {
            console.log(`✓ Módulo personalizado ${module} carregado`);
        } else {
            console.error(`✗ Módulo personalizado ${module} NÃO carregado`);
        }
    });
}

// Executa a verificação quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página carregada, iniciando depuração...');
    checkModulesLoaded();
});

