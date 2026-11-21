output "load_balancer_dns" { value = aws_lb.app.dns_name }
output "ecr_repository_url" { value = aws_ecr_repository.app.repository_url }
output "ecs_cluster_name" { value = aws_ecs_cluster.main.name }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "vpc_id" { value = aws_vpc.main.id }
