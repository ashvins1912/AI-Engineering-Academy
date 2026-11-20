import csv, json, tempfile, unittest
from datetime import date
from pathlib import Path
from project_pipeline import Record, build_pipeline, engineer_features, fit_scaler, load_records, split_by_time_and_entity, transform

FIXTURE = Path("examples/stage-01/fixtures/tabular_project.csv")

class IntegratedPipelineTests(unittest.TestCase):
    def write_csv(self, directory, header, rows):
        path = Path(directory) / "input.csv"
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle); writer.writerow(header); writer.writerows(rows)
        return path

    def test_fixture_loads_twelve_rows(self):
        self.assertEqual(len(load_records(FIXTURE)), 12)

    def test_missing_required_column_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.write_csv(d,["row_id","entity_id","event_date","target"],[["r1","e1","2024-01-01",1]])
            with self.assertRaisesRegex(ValueError,"missing required columns"): load_records(p)

    def test_duplicate_row_id_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.write_csv(d,["row_id","entity_id","event_date","feature_value","target"],[["r1","e1","2024-01-01",1,0],["r1","e2","2024-01-02",2,1]])
            with self.assertRaisesRegex(ValueError,"duplicate row_id"): load_records(p)

    def test_target_derived_column_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.write_csv(d,["row_id","entity_id","event_date","feature_value","target","future_revenue"],[["r1","e1","2024-01-01",1,0,100]])
            with self.assertRaisesRegex(ValueError,"target leakage"): load_records(p)

    def test_invalid_date_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.write_csv(d,["row_id","entity_id","event_date","feature_value","target"],[["r1","e1","bad-date",1,0]])
            with self.assertRaisesRegex(ValueError,"invalid date"): load_records(p)

    def test_non_finite_feature_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.write_csv(d,["row_id","entity_id","event_date","feature_value","target"],[["r1","e1","2024-01-01","NaN",0]])
            with self.assertRaisesRegex(ValueError,"finite"): load_records(p)

    def test_target_must_be_binary(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.write_csv(d,["row_id","entity_id","event_date","feature_value","target"],[["r1","e1","2024-01-01",1,3]])
            with self.assertRaisesRegex(ValueError,"0 or 1"): load_records(p)

    def test_feature_engineering_is_deterministic(self):
        r=Record("r1","e1",date(2024,1,1),-4.0,1)
        self.assertEqual(engineer_features([r]),engineer_features([r]))
        self.assertEqual(engineer_features([r])[0]["feature_abs"],4.0)

    def test_time_split_is_ordered_and_entity_disjoint(self):
        train,valid=split_by_time_and_entity(load_records(FIXTURE),date(2025,1,1))
        self.assertLessEqual(max(r.event_date for r in train),min(r.event_date for r in valid))
        self.assertFalse({r.entity_id for r in train}&{r.entity_id for r in valid})

    def test_entity_reuse_across_time_is_rejected(self):
        rows=[Record("a","same",date(2024,1,1),1,0),Record("b","same",date(2025,2,1),2,1)]
        with self.assertRaisesRegex(ValueError,"entity leakage"): split_by_time_and_entity(rows,date(2025,1,1))

    def test_empty_validation_partition_is_rejected(self):
        rows=[Record("a","e1",date(2024,1,1),1,0)]
        with self.assertRaisesRegex(ValueError,"at least one train and one validation"): split_by_time_and_entity(rows,date(2025,1,1))

    def test_scaler_is_fitted_only_on_training_values(self):
        scaler=fit_scaler([0.0,2.0,4.0])
        self.assertEqual(scaler.mean,2.0); self.assertEqual(scaler.fit_rows,3)
        self.assertAlmostEqual(transform([1000.0],scaler)[0],998.0/scaler.scale)

    def test_constant_feature_has_safe_nonzero_scale(self):
        scaler=fit_scaler([5.0,5.0])
        self.assertEqual(scaler.scale,1.0); self.assertEqual(transform([5.0],scaler),[0.0])

    def test_pipeline_exports_auditable_artifact(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/"artifact.json"; artifact=build_pipeline(FIXTURE,out,date(2025,1,1))
            saved=json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(saved,artifact)
            self.assertEqual(artifact["counts"],{"total":12,"train":8,"validation":4})
            self.assertTrue(artifact["invariants"]["entity_disjoint"])
            self.assertTrue(artifact["invariants"]["temporal_order"])
            self.assertFalse(artifact["invariants"]["validation_used_for_fit"])
            self.assertEqual(artifact["scaler"]["fit_rows"],8)

if __name__ == "__main__": unittest.main()
