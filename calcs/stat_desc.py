# Biblioteca para mediação
# import pingouin as pg
import pandas as pd
from scipy import stats
from scipy.stats import wilcoxon
import matplotlib.pyplot as plt
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

# 1) Ler sem header e detectar automaticamente a linha do cabeçalho
import numpy as np

df_raw = pd.read_excel('/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data/dados_consolidados.xlsx', header=None)

# Heurística para detectar a linha de cabeçalho entre as primeiras 10 linhas
keywords = [
    'autoria', 'author', 'texto', 'text', 'participant', 'participante', 'id',
    'reading', 'tempo', 'naturalidade', 'clareza', 'compreensao',
    'd_score', 'fixations', 'regressions', 'total'
]

best_row = 0
best_score = -1
max_check = min(10, len(df_raw))
for r in range(max_check):
    row_vals = df_raw.iloc[r].astype(str).str.lower().fillna('')
    # pontuar por presença de palavras-chave
    kw_hits = sum(any(k in cell for k in keywords) for cell in row_vals)
    # penalizar linhas "numéricas demais"
    non_numeric_ratio = np.mean(~row_vals.str.match(r'^-?\d+[\.,]?\d*$'))
    score = kw_hits + non_numeric_ratio  # simples: mais palavras-chave e menos numérica
    if score > best_score:
        best_score = score
        best_row = r

header = df_raw.iloc[best_row].tolist()
df = df_raw[best_row+1:].copy()

# Aplicar header
df.columns = header

# Remover colunas sem nome e normalizar nomes das colunas
df = df[df.columns[df.columns.notna()]]
# Normalização: trim, lower, espaços -> underscore, remover caracteres não alfanuméricos
df.columns = (
    pd.Series(df.columns)
      .astype(str)
      .str.strip()
      .str.lower()
      .str.replace(r"\s+", "_", regex=True)
      .str.replace(r"[^0-9a-zA-Z_]+", "", regex=True)
)

df = df.reset_index(drop=True)

# Tentar mapear variações comuns de nomes para os obrigatórios
rename_map = {}
for col in list(df.columns):
    if col in ["autoria_texto", "text_author", "author_type", "authorship", "textautor", "texto_autoria", "autoria", "tipo_autoria", "author"]:
        rename_map[col] = "text_authorship"
    if col in ["participant", "participantid", "id_participante", "idparticipante", "id_participant", "id", "prolific_id", "respondentid", "respondente_id"]:
        rename_map[col] = "participant_id"
if rename_map:
    df = df.rename(columns=rename_map)

# ===== Tentativa de derivação de colunas obrigatórias =====
# Se existir coluna 'ai' com flags, derivar text_authorship
if 'text_authorship' not in df.columns:
    for cand in ['ai', 'is_ai', 'modelo', 'gerado_por_ai']:
        if cand in df.columns:
            val = df[cand].astype(str).str.lower().str.strip()
            df['text_authorship'] = np.where(val.isin(['1','true','sim','ai','modelo','gerado','yes']), 'AI', 'human')
            break

# Se ainda não houver participant_id, escolher coluna com alta unicidade como ID
if 'participant_id' not in df.columns:
    candidate_ids = []
    for col in df.columns:
        # pular colunas óbvias que não são ID
        if col in ['text_authorship','ai','is_ai','naturalidade','clareza','compreensao','d_score','reading_time','reading_time_per_word_x','reading_time_per_word_y','number_of_fixations_y','number_of_regressions_y','total_reading_time']:
            continue
        series = df[col].astype(str)
        uniq_ratio = series.nunique(dropna=True) / max(1, len(series))
        # IDs costumam ter alta unicidade e comprimento médio >= 6
        avg_len = series.str.len().mean()
        if uniq_ratio > 0.8 and avg_len >= 6:
            candidate_ids.append((col, uniq_ratio, avg_len))
    if candidate_ids:
        candidate_ids.sort(key=lambda x: (x[1], x[2]), reverse=True)
        df = df.rename(columns={candidate_ids[0][0]: 'participant_id'})

# Checagem de sanidade
required = ["text_authorship", "participant_id"]
missing = [c for c in required if c not in df.columns]
if missing:
    raise KeyError(
        f"Colunas obrigatórias ausentes após normalização/derivação: {missing}. "
        f"Colunas disponíveis (amostra): {list(df.columns)[:30]} | Cabeçalho na linha {best_row}"
    )

# 2) Estatística descritiva das variáveis brutas por condição
desc_vars = [
    'reading_time_per_word_x', 'reading_time',
    'naturalidade', 'clareza', 'compreensao',
    'd_score', 'number_of_fixations_y',
    'number_of_regressions_y', 'total_reading_time',
    'reading_time_per_word_y'
]
print("\nEstatísticas descritivas por condição (média, dp, min, max):")
desc = df.groupby('text_authorship')[desc_vars].agg(['mean','std','min','max'])
print(desc)
# 2a) Exportar estatísticas descritivas (pt-BR)
desc_fmt = desc.map(lambda x: f"{x:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
desc_fmt.to_csv('descriptive_stats_round1.csv', sep=';', index=True, encoding='utf-8')

# 3) Pivot para formato wide (média por participante e condição)
vars_wide = desc_vars
df_wide = (
    df
    .pivot_table(
        index='participant_id',
        columns='text_authorship',
        values=vars_wide,
        aggfunc='mean'
    )
    .reset_index()
)
# Achatar MultiIndex das colunas
df_wide.columns = ['_'.join(filter(None, map(str, col))).strip('_') for col in df_wide.columns.values]

# 4) Calcular deltas (AI – human)
for var in vars_wide:
    df_wide[f"delta_{var}"] = df_wide[f"{var}_AI"] - df_wide[f"{var}_human"]

# 5) Extrair deltas
df_delta = df_wide[['participant_id'] + [f"delta_{v}" for v in vars_wide]]
print("\nDeltas (AI – human) por participante:")
print(df_delta)
# 5a) Exportar deltas (pt-BR)
delta_fmt = df_delta.copy()
for col in delta_fmt.columns:
    if col != 'participant_id':
        delta_fmt[col] = pd.to_numeric(delta_fmt[col], errors='coerce') \
            .map(lambda x: f"{x:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
delta_fmt.to_csv('delta_round1.csv', sep=';', index=False, encoding='utf-8')

# 6) Estatísticas descritivas dos deltas (AI – human)
delta_desc = df_delta.drop(columns='participant_id').agg(['mean','std','min','max'])
print("\nEstatísticas descritivas dos deltas (AI – human):")
print(delta_desc)
# 6a) Exportar estatísticas descritivas dos deltas (pt-BR)
delta_desc_fmt = delta_desc.map(lambda x: f"{x:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))
delta_desc_fmt.to_csv('delta_descriptive_round1.csv', sep=';', index=True, encoding='utf-8')

# 7) Testes pareados (t-teste de amostra única vs. zero)
print("\nResultados dos testes pareados (t-teste uma amostra vs. zero):")
test_results = []
for var in vars_wide:
    col = f"delta_{var}"
    data = pd.to_numeric(df_delta[col], errors='coerce').dropna()
    tstat, pval = stats.ttest_1samp(data, 0)
    effsize = data.mean() / data.std(ddof=1)
    test_results.append({'variavel': var, 't_statistic': tstat, 'p_value': pval, 'd_rm': effsize})
tests_df = pd.DataFrame(test_results)
print(tests_df)
# 7a) Exportar resultados dos testes t para CSV (pt-BR)
tests_df.to_csv('paired_tests_round1.csv', sep=';', index=False, float_format='%.3f', decimal=',', encoding='utf-8')

# 8) Testes de Wilcoxon (signed-rank)
print("\nResultados dos testes de Wilcoxon (signed-rank):")
wilc_results = []
for var in vars_wide:
    col = f"delta_{var}"
    data = pd.to_numeric(df_delta[col], errors='coerce').dropna()
    stat, p = wilcoxon(data)
    wilc_results.append({'variavel': var, 'wilcoxon_stat': stat, 'p_value': p})
wilc_df = pd.DataFrame(wilc_results)
print(wilc_df)
# 8a) Exportar resultados dos testes de Wilcoxon para CSV (pt-BR)
wilc_df.to_csv('wilcoxon_tests_round1.csv', sep=';', index=False, float_format='%.3f', decimal=',', encoding='utf-8')

# 9) Gráficos dos deltas
for var in vars_wide:
    col = f"delta_{var}"
    data = pd.to_numeric(df_delta[col], errors='coerce').dropna()
    # Histograma
    plt.figure()
    plt.hist(data, bins=20)
    plt.title(f"Histograma de Δ {var}")
    plt.xlabel("Δ valor")
    plt.ylabel("Frequência")
    plt.show()
    # Boxplot
    plt.figure()
    plt.boxplot(data, vert=False)
    plt.title(f"Boxplot de Δ {var}")
    plt.xlabel("Δ valor")
    plt.show()

# 10) Correlações entre deltas (Pearson)
delta_corr = df_delta.drop(columns='participant_id').corr(method='pearson')
print("\nMatriz de correlações entre deltas (Pearson):")
print(delta_corr)
# 10a) Exportar matriz de correlações para CSV (pt-BR)
delta_corr.to_csv('delta_correlations_round1.csv', sep=';', decimal=',', float_format='%.2f', encoding='utf-8')
# 10b) Heatmap de correlações
plt.figure()
mat = delta_corr.values
plt.imshow(mat, aspect='auto')
plt.colorbar()
plt.xticks(range(len(delta_corr.columns)), delta_corr.columns, rotation=90)
plt.yticks(range(len(delta_corr.index)), delta_corr.index)
plt.title("Heatmap de correlações dos deltas (Pearson)")
plt.tight_layout()
plt.show()

# 11) Regressão múltipla linear: Δ d_score ~ outros deltas
print("\nSumário do modelo de regressão múltipla (Δ d_score ~ outros Δ):")
# Definir variáveis preditoras: apenas os Δs com p < 0.05 no t-teste
sig_vars = tests_df.loc[tests_df['p_value'] < 0.05, 'variavel'].tolist()
pred_vars = [f"delta_{v}" for v in sig_vars]
print(f"\nVariáveis preditoras selecionadas (p<0.05): {pred_vars}")
X = df_delta[pred_vars].apply(pd.to_numeric, errors='coerce')
X = sm.add_constant(X)
y = pd.to_numeric(df_delta["delta_d_score"], errors='coerce')
model = sm.OLS(y, X).fit()
print(model.summary())
# 11a) Cálculo de VIF
vif_data = pd.DataFrame({
    "variavel": X.columns,
    "VIF": [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
})
print("\nVIF das variáveis preditoras:")
print(vif_data)
# 11b) Exportar resultados da regressão para CSV (pt-BR)
coef_df = pd.DataFrame({
    "variavel": model.params.index,
    "beta": model.params.values,
    "p_value": model.pvalues.values,
    "R_squared": model.rsquared
})
results_df = coef_df.merge(vif_data, on="variavel")
results_df.to_csv("regression_results_round1.csv", sep=";", decimal=",", float_format="%.3f", index=False, encoding="utf-8")

# # 12) Análise de mediação (bootstrap) usando pingouin
# try:
#     print("\nAnálise de mediação: Δ regressões → Δ naturalidade → Δ d_score")
#     med = pg.mediation_analysis(data=df_delta, x='delta_number_of_regressions_y',
#                                 m='delta_naturalidade', y='delta_d_score', n_boot=5000)
#     print(med)
#     med.to_csv('mediation_regressions_naturalidade_dscore.csv', sep=';', decimal=',',
#                float_format='%.3f', encoding='utf-8', index=False)
# except ImportError:
#     print("\nPingouin não instalado: instale com `pip install pingouin` para executar análise de mediação.")