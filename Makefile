.PHONY: dev
dev:
	docker compose -f compose.yaml build --no-cache && docker compose -f compose.yaml up -d

.PHONY: prod
prod:
	docker compose -f compose-prod.yaml build --no-cache && docker compose -f compose-prod.yaml up -d
