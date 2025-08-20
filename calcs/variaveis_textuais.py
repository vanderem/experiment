import spacy
import pyphen
import re
import subprocess
import sys

def baixar_modelo_spacy(idioma):
    """Baixa o modelo de idioma do spaCy se necessário"""
    modelo = f"{idioma}_core_news_sm"
    try:
        spacy.load(modelo)
        return True
    except OSError:
        print(f"Baixando modelo {modelo}...")
        try:
            subprocess.check_call([sys.executable, "-m", "spacy", "download", modelo])
            return True
        except subprocess.CalledProcessError:
            print(f"Falha ao baixar o modelo {modelo}")
            return False

def extrair_metricas_texto(texto, idioma='pt'):
    """
    Extrai métricas de equilíbrio textual de um texto em português ou espanhol

    Parâmetros:
        texto (str): Texto a ser analisado
        idioma (str): 'pt' para português ou 'es' para espanhol (padrão: 'pt')

    Retorna:
        dict: Dicionário com todas as métricas solicitadas ou None em caso de erro
    """
    # Verificar e baixar modelo se necessário
    if not baixar_modelo_spacy(idioma):
        return None

    # Carregar modelo de linguagem
    try:
        if idioma == 'pt':
            nlp = spacy.load("pt_core_news_sm")
        elif idioma == 'es':
            nlp = spacy.load("es_core_news_sm")
        else:
            print("Idioma não suportado. Use 'pt' ou 'es'")
            return None
    except Exception as e:
        print(f"Erro ao carregar modelo: {e}")
        return None

    # Processar texto com spaCy
    doc = nlp(texto)

    # Inicializar contador de sílabas
    # Para português, usamos 'pt_BR' (Brasil) ou 'pt_PT' (Portugal)
    try:
        dic = pyphen.Pyphen(lang='pt_BR')
    except:
        try:
            dic = pyphen.Pyphen(lang='pt_PT')
        except:
            dic = pyphen.Pyphen(lang='pt')  # Tentar código genérico

    # 1. Número de palavras (excluindo pontuação e espaços)
    palavras = [token for token in doc if not token.is_punct and not token.is_space]
    num_palavras = len(palavras)

    # 2. Número de oracoes (orações)
    num_oracoes = len(list(doc.sents))

    # 3. Número de parágrafos
    paragrafos = [p.strip() for p in re.split(r'\n\s*\n', texto) if p.strip()]
    num_paragrafos = len(paragrafos)

    # 4. Palavras por oração
    palavras_por_oracao = num_palavras / num_oracoes if num_oracoes > 0 else 0

    # 5. Sílabas por palavra
    total_silabas = 0
    for token in palavras:
        if token.is_alpha:
            # Obter a palavra com sílabas separadas por hífen
            palavra_com_hifen = dic.inserted(token.text.lower())
            # Contar as sílabas: número de hífens + 1
            num_silabas = palavra_com_hifen.count('-') + 1
            total_silabas += num_silabas

    silabas_por_palavra = total_silabas / num_palavras if num_palavras > 0 else 0

    # 7-11. Contagem de classes gramaticais
    num_verbos = sum(1 for token in palavras if token.pos_ == 'VERB')
    num_substantivos = sum(1 for token in palavras if token.pos_ == 'NOUN')
    num_adjetivos = sum(1 for token in palavras if token.pos_ == 'ADJ')
    num_adverbios = sum(1 for token in palavras if token.pos_ == 'ADV')
    num_pronomes = sum(1 for token in palavras if token.pos_ == 'PRON')

    return {
        "número de palavras": num_palavras,
        "número de orações": num_oracoes,
        "número de parágrafos": num_paragrafos,
        "palavras por oração": palavras_por_oracao,
        "sílabas por palavra": silabas_por_palavra,
        "número de verbos": num_verbos,
        "número de substantivos": num_substantivos,
        "número de adjetivos": num_adjetivos,
        "número de advérbios": num_adverbios,
        "número de pronomes": num_pronomes
    }

# usando
if __name__ == "__main__":
    # Texto para análise
    texto_exemplo = """
No silêncio noturno, a lua sorri.
O vento murmura canções suaves.
As árvores guardam segredos antigos.
Os rios seguem caminhos eternos.
Uma estrela brilha, tão distante.
O horizonte desperta sonhos ocultos.
Flores descansam sob sombras frágeis.
O coração pulsa com desejo.
A memória cria imagens delicadas.
O tempo flui, mas permanece.
A esperança cresce, mesmo discreta.
O olhar procura sentido profundo.
A palavra toca mundos invisíveis.
O instante se dissolve lentamente.
E a vida renasce, sempre fiel.    """

    # Extrair métricas
    metricas = extrair_metricas_texto(texto_exemplo, idioma='pt')

    # Verificar se as métricas foram extraídas com sucesso
    if metricas is not None:
        # Exibir resultados
        for chave, valor in metricas.items():
            print(f"{chave}: {valor:.2f}" if isinstance(valor, float) else f"{chave}: {valor}")
    else:
        print("Não foi possível extrair as métricas. Verifique a instalação dos modelos do spaCy.")