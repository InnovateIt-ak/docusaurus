.PHONY: dev
dev:
	docker compose -f compose.dev.yaml build && docker compose -f compose.dev.yaml up -d --force-recreate
dev-no-cache:
	docker compose -f compose.dev.yaml build --no-cache && docker compose -f compose.dev.yaml up -d --force-recreate
.PHONY: ci
ci:
	docker compose -f compose.ci.yaml build && docker compose -f compose.ci.yaml up -d --force-recreate
ci-no-cache:
	docker compose -f compose.ci.yaml build --no-cache  && docker compose -f compose.ci.yaml up -d --force-recreate
.PHONY: base
base:
	docker compose -f compose.base.yaml build --no-cache && docker compose -f compose.base.yaml up -d --force-recreate