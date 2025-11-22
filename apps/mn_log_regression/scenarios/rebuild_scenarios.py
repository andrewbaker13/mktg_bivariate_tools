import csv
import math
import random


def softmax(scores):
    max_score = max(scores)
    exps = [math.exp(s - max_score) for s in scores]
    total = sum(exps) or 1.0
    return [v / total for v in exps]


def sample_category(probs):
    r = random.random()
    cum = 0.0
    for i, p in enumerate(probs):
        cum += p
        if r <= cum:
            return i
    return len(probs) - 1


def build_funnel_scenario_csv(path, n_rows=1500, seed=123):
    random.seed(seed)

    stages = ["Awareness", "Consideration", "Purchase"]
    channels = ["Email", "Social", "Search"]
    freqs = ["Low", "Medium", "High"]
    ages = ["18-24", "25-34", "35-44", "45-54", "55+"]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["customer_id", "stage", "channel", "frequency_segment", "age_band"])

        for i in range(n_rows):
            customer_id = f"C{(i + 1):04d}"

            r = random.random()
            if r < 0.45:
                channel = "Email"
            elif r < 0.8:
                channel = "Social"
            else:
                channel = "Search"

            r = random.random()
            if r < 0.55:
                frequency_segment = "Low"
            elif r < 0.85:
                frequency_segment = "Medium"
            else:
                frequency_segment = "High"

            r = random.random()
            if r < 0.15:
                age_band = "18-24"
            elif r < 0.40:
                age_band = "25-34"
            elif r < 0.65:
                age_band = "35-44"
            elif r < 0.88:
                age_band = "45-54"
            else:
                age_band = "55+"

            # Baseline scores with very small systematic differences + higher noise
            score_aw = 0.1 + random.gauss(0, 0.3)
            score_cons = 0 + random.gauss(0, 0.3)
            score_pur = -0.1 + random.gauss(0, 0.3)

            if channel == "Social":
                score_aw += 0.1
                score_cons += 0.05
            elif channel == "Search":
                score_cons += 0.1
                score_pur += 0.08
            elif channel == "Email":
                score_cons += 0.05
                score_pur += 0.05

            if frequency_segment == "Low":
                score_aw += 0.05
            elif frequency_segment == "Medium":
                score_cons += 0.05
            elif frequency_segment == "High":
                score_cons += 0.1
                score_pur += 0.12

            if age_band in ("25-34", "35-44"):
                score_cons += 0.05
                score_pur += 0.05
            elif age_band == "55+":
                score_aw += 0.05

            probs = softmax([score_aw, score_cons, score_pur])
            stage_idx = sample_category(probs)
            stage = stages[stage_idx]

            writer.writerow([customer_id, stage, channel, frequency_segment, age_band])


def build_brand_choice_scenario_csv(path, n_rows=1500, seed=456):
    random.seed(seed)

    brands = ["Brand A", "Brand B", "Brand C", "Brand D"]
    price_levels = ["Low", "Medium", "High"]
    age_bands = ["18-24", "25-34", "35-44", "45-54", "55+"]
    channels = ["Email", "Search", "Social"]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["respondent_id", "brand_choice", "price_sensitivity", "age_band", "channel"])

        for i in range(n_rows):
            respondent_id = f"R{(i + 1):04d}"

            r = random.random()
            if r < 0.25:
                price_sensitivity = "Low"
            elif r < 0.65:
                price_sensitivity = "Medium"
            else:
                price_sensitivity = "High"

            r = random.random()
            if r < 0.20:
                age_band = "18-24"
            elif r < 0.45:
                age_band = "25-34"
            elif r < 0.70:
                age_band = "35-44"
            elif r < 0.9:
                age_band = "45-54"
            else:
                age_band = "55+"

            r = random.random()
            if r < 0.5:
                channel = "Search"
            elif r < 0.8:
                channel = "Email"
            else:
                channel = "Social"

            # Baseline scores with very small differences + higher noise
            s_a = 0.1 + random.gauss(0, 0.35)
            s_b = 0.05 + random.gauss(0, 0.35)
            s_c = -0.05 + random.gauss(0, 0.35)
            s_d = -0.1 + random.gauss(0, 0.35)

            if price_sensitivity == "Low":
                s_c += 0.1
            elif price_sensitivity == "Medium":
                s_a += 0.08
                s_b += 0.08
            elif price_sensitivity == "High":
                s_a += 0.12
                s_b += 0.08

            if age_band == "18-24":
                s_c += 0.08
            elif age_band == "25-34":
                s_a += 0.08
                s_c += 0.05
            elif age_band in ("45-54", "55+"):
                s_b += 0.08
                s_d += 0.1

            if channel == "Search":
                s_a += 0.05
                s_b += 0.05
            elif channel == "Email":
                s_b += 0.05
                s_d += 0.05
            elif channel == "Social":
                s_c += 0.05

            probs = softmax([s_a, s_b, s_c, s_d])
            brand_idx = sample_category(probs)
            brand_choice = brands[brand_idx]

            writer.writerow([respondent_id, brand_choice, price_sensitivity, age_band, channel])


def main():
    build_funnel_scenario_csv("funnel_stage_data.csv", n_rows=1500)
    build_brand_choice_scenario_csv("brand_choice_data.csv", n_rows=1500)


if __name__ == "__main__":
    main()
