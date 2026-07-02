# Biomarker Reference

Biomarker standardization, UCUM unit codes, LOINC coverage, and common biomarker tables for the Terra Lab Reports API (pre-release).

## What is the biomarker key?

Every extracted result is matched against Terra API's reference dataset of ~4,130 known biomarkers. When a match is found, `biomarker.key` is set to a canonical key – a stable, machine-readable identifier used to aggregate and compare results across labs, reports, and patients.

```json
{
  "source": { "name": "Haemoglobin (Hb)" },
  "biomarker": { "key": "hemoglobin", "display_name": "Hemoglobin" }
}
```

### When is `biomarker.key` null?

`biomarker.key` is non-null only when the system confidently matches the extracted name. It is **null** when matching fails – common with lab-specific proprietary test names, uncommon or newly introduced assays, ambiguous abbreviations, and composite panels reported as a single line item. It is the sole no-match signal (do not key off `loinc_code`, which can be null on a match). When it is null, `source.name` and `biomarker.display_name` still contain the extracted text – use `source.name` as a display fallback and never discard the result.

## How Matching Works

1. `source.name` is extracted from the file via OCR and AI parsing.
2. The name is compared against the reference dataset using fuzzy string matching (confidence threshold 0.85).
3. On a high-confidence match, the canonical `biomarker.key`, `display_name`, and related metadata (including `loinc_code` where available) are assigned.
4. With no confident match, `biomarker.key` is null on the result.

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

Terra API maps lab units to [UCUM](https://ucum.org/) codes wherever possible – the international standard for machine-readable unit representation in healthcare. When mapping is not possible (proprietary or ambiguous units), `measurement.ucum_code` is omitted and `measurement.units` / `source.units` still show exactly what the report printed.

| Report Units | `ucum_code` | Description                     |
| ------------ | ----------- | ------------------------------- |
| g/dL         | `g/dL`      | Grams per deciliter             |
| mg/dL        | `mg/dL`     | Milligrams per deciliter        |
| mmol/L       | `mmol/L`    | Millimoles per liter            |
| µmol/L       | `umol/L`    | Micromoles per liter            |
| ng/mL        | `ng/mL`     | Nanograms per milliliter        |
| pg/mL        | `pg/mL`     | Picograms per milliliter        |
| mIU/L        | `m[IU]/L`   | Milli-international units/liter |
| IU/L         | `[IU]/L`    | International units per liter   |
| 10^9/L       | `10*9/L`    | Billions per liter              |
| 10^12/L      | `10*12/L`   | Trillions per liter             |
| %            | `%`         | Percent                         |
| fL           | `fL`        | Femtoliters                     |
| mm/hr        | `mm/h`      | Millimeters per hour            |
| seconds      | `s`         | Seconds                         |

Note the multibyte `µ` in unit names – always parse response bodies as UTF-8.

## LOINC Codes

When a matched biomarker has a corresponding [LOINC](https://loinc.org/) code, the result includes `biomarker.loinc_code` (useful for EHR interoperability). Coverage is partial – roughly 1,579 of the ~4,130 reference biomarkers currently carry a LOINC code, concentrated on common blood, serum, and urine analytes. Biomarkers without a mapping (many derived ratios, qualitative microbiology results, specialised assays with no specific LOINC term) carry no `loinc_code` – it can be absent or null even on a match, which is why it must never be used as the no-match signal.

```json
{
  "biomarker": {
    "key": "hemoglobin",
    "display_name": "Hemoglobin",
    "loinc_code": "718-7"
  }
}
```

## Measurement Types and Bounded Values

`measurement.type` names which sibling field carries the value – read that one field, never probe several:

| `measurement.type` | Value field                     | Example                       |
| ------------------ | ------------------------------- | ----------------------------- |
| `numeric`          | `numeric` (number)              | Hemoglobin: 14.2 g/dL         |
| `bounded`          | `bounded` `{ operator, value }` | hs-CRP: `<0.01`               |
| `qualitative`      | `qualitative` `{ text, code }`  | HIV screen: Non-Reactive      |
| `text`             | `text` (string)                 | Morphology: Normal appearance |

For results where the lab reports a bound rather than an exact value:

| Report Shows | `measurement`                                                           |
| ------------ | ----------------------------------------------------------------------- |
| `14.2`       | `{ "type": "numeric", "numeric": 14.2 }`                                |
| `>5.0`       | `{ "type": "bounded", "bounded": { "operator": "gt", "value": 5.0 } }`  |
| `<0.01`      | `{ "type": "bounded", "bounded": { "operator": "lt", "value": 0.01 } }` |

## Common Biomarkers

Frequently encountered biomarkers by category. For the complete dataset, download the reference JSON (see below).

### Complete Blood Count (CBC)

| `biomarker.key`               | Display Name           | Typical Units | `ucum_code` |
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

| `biomarker.key`                        | Display Name    | Typical Units | `ucum_code`        |
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

| `biomarker.key`     | Display Name      | Typical Units | `ucum_code` |
| ------------------- | ----------------- | ------------- | ----------- |
| `cholesterol_total` | Total Cholesterol | mg/dL         | `mg/dL`     |
| `hdl_cholesterol`   | HDL Cholesterol   | mg/dL         | `mg/dL`     |
| `ldl_cholesterol`   | LDL Cholesterol   | mg/dL         | `mg/dL`     |
| `triglycerides`     | Triglycerides     | mg/dL         | `mg/dL`     |

### Thyroid

| `biomarker.key`               | Display Name | Typical Units | `ucum_code` |
| ----------------------------- | ------------ | ------------- | ----------- |
| `thyroid_stimulating_hormone` | TSH          | mIU/L         | `m[IU]/L`   |
| `free_thyroxine`              | Free T4      | ng/dL         | `ng/dL`     |
| `free_triiodothyronine`       | Free T3      | pg/mL         | `pg/mL`     |

### Hormones

| `biomarker.key`      | Display Name       | Typical Units | `ucum_code` |
| -------------------- | ------------------ | ------------- | ----------- |
| `testosterone_total` | Total Testosterone | ng/dL         | `ng/dL`     |
| `testosterone_free`  | Free Testosterone  | pg/mL         | `pg/mL`     |
| `estradiol`          | Estradiol          | pg/mL         | `pg/mL`     |
| `cortisol`           | Cortisol           | µg/dL         | `ug/dL`     |
| `insulin`            | Insulin            | µIU/mL        | `u[IU]/mL`  |

### Vitamins and Minerals

| `biomarker.key`        | Display Name | Typical Units | `ucum_code` |
| ---------------------- | ------------ | ------------- | ----------- |
| `vitamin_d_25_hydroxy` | Vitamin D    | ng/mL         | `ng/mL`     |
| `vitamin_b12`          | Vitamin B12  | pg/mL         | `pg/mL`     |
| `folate`               | Folate       | ng/mL         | `ng/mL`     |
| `ferritin`             | Ferritin     | ng/mL         | `ng/mL`     |
| `iron`                 | Iron         | µg/dL         | `ug/dL`     |

### Liver

| `biomarker.key`              | Display Name    | Typical Units | `ucum_code` |
| ---------------------------- | --------------- | ------------- | ----------- |
| `alanine_aminotransferase`   | ALT             | IU/L          | `[IU]/L`    |
| `aspartate_aminotransferase` | AST             | IU/L          | `[IU]/L`    |
| `gamma_glutamyl_transferase` | GGT             | IU/L          | `[IU]/L`    |
| `alkaline_phosphatase`       | ALP             | IU/L          | `[IU]/L`    |
| `bilirubin_total`            | Total Bilirubin | mg/dL         | `mg/dL`     |
| `albumin`                    | Albumin         | g/dL          | `g/dL`      |

### Inflammation

| `biomarker.key`                  | Display Name | Typical Units | `ucum_code` |
| -------------------------------- | ------------ | ------------- | ----------- |
| `c_reactive_protein`             | CRP          | mg/L          | `mg/L`      |
| `c_reactive_protein_hs`          | hs-CRP       | mg/L          | `mg/L`      |
| `erythrocyte_sedimentation_rate` | ESR          | mm/hr         | `mm/h`      |

## Full Biomarker Dataset

The complete list of all ~4,130 supported biomarkers – each with its canonical key, display name, and associated metadata (including `loinc_code` where mapped) – is available as a downloadable file linked from the [Biomarker Reference](https://docs.tryterra.co/lab-reports/biomarker-reference) page. It is not bundled with this skill (~700 KB); fetch it from the live docs when you need to validate keys or look up LOINC mappings offline.

---

Source: [Biomarker Reference](https://docs.tryterra.co/lab-reports/biomarker-reference), [Core Concepts](https://docs.tryterra.co/lab-reports/core-concepts).
