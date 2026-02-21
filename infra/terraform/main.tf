# ==========================================
# Synapse OS — Terraform 主配置
# Azure 基础设施即代码 (IaC)
#
# 部署到 Azure 的核心资源定义
# 使用方法: terraform init && terraform plan && terraform apply
# ==========================================

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
  }

  # 状态文件存储在 Azure Blob Storage
  # 🔲 待配置: 需要先手动创建 storage account
  # backend "azurerm" {
  #   resource_group_name  = "synapse-terraform-state"
  #   storage_account_name = "synapseterraform"
  #   container_name       = "tfstate"
  #   key                  = "prod.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {}
}

# ==========================================
# 变量
# ==========================================

variable "environment" {
  description = "部署环境 (dev / staging / prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure 区域"
  type        = string
  default     = "eastus"  # 美东 (离东海岸餐厅近)
}

variable "project_name" {
  description = "项目名称"
  type        = string
  default     = "synapse-os"
}

# ==========================================
# 资源组
# ==========================================

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ==========================================
# Azure Kubernetes Service (AKS)
# ==========================================

resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${var.project_name}-${var.environment}"

  default_node_pool {
    name       = "system"
    node_count = var.environment == "prod" ? 3 : 1
    vm_size    = var.environment == "prod" ? "Standard_D4s_v5" : "Standard_B2ms"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = azurerm_resource_group.main.tags
}

# ==========================================
# Azure Database for PostgreSQL
# ==========================================

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "psql-${var.project_name}-${var.environment}"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "16"
  administrator_login    = "synapse_admin"
  administrator_password = var.environment == "dev" ? "DevPassword123!" : null  # Prod 使用 Key Vault
  storage_mb             = var.environment == "prod" ? 65536 : 32768
  sku_name               = var.environment == "prod" ? "GP_Standard_D2ds_v5" : "B_Standard_B1ms"
  zone                   = "1"

  tags = azurerm_resource_group.main.tags
}

resource "azurerm_postgresql_flexible_server_database" "synapse" {
  name      = "synapse_os"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# ==========================================
# Azure Cache for Redis
# ==========================================

resource "azurerm_redis_cache" "main" {
  name                = "redis-${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = var.environment == "prod" ? 1 : 0
  family              = var.environment == "prod" ? "P" : "C"
  sku_name            = var.environment == "prod" ? "Premium" : "Basic"

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }

  tags = azurerm_resource_group.main.tags
}

# ==========================================
# Azure Container Registry
# ==========================================

resource "azurerm_container_registry" "main" {
  name                = "acr${replace(var.project_name, "-", "")}${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = var.environment == "prod" ? "Standard" : "Basic"
  admin_enabled       = true

  tags = azurerm_resource_group.main.tags
}

# ==========================================
# Azure Key Vault (密钥管理)
# ==========================================

resource "azurerm_key_vault" "main" {
  name                = "kv-${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  tags = azurerm_resource_group.main.tags
}

data "azurerm_client_config" "current" {}

# ==========================================
# 输出
# ==========================================

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "acr_login_server" {
  value = azurerm_container_registry.main.login_server
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "redis_hostname" {
  value = azurerm_redis_cache.main.hostname
}
