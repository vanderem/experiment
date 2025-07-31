import os
import glob
import pandas as pd
import json

# === 0. CONFIGURAÇÃO DO DIRETÓRIO E COLETA DOS ARQUIVOS ===
directory = "/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data"  # ajuste para a pasta onde estão os .json
file_pattern = os.path.join(directory, "*.json")
json_files = glob.glob(file_pattern)

all_records = []
for file_path in json_files:
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    try:
        data = [json.loads(line) for line in lines if line.strip().startswith("{")]
    except Exception:
        content = "".join(lines)
        data = json.loads(content)

    # opcional: extrair participant_id do nome do arquivo, se não vier no JSON
    base = os.path.splitext(os.path.basename(file_path))[0]
    fallback_id = base.replace("dados_participante_", "")
    for rec in data:
        if "participant_id" not in rec:
            rec["participant_id"] = fallback_id

    all_records.extend(data)

# Cria o DataFrame com todos os dados
df = pd.DataFrame(all_records)

# Garante existência da coluna 'task' para evitar KeyError
if "task" not in df.columns:
    df["task"] = None


# Garante existência das colunas necessárias para agrupamentos
for col in ["text_id", "text_authorship", "segment_index"]:
    if col not in df.columns:
        df[col] = None

# Garante existência da coluna 'response' para evitar KeyError
if "response" not in df.columns:
    df["response"] = None

# Garante existência das colunas para IAT e evita KeyError
for col in ["trial_type", "rt", "stimulus"]:
    if col not in df.columns:
        df[col] = None

# Garante identificador mínimo
if "participant_id" not in df.columns:
    df["participant_id"] = "unknown"

# === 1. SELF-PACED READING ===
df_leitura = df[df["task"] == "self_paced_reading"].copy()
for col in ["reading_time_per_word", "reading_time"]:
    if col in df_leitura.columns:
        df_leitura[col] = pd.to_numeric(df_leitura[col], errors="coerce")

# Garante existência das colunas para agrupamento de leitura por segmento
for col in ["reading_time_per_word", "reading_time", "number_of_fixations", "number_of_regressions"]:
    if col not in df_leitura.columns:
        df_leitura[col] = pd.NA

# === 2. EYE TRACKING ===
df_eye = df[df["task"] == "eye_tracking"].copy()
# Garante existência das colunas de eye-tracking para evitar KeyError
for col in ["number_of_fixations", "number_of_regressions", "total_reading_time", "reading_time_per_word"]:
    if col not in df_eye.columns:
        df_eye[col] = pd.NA
# Converte tipos numéricos se já existentes
for col in ["number_of_fixations", "number_of_regressions"]:
    df_eye[col] = pd.to_numeric(df_eye[col], errors="coerce")

eye_base = df_eye.groupby(
    ["participant_id", "text_id", "text_authorship"], as_index=False
).agg({
    "number_of_fixations": "sum",
    "number_of_regressions": "sum",
    "total_reading_time": "sum",
    "reading_time_per_word": "mean"
})

# === 3. JULGAMENTOS SUBJETIVOS ===
# Garante existência das colunas de julgamentos subjetivos para evitar KeyError
for col in ["naturalidade", "clareza", "compreensao"]:
    if col not in df.columns:
        df[col] = pd.NA
for col in ["naturalidade", "clareza", "compreensao"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")
df_julg = df.dropna(subset=["naturalidade", "clareza", "compreensao"], how="all")

# === 4. AGRUPAMENTOS E MERGES ===
# leitura por segmento
leitura_base = df_leitura.groupby(
    ["participant_id", "text_id", "text_authorship", "segment_index"], as_index=False
).agg({
    "reading_time_per_word": "mean",
    "reading_time": "sum",
    "number_of_fixations": "sum",
    "number_of_regressions": "sum"
})

# julgamentos por texto
julg_base = df_julg.groupby(
    ["participant_id", "text_id", "text_authorship"], as_index=False
).agg({
    "naturalidade": "mean",
    "clareza": "mean",
    "compreensao": "mean"
})

# merge principal
tabela_geral = pd.merge(leitura_base, julg_base,
                        how="left",
                        on=["participant_id", "text_id", "text_authorship"])

# acurácia de autoria, se existir
if "authorship_correct" in df.columns:
    autoria_base = df.groupby(
        ["participant_id", "text_id", "text_authorship"], as_index=False
    )["authorship_correct"].first()
    tabela_geral = tabela_geral.merge(autoria_base,
                                      how="left",
                                      on=["participant_id", "text_id", "text_authorship"])

# === 5. DEMOGRÁFICOS ===
def extrai_demograficos(df):
    df_age = df[df["task"] == "demographic_questionnaire_age"].copy()
    df_genesc = df[df["task"] == "demographic_questionnaire_gender_education"].copy()

    df_age["idade"] = df_age["response"].apply(lambda x: x.get("idade") if isinstance(x, dict) else None)
    df_genesc["genero"] = df_genesc["response"].apply(lambda x: x.get("genero") if isinstance(x, dict) else None)
    df_genesc["escolaridade"] = df_genesc["response"].apply(lambda x: x.get("escolaridade") if isinstance(x, dict) else None)

    demog = pd.merge(
        df_age[["participant_id", "idade"]],
        df_genesc[["participant_id", "genero", "escolaridade"]],
        how="outer",
        on="participant_id"
    )
    return demog

demog_base = extrai_demograficos(df)
tabela_geral = tabela_geral.merge(demog_base, how="left", on="participant_id")

# === 6. IAT (D-SCORE) ===
def extract_block_from_stimulus(stimulus):
    if isinstance(stimulus, str):
        if "Texto Humano ou Positivo" in stimulus:
            return "A"
        elif "Texto Humano ou Negativo" in stimulus:
            return "B"
    return None

df_iat = df[df["trial_type"].str.contains("iat", na=False)].copy()
df_iat = df_iat[df_iat["rt"].astype(float) >= 300]
df_iat["block"] = df_iat["stimulus"].apply(extract_block_from_stimulus)

iat_scores = []
for pid, grp in df_iat.groupby("participant_id"):
    means = grp.groupby("block")["rt"].mean()
    stds = grp.groupby("block")["rt"].std()
    if {"A", "B"}.issubset(means.index) and stds.mean() > 0:
        d_score = (means["B"] - means["A"]) / stds.mean()
        iat_scores.append({
            "participant_id": pid,
            "d_score": d_score
        })

df_iat_scores = pd.DataFrame(iat_scores)
if not df_iat_scores.empty:
    tabela_geral = tabela_geral.merge(df_iat_scores, how="left", on="participant_id")

# merge métricas de eye tracking
tabela_geral = tabela_geral.merge(
    eye_base,
    how="left",
    on=["participant_id", "text_id", "text_authorship"]
)

# ordena e exporta
tabela_geral = tabela_geral.sort_values(
    ["participant_id", "text_id", "segment_index"]
)
tabela_geral.to_csv(
    "tabela_integrada_todos_participantes.csv",
    index=False,
    sep=';',
    decimal=','
)

print("CSV salvo como 'tabela_integrada_dados.csv'")