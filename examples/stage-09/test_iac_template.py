import pathlib,unittest
ROOT=pathlib.Path(__file__).parent
IAC=ROOT/"iac"/"aws-inference"
class IACTemplateTests(unittest.TestCase):
 def test_inference_tasks_are_private_and_nonroot(self):
  main=(IAC/"main.tf").read_text()
  self.assertIn("assign_public_ip = false",main)
  self.assertIn('user                   = "10001:10001"',main)
  self.assertIn("readonlyRootFilesystem = true",main)
  self.assertIn('drop = ["ALL"]',main)
 def test_only_approved_secret_arn_is_injected(self):
  main=(IAC/"main.tf").read_text();variables=(IAC/"variables.tf").read_text()
  self.assertIn("var.app_secret_arn",main)
  self.assertIn("secretsmanager:GetSecretValue",main)
  self.assertNotIn("secret_value",variables)
  self.assertNotIn("password =",variables.lower())
 def test_image_is_digest_pinned_and_ecr_tags_immutable(self):
  main=(IAC/"main.tf").read_text();variables=(IAC/"variables.tf").read_text()
  self.assertIn("image_tag_mutability = \"IMMUTABLE\"",main)
  self.assertIn("@${var.image_digest}",main)
  self.assertIn("sha256:[0-9a-f]{64}",variables)
 def test_private_tasks_have_private_aws_endpoints(self):
  main=(IAC/"main.tf").read_text()
  for endpoint in ("ecr.api","ecr.dkr","logs","secretsmanager","s3"):
   self.assertIn(endpoint,main)
  self.assertNotIn('resource "aws_nat_gateway"',main)
 def test_static_validation_never_applies(self):
  workflow=(ROOT/"iac"/"validate.yml").read_text()
  self.assertIn("terraform fmt -check",workflow)
  self.assertIn("terraform validate",workflow)
  self.assertNotIn("terraform apply",workflow)
 def test_state_and_plan_files_are_ignored_but_lockfile_is_not(self):
  ignored=(IAC/".gitignore").read_text()
  self.assertIn("*.tfstate",ignored);self.assertIn("*.tfplan",ignored)
  self.assertNotIn(".terraform.lock.hcl",ignored)
if __name__=="__main__":unittest.main()
