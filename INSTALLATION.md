# Guia de Instalação e Configuração

Este documento fornece instruções detalhadas para instalar, configurar e executar o experimento "Sintonia Invisível: Processamento e Julgamento de Textos Algorítmicos" desenvolvido com jsPsych.

## Índice

1. [Requisitos do Sistema](#requisitos-do-sistema)
2. [Instalação](#instalação)
   - [Método 1: Usando CDN (Recomendado)](#método-1-usando-cdn-recomendado)
   - [Método 2: Instalação Local](#método-2-instalação-local)
3. [Configuração do Servidor](#configuração-do-servidor)
   - [Servidor Local para Desenvolvimento](#servidor-local-para-desenvolvimento)
   - [Implantação em Servidor de Produção](#implantação-em-servidor-de-produção)
4. [Verificação da Instalação](#verificação-da-instalação)
5. [Solução de Problemas Comuns](#solução-de-problemas-comuns)

## Requisitos do Sistema

### Hardware
- Computador com processador moderno (Intel Core i5/AMD Ryzen 5 ou superior recomendado)
- Mínimo de 4GB de RAM (8GB recomendado)
- Webcam de boa qualidade (para o componente de eye tracking)
- Conexão estável à internet

### Software
- **Sistema Operacional:** Windows 10/11, macOS 10.15+, ou Linux
- **Navegadores Suportados:**
  - Google Chrome 88+
  - Mozilla Firefox 85+
  - Microsoft Edge 88+
  - Safari 14+
- **Ambiente de Desenvolvimento:**
  - Node.js 14.0+ (para instalação local)
  - npm 6.0+ ou yarn 1.22+ (para gerenciamento de pacotes)

## Instalação

### Método 1: Usando CDN (Recomendado)

Este método não requer instalação local das bibliotecas jsPsych, pois utiliza as versões hospedadas em CDN.

1. Clone ou baixe este repositório:
```bash
git clone https://github.com/seu-usuario/jspsych-experiment.git
cd jspsych-experiment
```

2. Não é necessário instalar dependências adicionais, pois o arquivo `index.html` já está configurado para carregar as bibliotecas jsPsych via CDN.

### Método 2: Instalação Local

Este método instala todas as dependências localmente, o que é útil para desenvolvimento ou quando não há acesso à internet confiável durante a execução do experimento.

1. Clone ou baixe este repositório:
```bash
git clone https://github.com/seu-usuario/jspsych-experiment.git
cd jspsych-experiment
```

2. Instale as dependências do jsPsych:
```bash
npm install
```

3. Edite o arquivo `index.html` para usar as bibliotecas locais em vez das versões CDN:
   - Comente ou remova as linhas que carregam os scripts via CDN
   - Descomente ou adicione as linhas que carregam os scripts locais

Exemplo:
```html
<!-- Comentar ou remover estas linhas -->
<!--
<script src="https://unpkg.com/jspsych@7.3.3"></script>
<link href="https://unpkg.com/jspsych@7.3.3/css/jspsych.css" rel="stylesheet" type="text/css">
-->

<!-- Descomentar ou adicionar estas linhas -->
<script src="node_modules/jspsych/dist/jspsych.js"></script>
<link href="node_modules/jspsych/dist/jspsych.css" rel="stylesheet" type="text/css">
```

## Configuração do Servidor

### Servidor Local para Desenvolvimento

Para executar o experimento localmente durante o desenvolvimento:

1. Usando Node.js e http-server (recomendado):
```bash
# Instalar http-server globalmente, se ainda não estiver instalado
npm install -g http-server

# Iniciar o servidor na pasta do projeto
cd jspsych-experiment
http-server -p 8080
```

2. Usando Python:
```bash
# Python 3
cd jspsych-experiment
python -m http.server 8080

# Python 2
cd jspsych-experiment
python -m SimpleHTTPServer 8080
```

3. Acesse o experimento em seu navegador:
```
http://localhost:8080
```

### Implantação em Servidor de Produção

Para implantar o experimento em um servidor de produção:

1. **Servidor Web Tradicional (Apache, Nginx):**
   - Copie todos os arquivos do projeto para o diretório raiz do seu servidor web
   - Configure o servidor para servir arquivos estáticos
   - Certifique-se de que o servidor esteja configurado para HTTPS (necessário para o eye tracking)

2. **Serviços de Hospedagem Estática:**
   - GitHub Pages: Envie o repositório para o GitHub e ative o GitHub Pages
   - Netlify: Conecte seu repositório ou faça upload dos arquivos
   - Vercel: Conecte seu repositório para implantação automática

3. **Configuração para Armazenamento de Dados:**
   - Para armazenar dados localmente (apenas para testes): Nenhuma configuração adicional necessária
   - Para armazenar dados em um servidor:
     - Configure um endpoint de API para receber os dados
     - Atualize a função `saveData()` no arquivo `js/main.js` com o URL do seu endpoint

## Verificação da Instalação

Para verificar se a instalação está funcionando corretamente:

1. Acesse o experimento no navegador (local ou remoto)
2. Você deve ver a tela de boas-vindas do experimento
3. Verifique o console do navegador (F12 > Console) para garantir que não há erros
4. Execute o teste básico clicando no botão "Continuar" na tela inicial
5. Se o teste avançar para a próxima tela, a instalação básica está funcionando

## Solução de Problemas Comuns

### Problema: Erro "jsPsych is not defined"
**Solução:** Verifique se os scripts do jsPsych estão sendo carregados corretamente. Abra o console do navegador (F12) e verifique se há erros 404 ao carregar os scripts. Se estiver usando CDN, verifique sua conexão com a internet. Se estiver usando instalação local, verifique se as dependências foram instaladas corretamente.

### Problema: Eye tracking não funciona
**Solução:** 
- Verifique se o navegador tem permissão para acessar a webcam
- Certifique-se de que está usando HTTPS (necessário para acesso à webcam)
- Verifique se a extensão WebGazer está sendo carregada corretamente
- Teste em um ambiente bem iluminado e com a webcam posicionada corretamente

### Problema: Experimento trava ou apresenta comportamento inesperado
**Solução:**
- Limpe o cache do navegador e recarregue a página
- Tente um navegador diferente
- Verifique o console do navegador para erros específicos
- Aumente a memória disponível para o navegador fechando outras aplicações

### Problema: Dados não estão sendo salvos
**Solução:**
- Se estiver salvando localmente, verifique as permissões da pasta `data/`
- Se estiver salvando em um servidor, verifique a configuração do endpoint e as políticas CORS
- Verifique o console do navegador para erros relacionados ao salvamento de dados

---

Para problemas não listados aqui, por favor, abra uma issue no repositório do projeto ou entre em contato com o desenvolvedor.
