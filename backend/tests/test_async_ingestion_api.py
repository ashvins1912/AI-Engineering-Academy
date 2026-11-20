import unittest

from app.main import app
from app.schemas import DocumentOut, IngestionJobOut


class AsyncIngestionAPIContractTests(unittest.TestCase):
    def test_async_upload_and_status_routes_exist(self):
        routes = {(route.path, tuple(sorted(route.methods or []))): route for route in app.routes}
        upload = routes[("/v1/ingestion-jobs", ("POST",))]
        status = routes[("/v1/ingestion-jobs/{job_id}", ("GET",))]
        self.assertEqual(upload.status_code, 202)
        self.assertEqual(status.status_code or 200, 200)

    def test_document_schema_exposes_visibility(self):
        schema = DocumentOut.model_json_schema()
        self.assertIn("visibility", schema["properties"])

    def test_job_schema_exposes_retry_and_terminal_state(self):
        schema = IngestionJobOut.model_json_schema()
        for field in ("status", "attempts", "document_id", "error_code"):
            self.assertIn(field, schema["properties"])


if __name__ == "__main__":
    unittest.main()
