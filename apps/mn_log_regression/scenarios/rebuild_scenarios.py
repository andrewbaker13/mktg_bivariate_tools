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


def build_funnel_scenario_csv(path, n_rows=800, seed=123):
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
            if r < 0.35:
                channel = "Email"
            elif r < 0.7:
                channel = "Social"
            else:
                channel = "Search"

            r = random.random()
            if r < 0.45:
                frequency_segment = "Low"
            elif r < 0.8:
                frequency_segment = "Medium"
            else:
                frequency_segment = "High"

            r = random.random()
            if r < 0.2:
                age_band = "18-24"
            elif r < 0.45:
                age_band = "25-34"
            elif r < 0.7:
                age_band = "35-44"
            elif r < 0.9:
                age_band = "45-54"
            else:
                age_band = "55+"

            # Baseline scores with very small systematic differences + higher noise
            score_aw = 0.0 + random.gauss(0, 0.25)
            score_cons = -0.02 + random.gauss(0, 0.25)
            score_pur = -0.04 + random.gauss(0, 0.25)

            if channel == "Social":
                score_aw += 0.05
                score_cons += 0.02
            elif channel == "Search":
                score_cons += 0.05
                score_pur += 0.04
            elif channel == "Email":
                score_cons += 0.03
                score_pur += 0.03

            if frequency_segment == "Low":
                score_aw += 0.04
            elif frequency_segment == "Medium":
                score_cons += 0.04
            elif frequency_segment == "High":
                score_cons += 0.05
                score_pur += 0.06

            if age_band in ("25-34", "35-44"):
                score_cons += 0.03
                score_pur += 0.03
            elif age_band == "55+":
                score_aw += 0.03

            probs = softmax([score_aw, score_cons, score_pur])
            stage_idx = sample_category(probs)
            stage = stages[stage_idx]

            writer.writerow([customer_id, stage, channel, frequency_segment, age_band])


def build_brand_choice_scenario_csv(path, n_rows=900, seed=456):
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
            if r < 0.3:
                price_sensitivity = "Low"
            elif r < 0.7:
                price_sensitivity = "Medium"
            else:
                price_sensitivity = "High"

            r = random.random()
            if r < 0.25:
                age_band = "18-24"
            elif r < 0.5:
                age_band = "25-34"
            elif r < 0.75:
                age_band = "35-44"
            elif r < 0.9:
                age_band = "45-54"
            else:
                age_band = "55+"

            r = random.random()
            if r < 0.4:
                channel = "Search"
            elif r < 0.7:
                channel = "Email"
            else:
                channel = "Social"

            # Baseline scores with very small differences + higher noise
            s_a = 0.05 + random.gauss(0, 0.3)
            s_b = 0.02 + random.gauss(0, 0.3)
            s_c = -0.02 + random.gauss(0, 0.3)
            s_d = -0.05 + random.gauss(0, 0.3)

            if price_sensitivity == "Low":
                s_c += 0.05
            elif price_sensitivity == "Medium":
                s_a += 0.04
                s_b += 0.04
            elif price_sensitivity == "High":
                s_a += 0.06
                s_b += 0.04

            if age_band == "18-24":
                s_c += 0.04
            elif age_band == "25-34":
                s_a += 0.04
                s_c += 0.03
            elif age_band in ("45-54", "55+"):
                s_b += 0.04
                s_d += 0.05

            if channel == "Search":
                s_a += 0.03
                s_b += 0.03
            elif channel == "Email":
                s_b += 0.03
                s_d += 0.03
            elif channel == "Social":
                s_c += 0.03

            probs = softmax([s_a, s_b, s_c, s_d])
            brand_idx = sample_category(probs)
            brand_choice = brands[brand_idx]

            writer.writerow([respondent_id, brand_choice, price_sensitivity, age_band, channel])


def main():
    build_funnel_scenario_csv("funnel_stage_data.csv")
    build_brand_choice_scenario_csv("brand_choice_data.csv")


if __name__ == "__main__":
    main()
