import pandas as pd
import json

# === 1. LEITURA DO ARQUIVO ===

file_path = "resultado_2_completo.txt"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

try:
    data = [json.loads(line) for line in lines if line.strip().startswith("{")]
except Exception:
    file_content = "".join(lines)
    data = json.loads(file_content)

df = pd.DataFrame(data)

# Garante identificador
if "participant_id" not in df.columns:
    df["participant_id"] = "unknown"

# === 2. TEMPO DE LEITURA (SELF-PACED READING) ===

df_leitura = df[df["task"] == "self_paced_reading"].copy()
df_leitura["participant_id"] = df_leitura.get("participant_id", "unknown")

for col in ["reading_time_per_word", "reading_time"]:
    if col in df_leitura.columns:
        df_leitura[col] = pd.to_numeric(df_leitura[col], errors="coerce")

# === 2a. EYE TRACKING (FIXAÇÕES e REGRESSÕES por texto) ===

# Filtra só os trials de eye tracking (texto inteiro)
df_eye = df[df["task"] == "eye_tracking"].copy()

# Converte se necessário
for col in ["number_of_fixations", "number_of_regressions"]:
    if col in df_eye.columns:
        df_eye[col] = pd.to_numeric(df_eye[col], errors="coerce")

eye_base = df_eye.groupby(
    ["participant_id", "text_id", "text_authorship"], as_index=False
).agg({
    "number_of_fixations": "mean",
    "number_of_regressions": "mean",
    "total_reading_time": "sum",  # ou "sum", se preferir o total
    "reading_time_per_word": "mean"
})

# === 4. JULGAMENTOS SUBJETIVOS ===

for col in ["naturalidade", "clareza", "compreensao"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

df_julgamentos = df.dropna(subset=["naturalidade", "clareza", "compreensao"], how="all")

# === 5. TABELA INTEGRADA: cruzando tudo por participante, texto, autoria e segmento ===

# Agrupa leitura (inclui tudo que puder)
leitura_base = df_leitura.groupby(
    ["participant_id", "text_id", "text_authorship", "segment_index"], as_index=False
).agg({
    "reading_time_per_word": "mean",
    "reading_time": "sum",
    "number_of_fixations": "mean",
    "number_of_regressions": "mean"
})

# Agrupa julgamentos subjetivos (pega a nota média para cada texto/participante)
julg_base = df_julgamentos.groupby(
    ["participant_id", "text_id", "text_authorship"], as_index=False
).agg({
    "naturalidade": "mean",
    "clareza": "mean",
    "compreensao": "mean"
})

# Faz merge (join) das tabelas
tabela_geral = pd.merge(leitura_base, julg_base, how="left",
                        on=["participant_id", "text_id", "text_authorship"])

# Acrescenta acurácia de autoria se disponível
if "authorship_correct" in df.columns:
    autoria_base = df.groupby(
        ["participant_id", "text_id", "text_authorship"], as_index=False
    )["authorship_correct"].first()
    tabela_geral = pd.merge(tabela_geral, autoria_base, how="left",
                            on=["participant_id", "text_id", "text_authorship"])


# Extrai dados demográficos do campo 'response'
def extrai_demograficos(df):
    # Filtra as linhas do questionário demográfico
    df_age = df[df["task"] == "demographic_questionnaire_age"].copy()
    df_genesc = df[df["task"] == "demographic_questionnaire_gender_education"].copy()

    # Extrai idade
    df_age["idade"] = df_age["response"].apply(lambda x: x.get("idade") if isinstance(x, dict) else None)
    # Extrai genero e escolaridade
    df_genesc["genero"] = df_genesc["response"].apply(lambda x: x.get("genero") if isinstance(x, dict) else None)
    df_genesc["escolaridade"] = df_genesc["response"].apply(
        lambda x: x.get("escolaridade") if isinstance(x, dict) else None)

    # Junta tudo por participant_id
    demog = pd.merge(
        df_age[["participant_id", "idade"]],
        df_genesc[["participant_id", "genero", "escolaridade"]],
        how="outer", on="participant_id"
    )
    return demog


# Extraia os dados demográficos
demog_base = extrai_demograficos(df)
print("\nDemográficos encontrados:\n", demog_base)

# Agora sim, faça merge desses dados com a tabela final:
tabela_geral = pd.merge(tabela_geral, demog_base, how="left", on="participant_id")

# === Calcula e adiciona D-score do IAT por participante ===
def extract_block_from_stimulus(stimulus):
    if isinstance(stimulus, str):
        if "Texto Humano ou Positivo" in stimulus:
            return "A"
        elif "Texto Humano ou Negativo" in stimulus:
            return "B"
    return None

df_iat = df[df["trial_type"].str.contains("iat", na=False)].copy()
df_iat["participant_id"] = df_iat.get("participant_id", "unknown")
df_iat = df_iat[df_iat["rt"].astype(float) >= 300]
df_iat["block"] = df_iat["stimulus"].apply(extract_block_from_stimulus)

iat_scores = []
for pid, group in df_iat.groupby("participant_id"):
    means = group.groupby("block")["rt"].mean()
    stds = group.groupby("block")["rt"].std()
    if "A" in means and "B" in means and stds.mean() > 0:
        d_score = (means["B"] - means["A"]) / stds.mean()
        iat_scores.append({
            "participant_id": pid,
            "d_score": d_score,
            "mean_A": means.get("A", float('nan')),
            "mean_B": means.get("B", float('nan'))
        })
df_iat_scores = pd.DataFrame(iat_scores)

if not df_iat_scores.empty:
    tabela_geral = pd.merge(tabela_geral, df_iat_scores[["participant_id", "d_score"]], how="left", on="participant_id")

# Faz merge das métricas de eye tracking na tabela geral
tabela_geral = pd.merge(
    tabela_geral, eye_base,
    how="left",
    on=["participant_id", "text_id", "text_authorship"]
)

# Ordena por participante e texto
tabela_geral = tabela_geral.sort_values(["participant_id", "text_id", "segment_index"])

# Exporta final
tabela_geral.to_csv("tabela_integrada_todos_os_dados.csv", index=False)
print("\nTabela integrada salva como tabela_integrada_todos_os_dados.csv")
print(tabela_geral.head(10))
