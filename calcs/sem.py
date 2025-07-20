import pandas as pd
import numpy as np
import statsmodels.formula.api as smf

# SIMULAÇÃO DE DADOS SINTÉTICOS
np.random.seed(0)
n_obs = 40

df_leitura = pd.DataFrame({
    'reading_time': np.random.normal(1200, 300, n_obs),
    'text_authorship': np.random.choice(['IA', 'humano'], n_obs),
    'text_category': np.random.choice(['noticia', 'instrucao'], n_obs),
    'number_of_regressions': np.random.poisson(2, n_obs),
    'number_of_fixations': np.random.poisson(8, n_obs),
    'segment_index': np.random.randint(1, 6, n_obs),
    'participant_id': np.random.choice([1,2,3,4], n_obs),
    'text_id': np.random.choice(['t1','t2','t3'], n_obs)
})
df_leitura['text_authorship'] = df_leitura['text_authorship'].astype('category')
df_leitura['text_category'] = df_leitura['text_category'].astype('category')
df_leitura['participant_id'] = df_leitura['participant_id'].astype('category')
df_leitura['text_id'] = df_leitura['text_id'].astype('category')
df_leitura['segment_index'] = df_leitura['segment_index'].astype('category')

# Simula julgamentos agregados ao texto/participante
df_julg = df_leitura.groupby(['text_id', 'participant_id'], as_index=False).agg({
    'text_authorship':'first',
    'text_category':'first',
    'number_of_regressions':'mean',
    'number_of_fixations':'mean',
    'reading_time':'mean'
})
df_julg['naturalidade'] = np.random.normal(4, 1, len(df_julg)).clip(1,7)
df_julg['clareza'] = np.random.normal(4.5, 1, len(df_julg)).clip(1,7)
df_julg['compreensao'] = np.random.normal(4.2, 1, len(df_julg)).clip(1,7)

# [1] Modelo misto: Tempo de leitura ~ autoria + categoria + regressões + fixações
model1 = smf.mixedlm(
    "reading_time ~ text_authorship + text_category + number_of_regressions + number_of_fixations",
    df_leitura,
    groups=df_leitura["participant_id"],
    re_formula="~text_id"
).fit()
print("\n[1] Tempo de leitura por segmento:")
print(model1.summary())

# [2] Modelo misto: Naturalidade ~ autoria + tempo de leitura + regressões + fixações
model2 = smf.mixedlm(
    "naturalidade ~ text_authorship + text_category + reading_time + number_of_regressions + number_of_fixations",
    df_julg,
    groups=df_julg["participant_id"],
    re_formula="~text_id"
).fit()
print("\n[2] Naturalidade (escala) ~ tempo de leitura + outros:")
print(model2.summary())

# [3] Regressão linear: D-score ~ naturalidade + tempo de leitura + regressões + fixações
df_julg['d_score'] = np.random.normal(0, 0.3, len(df_julg))
model3 = smf.ols(
    "d_score ~ naturalidade + reading_time + number_of_regressions + number_of_fixations",
    data=df_julg
).fit()
print("\n[3] D-score do IAT ~ naturalidade + tempo de leitura + regressões + fixações:")
print(model3.summary())

# [4] Correlação cruzada
vars_corr = ['reading_time', 'number_of_regressions', 'number_of_fixations', 'naturalidade', 'clareza', 'compreensao', 'd_score']
print("\n[4] Matriz de correlação cruzada dos desfechos principais:")
print(df_julg[vars_corr].corr().round(2))