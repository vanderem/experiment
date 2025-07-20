# Resumo do Projeto

## Sintonia Invisível: Processamento e Julgamento de Textos Algorítmicos

### Visão Geral

Este projeto implementa um experimento completo em jsPsych para investigar como as pessoas processam e avaliam textos produzidos por humanos versus textos gerados por algoritmos de inteligência artificial. O experimento combina várias metodologias experimentais da psicologia cognitiva, incluindo:

1. **Leitura Automonitorada**: Apresentação segmentada de textos para medir tempos de leitura
2. **Eye Tracking**: Rastreamento ocular para analisar padrões de fixação durante a leitura
3. **Teste de Associação Implícita (IAT)**: Medição de associações implícitas entre textos e atributos
4. **Avaliações Subjetivas**: Julgamentos explícitos sobre naturalidade, clareza e autoria dos textos

### Estrutura do Projeto

O projeto está organizado em uma estrutura modular, com componentes separados para cada metodologia experimental:

```
jspsych-experiment/
├── css/                      # Estilos do experimento
├── js/                       # Scripts JavaScript
│   ├── texts.js              # Carregamento e manipulação de textos
│   ├── self-paced-reading.js # Leitura automonitorada
│   ├── eye-tracking.js       # Rastreamento ocular
│   ├── iat.js                # Teste de Associação Implícita
│   ├── evaluation.js         # Avaliações subjetivas
│   └── main.js               # Integração de todos os componentes
├── texts/                    # Corpus de textos
├── assets/                   # Recursos adicionais
├── data/                     # Armazenamento de dados
└── docs/                     # Documentação
```

### Principais Funcionalidades

- **Carregamento Dinâmico de Textos**: Suporte para carregar textos de arquivos JSON externos
- **Segmentação Flexível**: Opções para segmentar textos por frases, orações ou palavras
- **Calibração de Eye Tracking**: Sistema de calibração e validação para rastreamento ocular via webcam
- **IAT Configurável**: Estrutura de blocos e estímulos personalizáveis para o IAT
- **Coleta de Dados Abrangente**: Registro detalhado de tempos de resposta, movimentos oculares e avaliações
- **Interface Responsiva**: Design adaptável para diferentes tamanhos de tela
- **Suporte a CDN**: Opção para carregar bibliotecas via CDN ou localmente

### Tecnologias Utilizadas

- **jsPsych 7.3.3**: Framework principal para experimentos comportamentais online
- **WebGazer.js**: Biblioteca para rastreamento ocular via webcam
- **HTML5/CSS3/JavaScript**: Tecnologias web padrão para interface e interatividade
- **JSON**: Formato para armazenamento e troca de dados

### Documentação

O projeto inclui documentação abrangente para facilitar o uso, personalização e extensão:

1. **README.md**: Visão geral do projeto e instruções básicas
2. **INSTALLATION.md**: Guia detalhado de instalação e configuração
3. **CUSTOMIZATION.md**: Instruções para personalizar cada componente do experimento
4. **SUMMARY.md**: Este resumo executivo do projeto

### Conclusão

Este projeto fornece uma implementação completa e flexível de um experimento de psicologia cognitiva para investigar o processamento e avaliação de textos. A estrutura modular permite fácil personalização e extensão para atender a diferentes necessidades de pesquisa.

O código foi desenvolvido seguindo boas práticas de programação e está bem documentado para facilitar a manutenção e adaptação. Todos os componentes foram testados e funcionam conforme esperado.

---

