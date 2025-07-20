import pandas as pd
import json
import statsmodels.formula.api as smf

# Carregue seu dataset normalmente (como no seu script atual)
file_path = "resultado_1_completo.txt"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

try:
    data = [json.loads(line) for line in lines if line.strip().startswith("{")]
except Exception:
    file_content = "".join(lines)
    data = json.loads(file_content)

df = pd.DataFrame(data)

# Supondo que cada linha de self_paced_reading tem: reading_time_per_word, text_authorship, text_id, e participant_id (adicione se tiver!)
df_leitura = df[df["task"] == "self_paced_reading"].copy()

# Certifique-se que text_authorship, text_id, e participant_id existem
# Se não houver participant_id, crie um dummy para teste (mas o ideal é que cada pessoa tenha um identificador único!)
if "participant_id" not in df_leitura.columns:
    df_leitura["participant_id"] = 1  # Coloque o ID correto depois

# Converta as colunas relevantes para categóricas
df_leitura["text_authorship"] = df_leitura["text_authorship"].astype("category")
df_leitura["text_id"] = df_leitura["text_id"].astype("category")
df_leitura["participant_id"] = df_leitura["participant_id"].astype("category")

# Remova nulos da variável dependente
df_leitura = df_leitura.dropna(subset=["reading_time_per_word"])

# RODA O MODELO LINEAR MISTO
# Exemplo: tempo de leitura por palavra ~ autoria do texto + efeito aleatório de texto e participante
md = smf.mixedlm("reading_time_per_word ~ text_authorship",
                 df_leitura,
                 groups=df_leitura["participant_id"],
                 re_formula="~text_id") # ou apenas "1" para só intercepto aleatório
mdf = md.fit()

print(mdf.summary())