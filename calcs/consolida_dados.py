#consolida os dados brutos da coleta do experimento

"""
Consolidação limpa dos dados:
  1) Autoleitura  -> total_reading_self (ms) por participante/texto/autoria
  2) Eye-tracking -> regressões, fixações, total_reading_eye (ms) por participante/texto/autoria
  3) IAT          -> D-score por participante, usando rt por bloco (piasse/phase)

Observação (IAT):
- O JSON registra uma entrada de fase, ex. {"phase":"instruction_block_5", ...}
  e em seguida vêm os trials do IAT (trial_type="iat-html") com os tempos "rt".
- Este script associa cada trial ao bloco numérico extraído de "phase".
"""

import os
import json
import glob
import re
import pandas as pd

# === Caminhos (ajuste aqui) ===
INPUT_DIR  = "/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data"
OUTPUT_CSV = "/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data/dados_consolidados.csv"
PATTERN    = "*.json"
# ===============================

# ---------- Util ----------
def _iter_trials(obj):
  if isinstance(obj, list):
    for it in obj:
      if isinstance(it, dict):
        yield it
  elif isinstance(obj, dict):
    for key in ("trials", "data", "events"):
      lst = obj.get(key)
      if isinstance(lst, list):
        for it in lst:
          if isinstance(it, dict):
            yield it

def _f(v, default=0.0):
  try:
    return float(v)
  except Exception:
    return default

def _i(v, default=0):
  try:
    return int(v)
  except Exception:
    return default

def _pid(item):
  return item.get("participant_id") or item.get("participant") or item.get("subject_id") or item.get("id_participante")

def _block_id_from_phase(phase_str):
  """Extrai o número do bloco de uma string do tipo 'instruction_block_5' -> '5'."""
  if not phase_str:
    return None
  m = re.search(r"\d+", str(phase_str))
  return m.group(0) if m else None

# ---------- 1) Autoleitura ----------
def consolidate_self_paced_reading(input_dir, pattern):
  rows = []
  for path in glob.glob(os.path.join(input_dir, pattern)):
    try:
      data = json.load(open(path, "r", encoding="utf-8"))
    except Exception:
      continue
    for it in _iter_trials(data):
      task = (it.get("task") or it.get("type") or it.get("trial_type") or "").lower()
      if task not in ("self_paced_reading", "autoleitura"):
        continue
      pid = _pid(it)
      text_id = it.get("text_id") or it.get("text") or it.get("id_texto")
      text_auth = it.get("text_authorship") or it.get("autoria_texto") or it.get("text_author")
      if pid is None or text_id is None or text_auth is None:
        continue
      rt_seg = it.get("reading_time")
      if rt_seg is None:
        rt_seg = it.get("rt") or it.get("reaction_time")
      rows.append({
        "participant_id": pid,
        "text_id": text_id,
        "text_authorship": text_auth,
        "rt_ms": _f(rt_seg)
      })
  if not rows:
    return pd.DataFrame(columns=["participant_id","text_id","text_authorship","total_reading_self"])
  df = pd.DataFrame(rows)
  agg = (df.groupby(["participant_id","text_id","text_authorship"], as_index=False)["rt_ms"]
           .sum()
           .rename(columns={"rt_ms":"total_reading_self"}))
  return agg

# ---------- 2) Eye-tracking ----------
def consolidate_eye_tracking(input_dir, pattern):
  rows = []
  for path in glob.glob(os.path.join(input_dir, pattern)):
    try:
      data = json.load(open(path, "r", encoding="utf-8"))
    except Exception:
      continue
    for it in _iter_trials(data):
      task = (it.get("task") or it.get("type") or it.get("trial_type") or "").lower()
      has_fields = ("number_of_regressions" in it) or ("number_of_fixations" in it) or ("total_reading_time" in it)
      if (task not in ("eye_tracking", "eyetracking", "rastreamento_ocular")) and not has_fields:
        continue
      pid = _pid(it)
      text_id = it.get("text_id") or it.get("text") or it.get("id_texto")
      text_auth = it.get("text_authorship") or it.get("autoria_texto") or it.get("text_author")
      if pid is None or text_id is None or text_auth is None:
        continue
      rows.append({
        "participant_id": pid,
        "text_id": text_id,
        "text_authorship": text_auth,
        "eye_n_regressions": _i(it.get("number_of_regressions")),
        "eye_n_fixations":  _i(it.get("number_of_fixations")),
        "total_reading_eye": _f(it.get("total_reading_time")),
      })
  if not rows:
    return pd.DataFrame(columns=[
      "participant_id","text_id","text_authorship",
      "eye_n_regressions","eye_n_fixations","total_reading_eye"
    ])
  df = pd.DataFrame(rows)
  agg = (df.groupby(["participant_id","text_id","text_authorship"], as_index=False)
           .agg({"eye_n_regressions":"sum","eye_n_fixations":"sum","total_reading_eye":"sum"}))
  agg["eye_n_regressions"] = agg["eye_n_regressions"].fillna(0).astype(int)
  agg["eye_n_fixations"]   = agg["eye_n_fixations"].fillna(0).astype(int)
  agg["total_reading_eye"] = agg["total_reading_eye"].fillna(0.0)
  return agg

# ---------- 3) IAT (rt por bloco; D-score) ----------
# Parâmetros do passo-a-passo (Greenwald et al. 2003)
IAT_RT_MAX = 10000.0        # descarta TR > 10.000 ms
IAT_LOW_RT_MS = 300.0       # TR considerado "baixo"
IAT_LOW_RT_FRAC_THRESHOLD = 0.10  # remove participante se >10% TR<300ms
IAT_VERBOSE = False         # imprime detalhes do passo-a-passo
# Mapas padrão dos blocos (ajuste conforme seu protocolo):
CONG_PRACTICE_BLOCKS   = {"3"}     # prática congruente
CONG_TEST_BLOCKS       = {"4"}     # teste  congruente
INCONG_PRACTICE_BLOCKS = {"5"}     # prática incongruente
INCONG_TEST_BLOCKS     = {"6","7"} # teste  incongruente

def _collect_iat_trials(input_dir, pattern):
  """Percorre arquivos; associa cada trial IAT ao 'current_block' definido pela última entrada com 'phase'."""
  rows = []
  for path in glob.glob(os.path.join(input_dir, pattern)):
    try:
      data = json.load(open(path, "r", encoding="utf-8"))
    except Exception:
      continue

    current_block = None
    current_pid = None  # se as fases também trazem participant_id, manteremos o último visto

    for it in _iter_trials(data):
      # marcador de fase
      if "phase" in it and it.get("phase"):
        current_block = _block_id_from_phase(it.get("phase"))
        # alguns registros de fase também têm participant_id
        current_pid = _pid(it) or current_pid
        continue

      # trial iat
      ttype = (it.get("trial_type") or it.get("type") or "").lower()
      if "iat" not in ttype:
        continue

      pid = _pid(it) or current_pid
      if pid is None or current_block is None:
        # sem participante ou sem fase corrente → ignorar
        continue

      rt = _f(it.get("rt"))
      rows.append({"participant_id": pid, "block": str(current_block), "rt_ms": rt})

  return pd.DataFrame(rows) if rows else pd.DataFrame(columns=["participant_id","block","rt_ms"])


# Passo-a-passo D-score (Greenwald et al. 2003) adaptado:
def _calc_iat_dscore_step(df_part: "pd.DataFrame", pid: str) -> tuple:
  """Calcula D-score passo-a-passo para um participante.
  Espera colunas: 'block' (str) e 'rt_ms' (float em ms).
  Retorna: (d_final, d_practice_36, d_test_47, trials_usados)
  Pode retornar (None, None, None, 0) se não for possível calcular.
  """
  if df_part is None or df_part.empty:
    return (None, None, None, 0)

  # 1) Filtra blocos críticos 3,4,6,7
  d = df_part.copy()
  d["block"] = d["block"].astype(str)
  d = d[d["block"].isin({"3", "4", "6", "7"})]
  if d.empty:
    if IAT_VERBOSE:
      print(f"[IAT] {pid}: nenhum trial nos blocos 3/4/6/7")
    return (None, None, None, 0)

  # 2) Remove TR > 10000 ms
  before = len(d)
  d = d[d["rt_ms"] <= IAT_RT_MAX]
  removed_hi = before - len(d)

  # 3) Remove participante se >10% TR < 300 ms
  if len(d) == 0:
    if IAT_VERBOSE:
      print(f"[IAT] {pid}: todos os trials removidos por TR>={IAT_RT_MAX}ms")
    return (None, None, None, 0)
  frac_low = (d["rt_ms"] < IAT_LOW_RT_MS).mean()
  if frac_low > IAT_LOW_RT_FRAC_THRESHOLD:
    if IAT_VERBOSE:
      print(f"[IAT] {pid}: removido por {frac_low:.1%} TR<300ms (limite 10%)")
    return (None, None, None, 0)

  # Função para quociente (diferença / DP concatenado)
  def _quotient(cong_block: str, incong_block: str):
    cong = d[d["block"] == cong_block]["rt_ms"]
    incong = d[d["block"] == incong_block]["rt_ms"]
    if cong.empty or incong.empty:
      return None, None, None
    pooled = pd.concat([cong, incong], ignore_index=True)
    sd = pooled.std(ddof=1)
    if pd.isna(sd) or sd == 0:
      return None, None, None
    diff = incong.mean() - cong.mean()
    return (diff / sd, diff, sd)

  # 4-7) Cálculos por pares: (3,6) treino e (4,7) crítico
  q36, diff36, sd36 = _quotient("3", "6")
  q47, diff47, sd47 = _quotient("4", "7")

  # 8) Média dos quocientes disponíveis
  quots = [q for q in (q36, q47) if q is not None]
  d_final = float(pd.Series(quots).mean()) if quots else None

  if IAT_VERBOSE:
    print("=" * 60)
    print(f"CÁLCULO D-SCORE - PARTICIPANTE: {pid}")
    print("- Blocos válidos:", len(d), f"(removidos TR>10s: {removed_hi})")
    if q36 is not None:
      print(f"Treino  (6-3): quociente={q36:.4f}  (dif={diff36:.2f} / DP={sd36:.2f})")
    else:
      print("Treino  (6-3): insuficiente")
    if q47 is not None:
      print(f"Crítico (7-4): quociente={q47:.4f}  (dif={diff47:.2f} / DP={sd47:.2f})")
    else:
      print("Crítico (7-4): insuficiente")
    print("D-final:", None if d_final is None else f"{d_final:.4f}")

  return (d_final, q36, q47, int(len(d)))

def _d_from_blocks(cong, incong):
  """Greenwald et al. (2003): D = (M_incong - M_cong) / SD(cong ∪ incong)"""
  if cong.empty or incong.empty:
    return None
  pooled = pd.concat([cong, incong], ignore_index=True)
  sd = pooled.std(ddof=1)
  if pd.isna(sd) or sd == 0:
    return None
  return (incong.mean() - cong.mean()) / sd

def consolidate_iat(input_dir, pattern):
  df = _collect_iat_trials(input_dir, pattern)
  if df.empty:
    return pd.DataFrame(columns=["participant_id","iat_d","iat_d_practice","iat_d_test","iat_trials_used"])

  out = []
  for pid, dfg in df.groupby("participant_id"):
    d_final, d36, d47, used = _calc_iat_dscore_step(dfg[["block","rt_ms"]].copy(), pid)
    out.append({
      "participant_id": pid,
      "iat_d": d_final,
      "iat_d_practice": d36,  # (6-3)/DP(3∪6)
      "iat_d_test": d47,       # (7-4)/DP(4∪7)
      "iat_trials_used": used,
    })

  return pd.DataFrame(out)

# ---------- MAIN ----------
def main():
  df_self = consolidate_self_paced_reading(INPUT_DIR, PATTERN)
  df_eye  = consolidate_eye_tracking(INPUT_DIR, PATTERN)
  df_iat  = consolidate_iat(INPUT_DIR, PATTERN)

  keys = ["participant_id","text_id","text_authorship"]
  if df_self.empty:
    df_self = pd.DataFrame(columns=keys + ["total_reading_self"])
  if df_eye.empty:
    df_eye = pd.DataFrame(columns=keys + ["eye_n_regressions","eye_n_fixations","total_reading_eye"])

  # junta autoleitura + eye por texto; IAT entra por participante
  df_out = pd.merge(df_self, df_eye, on=keys, how="outer")
  df_out = pd.merge(df_out, df_iat, on="participant_id", how="left")

  os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)
  df_out.to_csv(OUTPUT_CSV, index=False, encoding="utf-8", sep=";", decimal=",")
  print(f"[OK] Linhas escritas: {len(df_out)} → {OUTPUT_CSV}")

if __name__ == "__main__":
  main()