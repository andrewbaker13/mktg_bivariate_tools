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


def build_esports_scenario_csv(path, n_rows=1000, seed=789):
    random.seed(seed)

    segments = ["Casual", "Core", "Competitive"]
    regions = ["NA", "EU", "APAC"]
    platforms = ["PC", "Console", "Mobile"]
    memberships = ["Free", "Standard", "Premium"]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "player_id",
                "engagement_segment",
                "region",
                "platform",
                "membership_tier",
                "hours_per_week",
                "matches_per_week",
                "in_game_spend",
            ]
        )

        for i in range(n_rows):
            player_id = f"P{(i + 1):04d}"

            r = random.random()
            if r < 0.5:
                region = "NA"
            elif r < 0.8:
                region = "EU"
            else:
                region = "APAC"

            r = random.random()
            if r < 0.6:
                platform = "PC"
            elif r < 0.85:
                platform = "Console"
            else:
                platform = "Mobile"

            r = random.random()
            if r < 0.4:
                membership = "Free"
            elif r < 0.8:
                membership = "Standard"
            else:
                membership = "Premium"

            # Generate continuous predictors with moderate noise
            base_hours = random.gauss(15, 4)
            base_matches = random.gauss(30, 8)
            base_spend = max(0.0, random.gauss(20, 15))

            if membership == "Premium":
                base_hours += 6
                base_matches += 10
                base_spend += 40
            elif membership == "Standard":
                base_hours += 3
                base_matches += 5
                base_spend += 10

            if platform == "Mobile":
                base_hours -= 3
                base_matches -= 8
                base_spend -= 5

            if region == "APAC":
                base_hours += 4
                base_matches += 6

            hours = max(1.0, base_hours)
            matches = max(3.0, base_matches)
            spend = max(0.0, base_spend)

            # Baseline scores with lower noise so predictors show clearer effects
            score_casual = 0.2 + random.gauss(0, 0.2)
            score_core = 0.1 + random.gauss(0, 0.2)
            score_comp = -0.1 + random.gauss(0, 0.2)

            # Stronger effects of continuous engagement metrics
            score_core += 0.03 * (hours - 12) + 0.02 * (matches - 20) + 0.0008 * (spend - 20)
            score_comp += 0.05 * (hours - 12) + 0.035 * (matches - 20) + 0.0015 * (spend - 20)

            # Make membership tier a strong driver of Core/Competitive vs Casual
            if membership == "Premium":
                score_comp += 0.7
                score_core += 0.25
            elif membership == "Standard":
                score_core += 0.35

            # Platform tilt: PC/Console more engaged than Mobile
            if platform == "Console":
                score_core += 0.25
                score_comp += 0.15
            elif platform == "Mobile":
                score_casual += 0.3
                score_core -= 0.1
                score_comp -= 0.2

            # Region: APAC slightly more Competitive
            if region == "APAC":
                score_comp += 0.3

            probs = softmax([score_casual, score_core, score_comp])
            seg_idx = sample_category(probs)
            engagement_segment = segments[seg_idx]

            writer.writerow(
                [
                    player_id,
                    engagement_segment,
                    region,
                    platform,
                    membership,
                    round(hours, 1),
                    round(matches, 1),
                    round(spend, 2),
                ]
            )


def build_single_continuous_scenario_csv(path, n_rows=800, seed=321):
    """Idealized scenario: one continuous predictor with clearly separated linear effects.

    Outcome: segment with three levels: Low / Medium / High.
    Predictor: score (roughly standard normal).
    """
    random.seed(seed)

    segments = ["Low", "Medium", "High"]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "segment", "score"])

        for i in range(n_rows):
            pid = f"S{i + 1:04d}"
            # Single continuous predictor with modest noise
            score = random.gauss(0, 1)

            # Clean, strong linear structure on the logit scale
            # Low is baseline (0); Medium and High are linear in score.
            s_low = 0.0
            s_med = -0.3 + 1.2 * score
            s_high = -1.0 + 2.0 * score

            probs = softmax([s_low, s_med, s_high])
            seg_idx = sample_category(probs)
            segment = segments[seg_idx]

            writer.writerow([pid, segment, round(score, 3)])


def main():
    build_funnel_scenario_csv("funnel_stage_data.csv", n_rows=1500)
    build_brand_choice_scenario_csv("brand_choice_data.csv", n_rows=1500)
    build_esports_scenario_csv("esports_engagement_data.csv", n_rows=1000)
    build_single_continuous_scenario_csv("single_continuous_data.csv", n_rows=800)


if __name__ == "__main__":
    main()
