import unittest

from tenant_security.policy_engine import (
    Job, Principal, Record, TenantCache, TenantStore, TenantVectorIndex,
    TransactionTenantContext, object_key, verify_job,
)


class TenantSecurityTests(unittest.TestCase):
    def setUp(self):
        self.a = Principal("user-A", "tenant-A", frozenset({"documents:read", "documents:write"}))
        self.b = Principal("user-B", "tenant-B", frozenset({"documents:read", "documents:write"}))
        self.store = TenantStore([
            Record("invoice-7", "tenant-A", "user-A", "Quarterly plan"),
            Record("invoice-7", "tenant-B", "user-B", "Acquisition plan"),
            Record("other-1", "tenant-A", "user-A", "Operations handbook"),
        ])

    def test_duplicate_external_ids_are_tenant_scoped(self):
        self.assertEqual(self.store.get(self.a, "invoice-7").body, "Quarterly plan")
        self.assertEqual(self.store.get(self.b, "invoice-7").body, "Acquisition plan")

    def test_guessed_cross_tenant_resource_is_not_found(self):
        with self.assertRaisesRegex(PermissionError, "RESOURCE_NOT_FOUND_IN_TENANT"):
            self.store.get(self.a, "tenant-B-only-id")

    def test_missing_principal_fails_closed(self):
        with self.assertRaisesRegex(PermissionError, "MISSING_TENANT_CONTEXT"):
            self.store.get(None, "invoice-7")

    def test_list_is_scoped(self):
        self.assertEqual({r.external_id for r in self.store.list_records(self.a)}, {"invoice-7", "other-1"})
        self.assertEqual(len(self.store.list_records(self.b)), 1)

    def test_update_changes_only_current_tenant_record(self):
        updated = self.store.update(self.a, "invoice-7", "Updated A")
        self.assertEqual(updated.body, "Updated A")
        self.assertEqual(self.store.get(self.b, "invoice-7").body, "Acquisition plan")

    def test_write_requires_scope(self):
        reader = Principal("reader", "tenant-A", frozenset({"documents:read"}))
        with self.assertRaisesRegex(PermissionError, "MISSING_WRITE_SCOPE"):
            self.store.update(reader, "invoice-7", "nope")

    def test_vector_filter_applies_before_top_k(self):
        index = TenantVectorIndex([
            {"tenant_id": "tenant-B", "text": "invoice quarterly plan invoice"},
            {"tenant_id": "tenant-A", "text": "invoice plan"},
            {"tenant_id": "tenant-A", "text": "operations handbook"},
        ])
        results = index.search(self.a, {"invoice", "quarterly", "plan"}, top_k=1)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["tenant_id"], "tenant-A")

    def test_vector_search_without_context_denied(self):
        with self.assertRaisesRegex(PermissionError, "MISSING_TENANT_CONTEXT"):
            TenantVectorIndex([]).search(None, {"x"})

    def test_cache_keys_include_tenant(self):
        self.assertNotEqual(TenantCache.key(self.a, "invoice-7"), TenantCache.key(self.b, "invoice-7"))

    def test_cache_values_do_not_collide(self):
        cache = TenantCache()
        cache.put(self.a, "invoice-7", "A private value")
        cache.put(self.b, "invoice-7", "B private value")
        self.assertEqual(cache.get(self.a, "invoice-7"), "A private value")
        self.assertEqual(cache.get(self.b, "invoice-7"), "B private value")

    def test_cache_missing_context_denied(self):
        with self.assertRaisesRegex(PermissionError, "MISSING_TENANT_CONTEXT"):
            TenantCache.key(None, "invoice-7")

    def test_object_key_is_tenant_scoped(self):
        self.assertTrue(object_key(self.a, "invoice-7", "source.pdf").startswith("tenants/tenant-A/"))
        self.assertNotEqual(object_key(self.a, "invoice-7", "source.pdf"),
                            object_key(self.b, "invoice-7", "source.pdf"))

    def test_object_path_traversal_rejected(self):
        for name in ("../secret.txt", "folder/file.txt", "..", "/etc/passwd"):
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    object_key(self.a, "invoice-7", name)

    def test_job_context_matches_actor_and_resource(self):
        job = Job("job-1", "user-A", "tenant-A", "invoice-7", "document.index")
        result = verify_job(job, {"user-A": {"tenant-A"}}, self.store)
        self.assertEqual(result, type(result)(True, "ALLOW"))

    def test_forged_job_tenant_is_denied(self):
        job = Job("job-2", "user-A", "tenant-B", "invoice-7", "document.index")
        self.assertEqual(verify_job(job, {"user-A": {"tenant-A"}}, self.store).reason, "TENANT_CONTEXT_MISMATCH")

    def test_job_resource_must_exist_in_tenant(self):
        job = Job("job-3", "user-A", "tenant-A", "missing", "document.index")
        self.assertEqual(verify_job(job, {"user-A": {"tenant-A"}}, self.store).reason, "RESOURCE_NOT_FOUND_IN_TENANT")

    def test_unknown_job_operation_denied(self):
        job = Job("job-4", "user-A", "tenant-A", "invoice-7", "admin.export_all")
        self.assertEqual(verify_job(job, {"user-A": {"tenant-A"}}, self.store).reason, "UNKNOWN_JOB_OPERATION")

    def test_transaction_context_is_reset_after_success(self):
        context = TransactionTenantContext()
        with context.transaction("tenant-A"):
            self.assertEqual(context.tenant_id, "tenant-A")
        self.assertIsNone(context.tenant_id)

    def test_transaction_context_is_reset_after_exception(self):
        context = TransactionTenantContext()
        with self.assertRaises(RuntimeError):
            with context.transaction("tenant-B"):
                raise RuntimeError("simulated failure")
        self.assertIsNone(context.tenant_id)


if __name__ == "__main__":
    unittest.main()
