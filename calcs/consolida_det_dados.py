import json
import pandas as pd
import os
import glob
from typing import Dict, List, Any
from bs4 import BeautifulSoup

class ExperimentDataProcessor:
    def __init__(self, input_dir: str, output_file: str):
        self.input_dir = input_dir
        self.output_file = output_file
        self.all_data = []

    def load_json_files(self):
        """Carrega todos os arquivos JSON do diretório"""
        json_files = glob.glob(os.path.join(self.input_dir, "*.json"))
        json_files.extend(glob.glob(os.path.join(self.input_dir, "*.txt")))

        print(f"Procurando arquivos em: {self.input_dir}")
        print(f"Arquivos encontrados: {json_files}")

        data_files = []
        for file_path in json_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    data_files.append({
                        'file_path': file_path,
                        'file_name': os.path.basename(file_path),
                        'data': data
                    })
                    print(f"✓ Carregado: {os.path.basename(file_path)}")
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                print(f"✗ Erro ao carregar {file_path}: {e}")
                continue

        return data_files

    def extract_participant_info(self, data: List[Dict]) -> Dict[str, Any]:
        """Extrai informações básicas do participante"""
        participant_info = {
            'participant_id': '',
            'external_id': '',
            'consent_agreed': False,
            'consent_version': '',
            'consent_timestamp': '',
            'user_agent': '',
            'language': '',
            'screen_resolution': '',
            'idade': '',
            'genero': '',
            'escolaridade': '',
            'familiaridade_ia': '',
            'frequencia_ia': '',
            'confianca_identificacao': ''
        }

        for trial in data:
            if 'participant_id' in trial:
                participant_info['participant_id'] = trial.get('participant_id', '')
                participant_info['external_id'] = trial.get('external_id', '')
                participant_info['consent_agreed'] = trial.get('consent_agreed', False)
                participant_info['consent_version'] = trial.get('consent_version', '')
                participant_info['consent_timestamp'] = trial.get('consent_timestamp', '')
                participant_info['user_agent'] = trial.get('user_agent', '')
                participant_info['language'] = trial.get('language', '')

                screen_w = trial.get('screen_w', '')
                screen_h = trial.get('screen_h', '')
                participant_info['screen_resolution'] = f"{screen_w}x{screen_h}" if screen_w and screen_h else ''
                break

        return participant_info

    def extract_demographic_data(self, data: List[Dict], participant_info: Dict) -> Dict[str, Any]:
        """Extrai dados demográficos do participante"""
        demographic_data = {
            'idade': '',
            'genero': '',
            'escolaridade': '',
            'familiaridade_ia': '',
            'frequencia_ia': '',
            'confianca_identificacao': ''
        }

        for trial in data:
            task_type = trial.get('task', '')

            if task_type == 'demographic_questionnaire_age':
                response_data = trial.get('response', {})
                if isinstance(response_data, dict):
                    demographic_data['idade'] = response_data.get('idade', '')

            elif task_type == 'demographic_questionnaire_gender_education':
                response_data = trial.get('response', {})
                if isinstance(response_data, dict):
                    demographic_data['genero'] = response_data.get('genero', '')
                    demographic_data['escolaridade'] = response_data.get('escolaridade', '')

            elif task_type == 'ai_familiarity_questionnaire':
                response_data = trial.get('response', {})
                if isinstance(response_data, dict):
                    demographic_data['familiaridade_ia'] = response_data.get('familiaridade_ia', '')
                    demographic_data['frequencia_ia'] = response_data.get('frequencia_ia', '')
                    demographic_data['confianca_identificacao'] = response_data.get('confianca_identificacao', '')

        return demographic_data

    def extract_iat_data(self, data: List[Dict], participant_info: Dict) -> List[Dict]:
        """
        Extrai dados do IAT de um arquivo JSON individual
        """
        iat_trials = []

        # Mapeamento de fases para blocos do IAT
        phase_to_block = {
            'instruction_block_1': 1,  # Bloco 1: Prática - apenas textos (IA vs Humano)
            'instruction_block_2': 2,  # Bloco 2: Prática - apenas palavras (Positivo vs Negativo)
            'instruction_block_3': 3,  # Bloco 3: Prática combinada (IA+Positivo vs Humano+Negativo)
            'instruction_block_4': 4,  # Bloco 4: Teste combinado (IA+Positivo vs Humano+Negativo)
            'instruction_block_5': 5,  # Bloco 5: Prática - textos invertidos
            'instruction_block_6': 6,  # Bloco 6: Prática combinada invertida (Humano+Positivo vs IA+Negativo)
            'instruction_block_7': 7   # Bloco 7: Teste combinado invertido (Humano+Positivo vs IA+Negativo)
        }

        current_block = None

        for trial in data:
            # Identificar mudança de bloco pelas instruções
            if 'phase' in trial and trial['phase'] in phase_to_block:
                current_block = phase_to_block[trial['phase']]
                continue

            # Processar apenas trials do IAT (trial_type = 'iat-html')
            if (trial.get('trial_type') == 'iat-html' and
                    'rt' in trial and
                    'stimulus' in trial and
                    current_block is not None):

                # Extrair stimulus do HTML
                stimulus_html = trial['stimulus']
                soup = BeautifulSoup(stimulus_html, 'html.parser')
                stimulus_div = soup.find('div', class_='iat-stimulus')

                if stimulus_div:
                    stimulus_text = stimulus_div.get_text(strip=True)
                    # Limpar o texto - pegar apenas o início para categorizar
                    clean_stimulus = stimulus_text.split('…')[0] if '…' in stimulus_text else stimulus_text

                    # Determinar categoria do stimulus
                    category = self.categorize_stimulus(clean_stimulus)

                    # Garantir que rt seja float
                    rt_value = float(trial.get('rt', 0))

                    # Dados completos para análise
                    iat_trial = {
                        'id_participante': participant_info['participant_id'],
                        'bloco': current_block,
                        'trial_index': trial.get('trial_index', 0),
                        'stimulus': clean_stimulus,
                        'categoria': category,
                        'resposta': trial.get('response', ''),
                        'correta': trial.get('correct', False),
                        'react_time': rt_value,  # Já como float
                        'condicao': self.get_condition(current_block, category)
                    }

                    iat_trials.append(iat_trial)

        return iat_trials

    def categorize_stimulus(self, stimulus):
        """
        Categoriza o stimulus como 'ia_text', 'human_text', 'positive', ou 'negative'
        """
        stimulus_lower = stimulus.lower()

        # Palavras positivas
        positive_words = ['competente', 'inteligente', 'sábio', 'bom', 'agradável', 'alegre']
        # Palavras negativas
        negative_words = ['desagradável', 'ineficiente', 'tolo', 'leigo', 'ruim', 'triste']
        # Textos de IA (baseado nos exemplos fornecidos)
        ia_text_patterns = ['organização eficiente', 'sistema erp', 'sistema consiste', 'soluções']
        # Textos humanos (baseado nos exemplos fornecidos)
        human_text_patterns = ['cozinhas planejadas', 'item importantíssimo', 'preparação do terreno', 'escolha']

        if any(word in stimulus_lower for word in positive_words):
            return 'positive'
        elif any(word in stimulus_lower for word in negative_words):
            return 'negative'
        elif any(pattern in stimulus_lower for pattern in ia_text_patterns):
            return 'ia_text'
        elif any(pattern in stimulus_lower for pattern in human_text_patterns):
            return 'human_text'
        else:
            # Fallback: se não reconhecer, tenta inferir pelo conteúdo
            if any(word in stimulus_lower for word in ['ia', 'inteligência artificial', 'algoritmo']):
                return 'ia_text'
            else:
                return 'human_text'

    def get_condition(self, bloco, categoria):
        """
        Determina se o trial é congruente ou incongruente baseado no bloco e categoria
        """
        # Blocos 3 e 4: IA+Positivo (E) vs Humano+Negativo (I) - CONGRUENTE para IA+Positivo
        # Blocos 6 e 7: Humano+Positivo (E) vs IA+Negativo (I) - INCONGRUENTE para IA+Positivo

        if bloco in [3, 4]:
            return 'congruent' if categoria in ['ia_text', 'positive'] else 'incongruent'
        elif bloco in [6, 7]:
            return 'incongruent' if categoria in ['ia_text', 'positive'] else 'congruent'
        else:
            return 'practice'

    def calculate_d_score(self, iat_trials):
        """
        Calcula o D-score seguindo EXATAMENTE o roteiro passo a passo fornecido
        """
        if not iat_trials:
            return None

        df = pd.DataFrame(iat_trials)

        try:
            # PASSO 1: Usar os dados dos blocos 3, 4, 6 e 7 (blocos críticos)
            blocos_criticos = [3, 4, 6, 7]
            df_critico = df[df['bloco'].isin(blocos_criticos)].copy()

            if len(df_critico) == 0:
                return None

            # PASSO 2: Eliminar ensaios com TR superiores a 10000 ms
            df_filtrado = df_critico[df_critico['react_time'] <= 10000].copy()

            # PASSO 3: Eliminar participantes para quem 10% dos ensaios apresentem TR inferiores a 300ms
            tr_baixos_por_participante = df_filtrado[df_filtrado['react_time'] < 300].groupby('id_participante').size()
            total_ensaios_por_participante = df_filtrado.groupby('id_participante').size()
            porcentagem_tr_baixos = (tr_baixos_por_participante / total_ensaios_por_participante * 100).fillna(0)
            participantes_remover = porcentagem_tr_baixos[porcentagem_tr_baixos > 10].index
            df_final = df_filtrado[~df_filtrado['id_participante'].isin(participantes_remover)].copy()

            if len(df_final) == 0:
                return None

            # PASSO 4: Calcular desvio-padrão para blocos 3 e 6, e para blocos 4 e 7
            blocos_3_6 = df_final[df_final['bloco'].isin([3, 6])]
            blocos_4_7 = df_final[df_final['bloco'].isin([4, 7])]

            dp_3_6 = blocos_3_6['react_time'].std()
            dp_4_7 = blocos_4_7['react_time'].std()

            # PASSO 5: Calcular média dos TR para cada bloco
            medias_blocos = df_final.groupby('bloco')['react_time'].mean()

            # PASSO 6: Calcular diferenças entre blocos
            media_bloco_3 = medias_blocos.get(3, 0)
            media_bloco_6 = medias_blocos.get(6, 0)
            media_bloco_4 = medias_blocos.get(4, 0)
            media_bloco_7 = medias_blocos.get(7, 0)

            diferenca_3_6 = media_bloco_6 - media_bloco_3  # incongruente - congruente
            diferenca_4_7 = media_bloco_7 - media_bloco_4  # incongruente - congruente

            # PASSO 7: Dividir cada diferença pelo seu desvio-padrão associado
            quociente_3_6 = diferenca_3_6 / dp_3_6 if dp_3_6 != 0 else 0
            quociente_4_7 = diferenca_4_7 / dp_4_7 if dp_4_7 != 0 else 0

            # PASSO 8: Calcular média dos dois quocientes
            media_quocientes = (quociente_3_6 + quociente_4_7) / 2

            return media_quocientes

        except Exception as e:
            print(f"❌ Erro no cálculo do D-score: {e}")
            return None

    def process_file_data(self, data: List[Dict], participant_info: Dict) -> List[Dict]:
        """Processa todos os dados de um arquivo e combina por texto"""
        # Estrutura para armazenar dados por texto
        text_data = {}

        # Processa leitura automonitorada - AGORA CADA SEGMENTO INDIVIDUALMENTE
        for trial in data:
            if trial.get('task') == 'self_paced_reading':
                text_id = trial.get('text_id', '')
                segment_index = trial.get('segment_index', '')
                segment_content = trial.get('segment_content', '')
                reading_time = trial.get('rt', 0)

                # Cria uma chave única para cada segmento
                segment_key = f"{text_id}_segment_{segment_index}"

                if segment_key not in text_data:
                    text_data[segment_key] = {
                        'participant_id': participant_info['participant_id'],
                        'text_id': text_id,
                        'text_authorship': trial.get('text_authorship', ''),
                        'segment_index': segment_index,
                        'segment_content': segment_content,
                        'reading_time_segment': reading_time,
                        'source_file': participant_info.get('source_file', '')
                    }

        # Processa eye tracking
        for trial in data:
            if trial.get('task') == 'eye_tracking':
                text_id = trial.get('text_id', '')

                # Para cada segmento deste texto, adiciona os dados de eye tracking
                for segment_key in list(text_data.keys()):
                    if text_data[segment_key]['text_id'] == text_id:
                        text_data[segment_key]['number_of_regressions'] = trial.get('number_of_regressions', '')
                        text_data[segment_key]['number_of_fixations'] = trial.get('number_of_fixations', '')
                        text_data[segment_key]['total_reading_eye'] = trial.get('total_reading_time', '')
                        text_data[segment_key]['reading_time_per_word'] = trial.get('reading_time_per_word', '')
                        text_data[segment_key]['total_samples'] = trial.get('total_samples', '')

        # Processa avaliações subjetivas
        for trial in data:
            task_type = trial.get('task', '')
            text_id = trial.get('text_id', '')

            # Verifica se o trial tem text_id válido
            if not text_id:
                continue

            # Para cada segmento deste texto, adiciona as avaliações
            for segment_key in list(text_data.keys()):
                if text_data[segment_key]['text_id'] == text_id:
                    if task_type == 'text_evaluation':
                        response_data = trial.get('response', {})
                        if isinstance(response_data, dict):
                            text_data[segment_key]['naturalidade'] = response_data.get('naturalidade', '')
                            text_data[segment_key]['clareza'] = response_data.get('clareza', '')
                            text_data[segment_key]['compreensao'] = response_data.get('compreensao', '')

                    elif task_type == 'authorship_identification':
                        text_data[segment_key]['authorship_correct'] = trial.get('authorship_correct', '')

                    elif task_type == 'confidence_rating':
                        text_data[segment_key]['confidence_response'] = trial.get('response', '')

        return list(text_data.values())

    def process_file(self, file_info: Dict):
        """Processa um arquivo individual"""
        print(f"Processando arquivo: {file_info['file_name']}")

        data = file_info['data']
        participant_info = self.extract_participant_info(data)
        participant_info['source_file'] = file_info['file_name']

        # Processa dados demográficos
        demographic_data = self.extract_demographic_data(data, participant_info)

        # Processa dados do IAT
        iat_trials = self.extract_iat_data(data, participant_info)
        d_score = self.calculate_d_score(iat_trials)

        # Processa todos os dados combinados por texto
        file_data = self.process_file_data(data, participant_info)

        # Adiciona dados demográficos e D-score a cada linha de segmento
        for segment_entry in file_data:
            segment_entry['idade'] = demographic_data['idade']
            segment_entry['genero'] = demographic_data['genero']
            segment_entry['escolaridade'] = demographic_data['escolaridade']
            segment_entry['familiaridade_ia'] = demographic_data['familiaridade_ia']
            segment_entry['frequencia_ia'] = demographic_data['frequencia_ia']
            segment_entry['confianca_identificacao'] = demographic_data['confianca_identificacao']
            segment_entry['d_score'] = d_score if d_score is not None else ''

        # Combina os dados (filtra entradas vazias)
        valid_data = [entry for entry in file_data if entry.get('text_id')]
        self.all_data.extend(valid_data)

        print(f"  Segmentos processados: {len(valid_data)}")
        print(f"  D-score: {d_score if d_score is not None else 'N/A'}")
        print(f"  Idade: {demographic_data['idade']}")
        print(f"  Gênero: {demographic_data['genero']}")
        print(f"  Escolaridade: {demographic_data['escolaridade']}")
        print(f"  Familiaridade IA: {demographic_data['familiaridade_ia']}")
        print(f"  Frequência IA: {demographic_data['frequencia_ia']}")
        print(f"  Confiança Identificação: {demographic_data['confianca_identificacao']}")

    def save_to_csv(self):
        """Salva os dados processados em CSV com formato brasileiro"""
        if not self.all_data:
            print("Nenhum dado para salvar.")
            return

        df = pd.DataFrame(self.all_data)

        # Remove linhas completamente vazias (problema das linhas em branco)
        df = df.dropna(how='all')

        # Remove linhas onde participant_id está vazio
        df = df[df['participant_id'].notna() & (df['participant_id'] != '')]

        # Cria o diretório de saída se não existir
        output_dir = os.path.dirname(self.output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            print(f"✓ Diretório criado: {output_dir}")

        # Configura formato brasileiro (; como separador, , como decimal)
        df.to_csv(self.output_file, sep=';', decimal=',', index=False, encoding='utf-8')
        print(f"\n✓ Dados salvos em: {self.output_file}")
        print(f"✓ Total de registros: {len(df)}")
        print(f"✓ Colunas: {list(df.columns)}")

        # Mostra estatísticas básicas
        print(f"\nEstatísticas:")
        print(f"  Total de segmentos processados: {len(df)}")
        print(f"  Participantes únicos: {df['participant_id'].nunique()}")

    def run(self):
        """Executa o processamento completo"""
        print(f"Processando arquivos em: {self.input_dir}")

        files = self.load_json_files()
        print(f"Encontrados {len(files)} arquivos")

        if not files:
            print("Nenhum arquivo encontrado para processar!")
            return

        for file_info in files:
            self.process_file(file_info)

        self.save_to_csv()

# Exemplo de uso
if __name__ == "__main__":
    # Configurações
    input_directory = "/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data"  # Pasta com os arquivos JSON
    output_csv = "/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data/dados_detalhados.csv"

    # Executa o processamento
    processor = ExperimentDataProcessor(input_directory, output_csv)
    processor.run()