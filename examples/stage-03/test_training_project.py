import json,tempfile,unittest
from pathlib import Path
from training_project import (binary_loss,evaluate,initial_state,load_checkpoint,make_dataset,save_checkpoint,split_dataset,train_epoch,train_project)
class TrainingProjectTests(unittest.TestCase):
    def test_dataset_split_is_disjoint_and_complete(self):
        rows=make_dataset();train,val,test=split_dataset(rows)
        ids=[id(r) for group in (train,val,test) for r in group]
        self.assertEqual(len(ids),len(set(ids)));self.assertEqual(len(ids),len(rows))
    def test_train_step_reduces_loss(self):
        train,_,_=split_dataset(make_dataset());state=initial_state();before=binary_loss(state,train)
        for _ in range(40):train_epoch(state,train,.1)
        self.assertLess(binary_loss(state,train),before)
    def test_checkpoint_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"checkpoint.json";state=initial_state();save_checkpoint(path,state)
            loaded=load_checkpoint(path);self.assertEqual(loaded["epoch"],0);self.assertEqual(loaded["w1"],state["w1"])
    def test_checkpoint_rejects_missing_state(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"bad.json";path.write_text(json.dumps({"epoch":1}))
            with self.assertRaisesRegex(ValueError,"missing required"):load_checkpoint(path)
    def test_evaluation_reports_confusion_counts(self):
        rows=make_dataset();_,_,test=split_dataset(rows);result=evaluate(initial_state(),test)
        self.assertEqual(result["tp"]+result["fp"]+result["fn"]+result["tn"],len(test))
    def test_training_project_saves_best_checkpoint(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"state.json";report=train_project(path,epochs=35,patience=10)
            self.assertTrue(path.exists());self.assertGreaterEqual(report["best_epoch"],1)
            self.assertEqual(report["split_counts"],{"train":15,"validation":5,"test":5})
    def test_resume_continues_from_checkpoint_epoch(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"state.json";first=train_project(path,epochs=5)
            second=train_project(path,epochs=8,resume=True)
            self.assertGreaterEqual(second["epochs_run"],first["epochs_run"])
if __name__=="__main__":unittest.main()
