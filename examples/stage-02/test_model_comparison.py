import json,tempfile,unittest
from pathlib import Path
from model_comparison import (compare_models,fit_scaler,load_rows,stratified_folds)
FIXTURE=Path("examples/stage-02/fixtures/student-outcomes.csv")
class ModelComparisonTests(unittest.TestCase):
    def test_fixture_loads_twelve_rows(self):
        self.assertEqual(len(load_rows(FIXTURE)),12)
    def test_stratified_folds_cover_each_row_once(self):
        folds=stratified_folds(load_rows(FIXTURE),3)
        flat=[i for fold in folds for i in fold]
        self.assertEqual(sorted(flat),list(range(12)))
        self.assertTrue(all(len(fold)==4 for fold in folds))
    def test_fold_scaler_is_fitted_on_train_rows_only(self):
        rows=load_rows(FIXTURE);scaler=fit_scaler(rows[:8])
        self.assertEqual(len(scaler[0]),2)
        self.assertAlmostEqual(scaler[0][0],sum(r.features[0] for r in rows[:8])/8)
    def test_model_comparison_exports_three_families(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/"report.json";report=compare_models(FIXTURE,out,3)
            saved=json.loads(out.read_text())
            self.assertEqual(saved,report)
            self.assertEqual(set(report["models"]),{"logistic","knn","bagged_stumps"})
            self.assertEqual(len(report["fold_audit"]),3)
            self.assertTrue(all(not fold["validation_used_for_fit"] for fold in report["fold_audit"]))
            self.assertTrue(all(fold["scaler_fit_rows"]==fold["train_rows"] for fold in report["fold_audit"]))
    def test_each_model_reports_bounded_metrics(self):
        report=compare_models(FIXTURE,Path(tempfile.gettempdir())/"stage2-metrics.json")
        for metrics in report["models"].values():
            for value in metrics.values():self.assertGreaterEqual(value,0);self.assertLessEqual(value,1)
if __name__=="__main__":unittest.main()
