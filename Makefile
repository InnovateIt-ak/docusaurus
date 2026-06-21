.PHONY: dev
dev:
	docker compose -f compose.yaml build --no-cache && docker compose -f compose.yaml up -d

.PHONY: prod
prod:
	docker compose -f compose-prod.yaml build --no-cache && docker compose -f compose-prod.yaml up -d

# Build the static site and generate build/documentation.pdf with WeasyPrint.
.PHONY: pdf
pdf:
	docker compose -f compose.yaml run --rm --entrypoint sh docusaurus -c "npm install && npm run build"
	docker compose -f compose.yaml --profile pdf build weasyprint
	docker compose -f compose.yaml --profile pdf run --rm --user "$(shell id -u):$(shell id -g)" weasyprint
