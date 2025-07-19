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

# Garante a presença do identificador do participante
if "participant_id" not in df.columns:
    df["participant_id"] = "unknown"

# === 2. TEMPO DE LEITURA (SELF-PACED READING) ===

df_leitura = df[df["task"] == "self_paced_reading"].copy()
df_leitura["participant_id"] = df_leitura.get("participant_id", "unknown")

for col in ["reading_time_per_word", "reading_time"]:
    if col in df_leitura.columns:
        df_leitura[col] = pd.to_numeric(df_leitura[col], errors="coerce")

# Tempo de leitura médio por autoria, por texto, por participante
tempo_leitura_authorship = df_leitura.groupby(["participant_id", "text_authorship"])["reading_time_per_word"].agg(["mean", "std", "count"])
tempo_leitura_texto = df_leitura.groupby(["participant_id", "text_id", "text_authorship"])["reading_time_per_word"].agg(["mean", "std", "count"])

print("Tempo de leitura por autoria e participante:")
print(tempo_leitura_authorship)
print("\nTempo de leitura por texto, autoria e participante:")
print(tempo_leitura_texto)

# Tempo total de leitura por texto (opcional, se existir reading_time)
if "reading_time" in df_leitura.columns:
    tempo_leitura_total = df_leitura.groupby(["participant_id", "text_id", "text_authorship"])["reading_time"].sum().reset_index()
    print("\nTempo total de leitura por texto (ms):")
    print(tempo_leitura_total)
    tempo_leitura_total.to_csv("leitura_total_por_texto.csv", index=False)

# === 3. EYE TRACKING (FIXAÇÕES) ===

if "number_of_fixations" in df.columns:
    fixacoes = df.groupby(["participant_id", "text_authorship"])["number_of_fixations"].agg(["mean", "std", "count"])
    print("\nFixações por autoria e participante:")
    print(fixacoes)
    fixacoes.to_csv("fixacoes.csv")
else:
    print("\nNenhum dado de fixação disponível.")

# === 3b. EYE TRACKING (REGRESSÕES) ===

if "number_of_regressions" in df.columns:
    regressoes = df.groupby(["participant_id", "text_authorship"])["number_of_regressions"].agg(["mean", "std", "count"])
    print("\nRegressões por autoria e participante:")
    print(regressoes)
    regressoes_texto = df.groupby(["participant_id", "text_id", "text_authorship"])["number_of_regressions"].agg(["mean", "std", "count"])
    print("\nRegressões por texto, autoria e participante:")
    print(regressoes_texto)
    regressoes.to_csv("regressoes_authorship.csv")
    regressoes_texto.to_csv("regressoes_texto.csv")
else:
    print("\nNenhum dado de regressão disponível.")

# === 4. JULGAMENTOS SUBJETIVOS ===

for col in ["naturalidade", "clareza", "compreensao"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")
df_julgamentos = df.dropna(subset=["naturalidade", "clareza", "compreensao"], how="all")
julgamentos = df_julgamentos.groupby(["participant_id", "text_authorship"])[["naturalidade", "clareza", "compreensao"]].agg(["mean", "std", "count"])
print("\nJulgmentos subjetivos por autoria e participante:")
print(julgamentos)
# Também exporta linha a linha para cruzamentos posteriores
df_julgamentos[["participant_id", "text_id", "text_authorship", "naturalidade", "clareza", "compreensao"]].to_csv("julgamentos_linha_participante.csv", index=False)
julgamentos.to_csv("julgamentos.csv")

# === 5. ACURÁCIA DE AUTORIA ===

if "authorship_correct" in df.columns:
    acuracia_autoria = df.groupby(["participant_id", "text_authorship"])["authorship_correct"].value_counts(dropna=False)
    print("\nAcurácia na identificação de autoria por participante:")
    print(acuracia_autoria)
    acuracia_autoria.to_csv("acuracia_autoria.csv")
else:
    print("\nNenhum dado de acurácia de autoria disponível.")

# === 6. IAT – TESTE DE ASSOCIAÇÃO IMPLÍCITA (D-SCORE) ===

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

# Calcula D-score por participante
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
print("\nD-scores do IAT por participante:")
print(df_iat_scores)
df_iat_scores.to_csv("iat_scores.csv", index=False)

# === Exporta dados demográficos (caso existam) ===
demograficos = [col for col in df.columns if col in ["participant_id", "idade", "genero", "escolaridade"]]
if demograficos and "participant_id" in demograficos:
    df[demograficos].drop_duplicates().to_csv("dados_demograficos.csv", index=False)

print("\nTabelas salvas como CSV.")

# === FIM ===