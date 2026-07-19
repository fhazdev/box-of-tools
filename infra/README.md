# Infrastructure (Terraform)

Provisions the Azure resources for Box of Tools:

- A resource group
- An Azure Static Web App (Free tier by default)

The GitHub Actions workflow in [`.github/workflows/azure-static-web-apps.yml`](../.github/workflows/azure-static-web-apps.yml)
handles build & deploy only — it does **not** provision resources. Terraform owns the
infrastructure; the workflow just needs the deployment token produced here.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), logged in:

  ```sh
  az login
  az account set --subscription "<your-subscription-id>"   # if you have several
  ```

## Usage

```sh
cd infra
cp terraform.tfvars.example terraform.tfvars   # then edit values if desired
terraform init
terraform plan
terraform apply
```

## Connecting the deployment token to GitHub Actions

After `terraform apply`, retrieve the (sensitive) deployment token:

```sh
terraform output -raw deployment_token
```

Then in the GitHub repo: **Settings → Secrets and variables → Actions → New repository
secret**, name it `AZURE_STATIC_WEB_APPS_API_TOKEN`, and paste the token as the value.
The next push to `main` will build and deploy the site to the Static Web App. The site's
temporary URL is in the `default_hostname` output.

## Remote state (optional, recommended later)

State is stored locally (`terraform.tfstate`, gitignored) until you set up an Azure
Storage backend. See the commented `backend "azurerm"` block in [`versions.tf`](versions.tf)
for the manual prerequisites (storage account + container) and migration command.

## Notes

- Free tier is only available in a few regions (see `location` in `variables.tf`).
- Custom domain (box-of-tools.com) is a manual/portal step after the first deploy, or can
  be added later with an `azurerm_static_web_app_custom_domain` resource plus DNS records
  at your registrar.
