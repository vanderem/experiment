"""
Corpus Analysis: TTR, Lexical Frequency, and Referential Cohesion
Compares Human vs AI (GLM) texts across 5 genres.

Metrics:
  - TTR (Type-Token Ratio): unique_types / total_tokens
  - MSTTR (Mean Segmental TTR): average TTR over fixed-size windows (100 tokens)
  - MTLD (Measure of Textual Lexical Diversity): robust lexical diversity
  - Mean Zipf Frequency: average log-frequency of content words (wordfreq)
  - Lexical Density: content words / total words
  - Referential Cohesion (Argument Overlap): noun/pronoun overlap between sentences
  - Stem Overlap: overlap of stemmed nouns between adjacent sentences
"""

import pandas as pd
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk.stem import RSLPStemmer
from wordfreq import zipf_frequency
from collections import Counter

nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('rslp', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)

EXCEL_PATH = (
    "/Users/vander/Meu Drive - Pessoal/Mestrado Comunicação Digital - IDP/"
    "Artigos - Publicações/Dissertação/Artigos/Artigo 1 - Ilusão de Clareza/"
    "Supplementary 2 - Corpus - EN.xlsx"
)

CATEGORIES = [
    "News",
    "Opinion",
    "Descriptive/guide",
    "Instruction",
    "Poetry/short story/literature",
]

# Column indices (0-based) for text in each sheet (row=1 is header, data starts row=2)
HUMAN_TEXT_COLS = {
    "News": 1,
    "Opinion": 5,
    "Descriptive/guide": 9,
    "Instruction": 13,
    "Poetry/short story/literature": 17,
}

GLM_TEXT_COLS = {
    "News": 1,
    "Opinion": 8,
    "Descriptive/guide": 15,
    "Instruction": 22,
    "Poetry/short story/literature": 29,
}

PT_STOPWORDS = set(stopwords.words("portuguese"))
STEMMER = RSLPStemmer()

# POS tags considered "content words" in NLTK universal tagset approximation
# We use a simple heuristic: non-stopword alphabetic tokens
CONTENT_POS = {"NN", "NNS", "NNP", "NNPS", "VB", "VBD", "VBG", "VBN", "VBP", "VBZ",
               "JJ", "JJR", "JJS", "RB", "RBR", "RBS"}


# ---------------------------------------------------------------------------
# Text loading
# ---------------------------------------------------------------------------

def load_texts():
    """Returns dict: {source: {category: [text, ...]}}"""
    df_human = pd.read_excel(EXCEL_PATH, sheet_name="Human", header=None)
    df_glm = pd.read_excel(EXCEL_PATH, sheet_name="GLM", header=None)

    # Data rows start at index 2 (row 0 empty, row 1 headers)
    data = {"Human": {}, "GLM": {}}

    for cat, col in HUMAN_TEXT_COLS.items():
        texts = []
        for i in range(2, len(df_human)):
            val = df_human.iloc[i, col]
            if pd.notna(val) and str(val).strip():
                texts.append(str(val).strip())
        data["Human"][cat] = texts

    for cat, col in GLM_TEXT_COLS.items():
        texts = []
        for i in range(2, len(df_glm)):
            val = df_glm.iloc[i, col]
            if pd.notna(val) and str(val).strip():
                texts.append(str(val).strip())
        data["GLM"][cat] = texts

    return data


# ---------------------------------------------------------------------------
# Tokenization helpers
# ---------------------------------------------------------------------------

def tokenize_words(text):
    """All alphabetic lowercase tokens."""
    tokens = word_tokenize(text.lower(), language="portuguese")
    return [t for t in tokens if t.isalpha()]


def content_words(tokens):
    """Non-stopword tokens (proxy for content words in Portuguese)."""
    return [t for t in tokens if t not in PT_STOPWORDS and len(t) > 1]


# ---------------------------------------------------------------------------
# TTR metrics
# ---------------------------------------------------------------------------

def ttr(tokens):
    if not tokens:
        return float("nan")
    return len(set(tokens)) / len(tokens)


def msttr(tokens, segment_size=100):
    """Mean Segmental TTR over non-overlapping windows."""
    if len(tokens) < segment_size:
        return ttr(tokens)
    segments = [tokens[i:i + segment_size] for i in range(0, len(tokens) - segment_size + 1, segment_size)]
    return sum(ttr(seg) for seg in segments) / len(segments)


def mtld(tokens, threshold=0.720):
    """
    Measure of Textual Lexical Diversity (McCarthy & Jarvis, 2010).
    Average factor length where TTR drops to threshold.
    """
    def _factor_count(toks):
        if not toks:
            return 0
        types = set()
        factor_count = 0
        start = 0
        for i, token in enumerate(toks):
            types.add(token)
            current_ttr = len(types) / (i - start + 1)
            if current_ttr <= threshold:
                factor_count += 1
                types = set()
                start = i + 1
        # Partial factor
        remaining = len(toks) - start
        if remaining > 0:
            partial_ttr = len(types) / remaining
            if partial_ttr > threshold:
                factor_count += (1 - partial_ttr) / (1 - threshold)
        return factor_count

    if len(tokens) < 10:
        return float("nan")

    fwd = _factor_count(tokens)
    bwd = _factor_count(tokens[::-1])

    if fwd == 0 and bwd == 0:
        return float("nan")
    if fwd == 0:
        return len(tokens) / bwd
    if bwd == 0:
        return len(tokens) / fwd
    return (len(tokens) / fwd + len(tokens) / bwd) / 2


# ---------------------------------------------------------------------------
# Lexical frequency
# ---------------------------------------------------------------------------

def mean_zipf(tokens, lang="pt"):
    """
    Mean Zipf frequency of content words using wordfreq.
    Zipf scale: ~7 = very common, ~1 = very rare.
    Higher = more common/frequent vocabulary.
    """
    content = content_words(tokens)
    if not content:
        return float("nan")
    freqs = [zipf_frequency(t, lang) for t in content]
    return sum(freqs) / len(freqs)


def lexical_density(tokens):
    """Content words / total tokens."""
    if not tokens:
        return float("nan")
    return len(content_words(tokens)) / len(tokens)


def hapax_ratio(tokens):
    """Proportion of words that appear only once (hapax legomena)."""
    if not tokens:
        return float("nan")
    freq = Counter(tokens)
    hapaxes = sum(1 for v in freq.values() if v == 1)
    return hapaxes / len(set(tokens))


# ---------------------------------------------------------------------------
# Referential cohesion
# ---------------------------------------------------------------------------

def get_nouns_and_pronouns(tokens):
    """
    Returns set of stems of nouns and pronouns.
    Uses RSLP stemmer + simple pronoun list as proxy for Portuguese POS.
    """
    PT_PRONOUNS = {
        "eu", "tu", "ele", "ela", "nós", "vós", "eles", "elas",
        "me", "te", "se", "nos", "vos", "lhe", "lhes",
        "meu", "minha", "teu", "tua", "seu", "sua", "nosso", "nossa",
        "isso", "isto", "aquilo", "esse", "esta", "este", "essa",
        "que", "quem", "qual", "cujo", "onde",
    }
    stems = set()
    for t in tokens:
        if t in PT_PRONOUNS:
            stems.add(t)
        elif t not in PT_STOPWORDS and len(t) > 3:
            stems.add(STEMMER.stem(t))
    return stems


def argument_overlap(sent_tokens_list):
    """
    Local argument overlap: mean proportion of adjacent sentence pairs
    that share at least one noun/pronoun stem.
    Formula: for each pair (i, i+1), |A ∩ B| / max(|A|, |B|)
    Returns mean over all pairs.
    """
    if len(sent_tokens_list) < 2:
        return float("nan")
    scores = []
    for i in range(len(sent_tokens_list) - 1):
        a = get_nouns_and_pronouns(sent_tokens_list[i])
        b = get_nouns_and_pronouns(sent_tokens_list[i + 1])
        denom = max(len(a), len(b))
        if denom == 0:
            continue
        scores.append(len(a & b) / denom)
    return sum(scores) / len(scores) if scores else float("nan")


def stem_overlap(sent_tokens_list):
    """
    Stem overlap between adjacent sentences using ALL content words (stemmed).
    """
    if len(sent_tokens_list) < 2:
        return float("nan")
    scores = []
    for i in range(len(sent_tokens_list) - 1):
        a = {STEMMER.stem(t) for t in content_words(sent_tokens_list[i])}
        b = {STEMMER.stem(t) for t in content_words(sent_tokens_list[i + 1])}
        denom = max(len(a), len(b))
        if denom == 0:
            continue
        scores.append(len(a & b) / denom)
    return sum(scores) / len(scores) if scores else float("nan")


def global_noun_overlap(sent_tokens_list):
    """
    Global argument overlap: each sentence vs. all previous sentences combined.
    """
    if len(sent_tokens_list) < 2:
        return float("nan")
    scores = []
    cumulative = set()
    for i, tokens in enumerate(sent_tokens_list):
        if i == 0:
            cumulative = get_nouns_and_pronouns(tokens)
            continue
        current = get_nouns_and_pronouns(tokens)
        denom = max(len(current), len(cumulative))
        if denom > 0:
            scores.append(len(current & cumulative) / denom)
        cumulative |= current
    return sum(scores) / len(scores) if scores else float("nan")


# ---------------------------------------------------------------------------
# Per-text analysis
# ---------------------------------------------------------------------------

def analyze_text(text):
    tokens = tokenize_words(text)
    sentences = sent_tokenize(text, language="portuguese")
    sent_tokens = [tokenize_words(s) for s in sentences]

    return {
        "n_tokens": len(tokens),
        "n_types": len(set(tokens)),
        "n_sentences": len(sentences),
        "ttr": ttr(tokens),
        "msttr_100": msttr(tokens, 100),
        "mtld": mtld(tokens),
        "mean_zipf": mean_zipf(tokens),
        "lexical_density": lexical_density(tokens),
        "hapax_ratio": hapax_ratio(tokens),
        "arg_overlap_local": argument_overlap(sent_tokens),
        "stem_overlap_local": stem_overlap(sent_tokens),
        "arg_overlap_global": global_noun_overlap(sent_tokens),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("Loading corpus...")
    data = load_texts()

    all_records = []
    for source in ["Human", "GLM"]:
        for cat in CATEGORIES:
            texts = data[source][cat]
            print(f"  {source} | {cat}: {len(texts)} texts")
            for i, text in enumerate(texts):
                rec = analyze_text(text)
                rec["source"] = source
                rec["category"] = cat
                rec["text_id"] = i + 1
                rec["text_preview"] = text[:60]
                all_records.append(rec)

    df = pd.DataFrame(all_records)

    # Column order
    cols = [
        "source", "category", "text_id",
        "n_tokens", "n_types", "n_sentences",
        "ttr", "msttr_100", "mtld",
        "mean_zipf", "lexical_density", "hapax_ratio",
        "arg_overlap_local", "stem_overlap_local", "arg_overlap_global",
        "text_preview",
    ]
    df = df[cols]

    # --- Summary by source × category ---
    numeric_cols = [
        "n_tokens", "n_types", "n_sentences",
        "ttr", "msttr_100", "mtld",
        "mean_zipf", "lexical_density", "hapax_ratio",
        "arg_overlap_local", "stem_overlap_local", "arg_overlap_global",
    ]
    summary = df.groupby(["category", "source"])[numeric_cols].agg(["mean", "std"]).round(4)

    # Flatten multi-level columns
    summary.columns = ["_".join(c) for c in summary.columns]
    summary = summary.reset_index()

    # --- Side-by-side comparison (Human vs GLM per category) ---
    comparison_rows = []
    for cat in CATEGORIES:
        for metric in numeric_cols:
            h_vals = df[(df["category"] == cat) & (df["source"] == "Human")][metric].dropna()
            g_vals = df[(df["category"] == cat) & (df["source"] == "GLM")][metric].dropna()
            comparison_rows.append({
                "category": cat,
                "metric": metric,
                "human_mean": round(h_vals.mean(), 4),
                "human_std": round(h_vals.std(), 4),
                "glm_mean": round(g_vals.mean(), 4),
                "glm_std": round(g_vals.std(), 4),
                "diff_glm_minus_human": round(g_vals.mean() - h_vals.mean(), 4),
            })
    comparison = pd.DataFrame(comparison_rows)

    # --- Save outputs ---
    output_base = (
        "/Users/vander/Meu Drive - Pessoal/Mestrado Comunicação Digital - IDP/"
        "Artigos - Publicações/Dissertação/Artigos/Artigo 1 - Ilusão de Clareza/"
        "Códigos/"
    )

    df.to_csv(output_base + "corpus_metrics_by_text.csv", index=False, encoding="utf-8-sig")
    summary.to_csv(output_base + "corpus_summary.csv", index=False, encoding="utf-8-sig")
    comparison.to_csv(output_base + "corpus_comparison.csv", index=False, encoding="utf-8-sig")

    # --- Print comparison table ---
    print("\n" + "=" * 80)
    print("COMPARISON: GLM vs Human (mean values)")
    print("=" * 80)
    for cat in CATEGORIES:
        print(f"\n[{cat}]")
        sub = comparison[comparison["category"] == cat]
        print(f"  {'Metric':<28} {'Human':>10} {'GLM':>10} {'Diff (G-H)':>12}")
        print(f"  {'-'*28} {'-'*10} {'-'*10} {'-'*12}")
        for _, row in sub.iterrows():
            print(f"  {row['metric']:<28} {row['human_mean']:>10.4f} {row['glm_mean']:>10.4f} {row['diff_glm_minus_human']:>+12.4f}")

    print("\nFiles saved:")
    print("  corpus_metrics_by_text.csv  — individual text scores")
    print("  corpus_summary.csv          — mean ± sd per source × category")
    print("  corpus_comparison.csv       — Human vs GLM side-by-side")


if __name__ == "__main__":
    main()
