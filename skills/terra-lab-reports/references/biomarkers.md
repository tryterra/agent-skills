# Biomarker Reference

Biomarker standardization, UCUM unit codes, LOINC coverage, and common biomarker tables for the Terra Lab Reports API (pre-release).

## What is `biomarker`?

Every extracted result is matched against Terra API's reference dataset of 4,200+ known biomarkers. When a match is found, `biomarker` is set to a canonical slug – a stable, machine-readable identifier used to aggregate and compare results across labs, reports, and patients.

```json
{ "original_name": "Haemoglobin (Hb)", "display_name": "Hemoglobin", "biomarker": "hemoglobin" }
```

### When is `biomarker` null?

`biomarker` is always present, and is `null` when the system cannot confidently match the extracted name. This happens with lab-specific proprietary test names, uncommon or newly introduced assays, ambiguous abbreviations, and composite panels reported as a single line item. When it is `null`, `original_name` and `display_name` still contain the extracted text – use `original_name` as a display fallback and never discard the result.

## How Matching Works

1. `original_name` is extracted from the file via OCR and AI parsing.
2. The name is compared against the reference dataset using fuzzy string matching.
3. On a high-confidence match, the canonical `biomarker` slug, `display_name`, and related metadata (including `loinc_code` where available) are assigned.
4. With no confident match, `biomarker` is set to `null`.

The matching accounts for common variations:

| Report Might Say            | Matched To                             |
| --------------------------- | -------------------------------------- |
| Haemoglobin (Hb)            | `hemoglobin`                           |
| HbA1c                       | `hemoglobin_a1c`                       |
| 25-OH Vitamin D             | `vitamin_d_25_hydroxy`                 |
| Thyroid Stimulating Hormone | `thyroid_stimulating_hormone`          |
| TSH                         | `thyroid_stimulating_hormone`          |
| GFR (estimated)             | `glomerular_filtration_rate_estimated` |

## UCUM Unit Codes

Terra API maps lab units to [UCUM](https://ucum.org/) codes wherever possible – the international standard for machine-readable unit representation in healthcare. When mapping is not possible (proprietary or ambiguous units), `ucum_code` is omitted and `display_units` still shows exactly what the report printed.

| Report Units | `ucum_code` | Description                     |
| ------------ | ----------- | ------------------------------- |
| g/dL         | `g/dL`      | Grams per deciliter             |
| mg/dL        | `mg/dL`     | Milligrams per deciliter        |
| mmol/L       | `mmol/L`    | Millimoles per liter            |
| µmol/L       | `umol/L`    | Micromoles per liter            |
| ng/mL        | `ng/mL`     | Nanograms per milliliter        |
| pg/mL        | `pg/mL`     | Picograms per milliliter        |
| mIU/L        | `m[IU]/L`   | Milli-international units/liter  |
| IU/L         | `[IU]/L`    | International units per liter    |
| 10^9/L       | `10*9/L`    | Billions per liter              |
| 10^12/L      | `10*12/L`   | Trillions per liter             |
| %            | `%`         | Percent                         |
| fL           | `fL`        | Femtoliters                     |
| mm/hr        | `mm/h`      | Millimeters per hour            |
| seconds      | `s`         | Seconds                         |

Note the multibyte `µ` in unit names – always parse response bodies as UTF-8.

## LOINC Codes

When a matched biomarker has a corresponding [LOINC](https://loinc.org/) code, the result includes a `loinc_code` (useful for EHR interoperability). Coverage is partial – roughly 1,600 of the 4,200+ reference biomarkers currently carry a LOINC code, concentrated on common blood, serum, and urine analytes. Biomarkers without a mapping (many derived ratios, qualitative microbiology results, specialised assays with no specific LOINC term) have `loinc_code` present-but-null.

```json
{ "display_name": "Hemoglobin", "biomarker": "hemoglobin", "loinc_code": "718-7" }
```

## Result Types and Bounded Values

| Type          | `value` | `qualitative_value` | `value_gt` / `value_lt`   | Example                       |
| ------------- | ------- | ------------------- | ------------------------- | ----------------------------- |
| `numeric`     | number  | –                   | – (or set for bounds)     | Hemoglobin: 14.2 g/dL         |
| `qualitative` | –       | string              | –                         | HIV screen: Non-Reactive      |
| `text`        | –       | –                   | –                         | Morphology: Normal appearance |

For numeric results where the lab reports a bound rather than an exact value:

| Report Shows | `value` | `value_gt` | `value_lt` |
| ------------ | ------- | ---------- | ---------- |
| `14.2`       | 14.2    | –          | –          |
| `>5.0`       | –       | 5.0        | –          |
| `<0.01`      | –       | –          | 0.01       |

## Common Biomarkers

Frequently encountered biomarkers by category. For the complete dataset, download the reference JSON (see below).

### Complete Blood Count (CBC)

| `biomarker`                   | Display Name           | Typical Units | `ucum_code` |
| ----------------------------- | ---------------------- | ------------- | ----------- |
| `hemoglobin`                  | Hemoglobin             | g/dL          | `g/dL`      |
| `hematocrit`                  | Hematocrit             | %             | `%`         |
| `red_blood_cell_count`        | Red Blood Cell Count   | 10^12/L       | `10*12/L`   |
| `white_blood_cell_count`      | White Blood Cell Count | 10^9/L        | `10*9/L`    |
| `platelet_count`              | Platelet Count         | 10^9/L        | `10*9/L`    |
| `mean_corpuscular_volume`     | MCV                    | fL            | `fL`        |
| `mean_corpuscular_hemoglobin` | MCH                    | pg            | `pg`        |
| `neutrophils`                 | Neutrophils            | 10^9/L        | `10*9/L`    |
| `lymphocytes`                 | Lymphocytes            | 10^9/L        | `10*9/L`    |
| `monocytes`                   | Monocytes              | 10^9/L        | `10*9/L`    |

### Metabolic Panel

| `biomarker`                            | Display Name    | Typical Units | `ucum_code`        |
| -------------------------------------- | --------------- | ------------- | ------------------ |
| `glucose_fasting`                      | Fasting Glucose | mg/dL         | `mg/dL`            |
| `hemoglobin_a1c`                       | HbA1c           | %             | `%`                |
| `creatinine`                           | Creatinine      | mg/dL         | `mg/dL`            |
| `blood_urea_nitrogen`                  | BUN             | mg/dL         | `mg/dL`            |
| `glomerular_filtration_rate_estimated` | eGFR            | mL/min/1.73m2 | `mL/min/{1.73_m2}` |
| `sodium`                               | Sodium          | mmol/L        | `mmol/L`           |
| `potassium`                            | Potassium       | mmol/L        | `mmol/L`           |
| `calcium`                              | Calcium         | mg/dL         | `mg/dL`            |
| `uric_acid`                            | Uric Acid       | mg/dL         | `mg/dL`            |

### Lipid Panel

| `biomarker`         | Display Name      | Typical Units | `ucum_code` |
| ------------------- | ----------------- | ------------- | ----------- |
| `cholesterol_total` | Total Cholesterol | mg/dL         | `mg/dL`     |
| `hdl_cholesterol`   | HDL Cholesterol   | mg/dL         | `mg/dL`     |
| `ldl_cholesterol`   | LDL Cholesterol   | mg/dL         | `mg/dL`     |
| `triglycerides`     | Triglycerides     | mg/dL         | `mg/dL`     |

### Thyroid

| `biomarker`                   | Display Name | Typical Units | `ucum_code` |
| ----------------------------- | ------------ | ------------- | ----------- |
| `thyroid_stimulating_hormone` | TSH          | mIU/L         | `m[IU]/L`   |
| `free_thyroxine`              | Free T4      | ng/dL         | `ng/dL`     |
| `free_triiodothyronine`       | Free T3      | pg/mL         | `pg/mL`     |

### Hormones

| `biomarker`          | Display Name       | Typical Units | `ucum_code` |
| -------------------- | ------------------ | ------------- | ----------- |
| `testosterone_total` | Total Testosterone | ng/dL         | `ng/dL`     |
| `testosterone_free`  | Free Testosterone  | pg/mL         | `pg/mL`     |
| `estradiol`          | Estradiol          | pg/mL         | `pg/mL`     |
| `cortisol`           | Cortisol           | µg/dL         | `ug/dL`     |
| `insulin`            | Insulin            | µIU/mL        | `u[IU]/mL`  |

### Vitamins and Minerals

| `biomarker`            | Display Name | Typical Units | `ucum_code` |
| ---------------------- | ------------ | ------------- | ----------- |
| `vitamin_d_25_hydroxy` | Vitamin D    | ng/mL         | `ng/mL`     |
| `vitamin_b12`          | Vitamin B12  | pg/mL         | `pg/mL`     |
| `folate`               | Folate       | ng/mL         | `ng/mL`     |
| `ferritin`             | Ferritin     | ng/mL         | `ng/mL`     |
| `iron`                 | Iron         | µg/dL         | `ug/dL`     |

### Liver

| `biomarker`                  | Display Name    | Typical Units | `ucum_code` |
| ---------------------------- | --------------- | ------------- | ----------- |
| `alanine_aminotransferase`   | ALT             | IU/L          | `[IU]/L`    |
| `aspartate_aminotransferase` | AST             | IU/L          | `[IU]/L`    |
| `gamma_glutamyl_transferase` | GGT             | IU/L          | `[IU]/L`    |
| `alkaline_phosphatase`       | ALP             | IU/L          | `[IU]/L`    |
| `bilirubin_total`            | Total Bilirubin | mg/dL         | `mg/dL`     |
| `albumin`                    | Albumin         | g/dL          | `g/dL`      |

### Inflammation

| `biomarker`                      | Display Name | Typical Units | `ucum_code` |
| -------------------------------- | ------------ | ------------- | ----------- |
| `c_reactive_protein`             | CRP          | mg/L          | `mg/L`      |
| `c_reactive_protein_hs`          | hs-CRP       | mg/L          | `mg/L`      |
| `erythrocyte_sedimentation_rate` | ESR          | mm/hr         | `mm/h`      |

## Full Biomarker Dataset

The complete list of all 4,200+ supported biomarkers – each with its canonical key, display name, and associated metadata (including `loinc_code` where mapped) – is available as a downloadable JSON file linked from the [Biomarker Reference](https://docs.tryterra.co/lab-reports/biomarker-reference) page. It is not bundled with this skill (the file is ~700 KB); fetch it from the live docs when you need to validate slugs or look up LOINC mappings offline.

---

Source: [Biomarker Reference](https://docs.tryterra.co/lab-reports/biomarker-reference), [Core Concepts](https://docs.tryterra.co/lab-reports/core-concepts).
