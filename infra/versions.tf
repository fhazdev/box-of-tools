terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Remote state backend (recommended once you're past experimentation).
  #
  # MANUAL PREREQUISITE: create a storage account + blob container first, e.g.:
  #   az group create -n rg-tfstate -l eastus2
  #   az storage account create -n <globally-unique-name> -g rg-tfstate -l eastus2 --sku Standard_LRS
  #   az storage container create -n tfstate --account-name <globally-unique-name>
  #
  # Then uncomment this block and run: terraform init -migrate-state
  #
  # backend "azurerm" {
  #   resource_group_name  = "rg-tfstate"
  #   storage_account_name = "<globally-unique-name>"
  #   container_name       = "tfstate"
  #   key                  = "box-of-tools.tfstate"
  # }
}
