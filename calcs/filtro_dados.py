import os
import glob
import json
import shutil
import logging
import pandas as pd
import math

# --- CONFIGURAÇÕES ---
INPUT_DIR = "/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data"             # onde estão seus arquivos .json
REJECTED_DIR = "/Users/vander/PycharmProjects/Textos/jspsych-experiment 4/data/rejeitados"    # onde os rejeitados vão parar
LOG_FILE = "rejection_log.txt"
VALIDATION_ANGLE_THRESHOLD = 4.0  # qualidade mínima aceitável
EYE_DISTANCE_CM = 70  # distância olho-tela em cm
PPI = 96  # pixels por polegada
PX_PER_CM = PPI / 2.54  # pixels por centímetro

# tabelinha do eye tracking pra não esquecer
# ótimo ≤ 1.5° Alta confiabilidade
# aceitável ≤ 4.0° Útil para regressão/fixação
# precário > 4.0° Muito ruidoso, melhor descartar


# Cria pasta de rejeitados e configura log
os.makedirs(REJECTED_DIR, exist_ok=True)
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# --- LIMIARES (valores típicos da literatura) ---
IAT_RT_MIN = 300                  # ms; abaixo disso considera implausível
IAT_RT_MAX = 3000                 # ms; acima disso considera muito lento
READING_RTW_MIN = 200             # ms/word; abaixo disso é leitura muito rápida

# --- FUNÇÃO PRINCIPAL ---
def validar_participante(filepath):
    """Carrega o JSON, calcula métricas e retorna lista de motivos de rejeição (vazia = OK)."""
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    try:
        data = [json.loads(l) for l in lines if l.strip().startswith("{")]
    except Exception:
        data = json.loads("".join(lines))
    df = pd.DataFrame(data)

    pid = df.get("participant_id", pd.Series([os.path.basename(filepath)])).iloc[0]
    motivos = []


    # 1) IAT (tempo de reação médio)
    if "trial_type" in df.columns and "rt" in df.columns:
        df_iat = df[df["trial_type"].str.contains("iat", na=False)]
        if not df_iat.empty:
            media_rt = df_iat["rt"].astype(float).mean()
            if media_rt < IAT_RT_MIN or media_rt > IAT_RT_MAX:
                motivos.append(f"IAT mean RT {media_rt:.0f}ms fora de [{IAT_RT_MIN},{IAT_RT_MAX}]")
        else:
            motivos.append("nenhuma trial IAT encontrada")
    else:
        motivos.append("campos 'trial_type' ou 'rt' ausentes")

    # 2) Self‐paced reading (tempo médio por palavra)
    if "task" in df.columns and "reading_time_per_word" in df.columns:
        rtpw = df[df["task"] == "self_paced_reading"]["reading_time_per_word"].astype(float)
        if not rtpw.empty:
            media_rtpw = rtpw.mean()
            if media_rtpw < READING_RTW_MIN:
                motivos.append(f"reading_time_per_word média {media_rtpw:.1f}ms < {READING_RTW_MIN}ms")
        else:
            motivos.append("nenhuma trial self_paced_reading encontrada")
    else:
        motivos.append("campos 'task' ou 'reading_time_per_word' ausentes")

    # 3) Erro de calibração do eye-tracking (validação)
    df_val_task = [row for row in data if row.get("task") == "eye_tracking_validation" and isinstance(row.get("raw_gaze"), list)]
    if df_val_task:
        all_pontos = []
        for row in df_val_task:
            raw_gaze = row.get("raw_gaze", [])
            if isinstance(raw_gaze, list) and len(raw_gaze) > 0 and isinstance(raw_gaze[0], list):
                pontos = raw_gaze[0]
            else:
                pontos = raw_gaze
            for ponto in pontos:
                if all(k in ponto for k in ["x", "y", "dx", "dy"]):
                    all_pontos.append(ponto)
        if all_pontos:
            df_val = pd.DataFrame(all_pontos)
            df_val["dist_px"] = ((df_val["x"] - df_val["dx"])**2 + (df_val["y"] - df_val["dy"])**2)**0.5
            df_val["dist_cm"] = df_val["dist_px"] / PX_PER_CM
            df_val["erro_graus"] = df_val["dist_cm"].apply(lambda d: math.degrees(math.atan(d / EYE_DISTANCE_CM)))
            erro_medio = df_val["erro_graus"].mean()
            #logging.info(f"{pid}: erro médio de calibração = {erro_medio:.2f}°")
            if erro_medio > VALIDATION_ANGLE_THRESHOLD:
                motivos.append(f"erro de calibração médio {erro_medio:.2f}° > {VALIDATION_ANGLE_THRESHOLD}°")
        else:
            motivos.append("nenhum dado válido em raw_gaze")
    else:
        motivos.append("nenhuma task de validação com eye_tracking_validation encontrada")

    return pid, motivos

# --- RODA A VALIDAÇÃO EM TODOS OS ARQUIVOS ---
for filepath in glob.glob(os.path.join(INPUT_DIR, "*.json")):
    pid, motivos = validar_participante(filepath)
    if motivos:
        # move para pasta de rejeitados
        dest = os.path.join(REJECTED_DIR, os.path.basename(filepath))
        shutil.move(filepath, dest)
        # escreve no log
        logging.info(f"{pid}: {'; '.join(motivos)}")

print("Validação concluída. Veja", LOG_FILE, "para detalhes dos rejeitados.")