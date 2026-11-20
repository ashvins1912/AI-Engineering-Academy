from types import SimpleNamespace
import unittest

from app.access import can_access_document


class DocumentAccessTests(unittest.TestCase):
    def setUp(self):
        self.owner = "11111111-1111-1111-1111-111111111111"
        self.reader = "22222222-2222-2222-2222-222222222222"
        self.tenant = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        self.doc = SimpleNamespace(tenant_id=self.tenant, owner_id=self.owner, visibility="private")

    def principal(self, user_id, roles=(), tenant=None):
        return SimpleNamespace(user_id=user_id, tenant_id=tenant or self.tenant, roles=list(roles))

    def test_owner_can_read_private_document(self):
        self.assertTrue(can_access_document(self.doc, self.principal(self.owner)))

    def test_other_user_cannot_read_private_document_without_grant(self):
        self.assertFalse(can_access_document(self.doc, self.principal(self.reader)))

    def test_tenant_visible_document_is_shared_within_tenant(self):
        self.doc.visibility = "tenant"
        self.assertTrue(can_access_document(self.doc, self.principal(self.reader)))

    def test_explicit_user_grant_allows_read(self):
        grants = [{"subject_type": "user", "subject_id": self.reader, "permission": "read"}]
        self.assertTrue(can_access_document(self.doc, self.principal(self.reader), grants))

    def test_grant_for_another_user_does_not_allow_access(self):
        grants = [{"subject_type": "user", "subject_id": self.owner, "permission": "read"}]
        self.assertFalse(can_access_document(self.doc, self.principal(self.reader), grants))

    def test_tenant_admin_can_access_private_document(self):
        self.assertTrue(can_access_document(self.doc, self.principal(self.reader, ["tenant_admin"])))

    def test_other_tenant_cannot_access_even_with_matching_user_id(self):
        self.assertFalse(can_access_document(self.doc, self.principal(self.owner, tenant="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")))


if __name__ == "__main__":
    unittest.main()
