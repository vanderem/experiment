# Biblioteca para mediação
import pingouin as pg
import pandas as pd
from scipy import stats
from scipy.stats import wilcoxon
import matplotlib.pyplot as plt
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

# 1) Ler sem header e ajustar manualmente
df_raw = pd.read_excel('/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data/dados_consolidados.xlsx', header=None)
header = df_raw.iloc[1].tolist()
df = df_raw[2:].copy()
df.columns = header
df = df[df.columns[df.columns.notna()]]
df = df.reset_index(drop=True)

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