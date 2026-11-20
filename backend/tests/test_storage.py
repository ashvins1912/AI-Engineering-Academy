import os
import tempfile
import unittest
from pathlib import Path

from app.storage import LocalPrivateObjectStore, StorageError


class PrivateStorageTests(unittest.TestCase):
    def test_put_get_delete_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            store = LocalPrivateObjectStore(directory)
            store.put("tenant/job/object.bin", b"private payload")
            self.assertEqual(store.get("tenant/job/object.bin"), b"private payload")
            store.delete("tenant/job/object.bin")
            with self.assertRaisesRegex(StorageError, "not found"):
                store.get("tenant/job/object.bin")

    def test_storage_permissions_are_private(self):
        with tempfile.TemporaryDirectory() as directory:
            store = LocalPrivateObjectStore(directory)
            store.put("tenant/private.bin", b"secret")
            self.assertEqual(os.stat(directory).st_mode & 0o777, 0o700)
            self.assertEqual(os.stat(Path(directory) / "tenant" / "private.bin").st_mode & 0o777, 0o600)

    def test_rejects_path_traversal_and_absolute_keys(self):
        with tempfile.TemporaryDirectory() as directory:
            store = LocalPrivateObjectStore(directory)
            for key in ("../escape", "/absolute", "tenant/../../escape", r"tenant\..\escape"):
                with self.subTest(key=key), self.assertRaises(StorageError):
                    store.put(key, b"secret")

    def test_rejects_empty_object(self):
        with tempfile.TemporaryDirectory() as directory:
            store = LocalPrivateObjectStore(directory)
            with self.assertRaisesRegex(StorageError, "empty"):
                store.put("tenant/empty", b"")

    def test_s3_requires_bucket_and_kms_key(self):
        from app.storage import S3PrivateObjectStore
        with self.assertRaisesRegex(StorageError, "KMS"):
            S3PrivateObjectStore("private-bucket", "")


if __name__ == "__main__":
    unittest.main()
