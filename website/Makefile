VERSION?="0.3.39"

build:
	@echo "==> Starting build in Docker..."
	@docker run \
		--interactive \
		--rm \
		--tty \
		--volume "$(shell pwd):/website" \
		-e "ENV=production" \
		hashicorp/middleman-hashicorp:${VERSION} \
		bundle exec middleman build --verbose --clean

website:
	@echo "==> Starting website in Docker..."
	@docker run \
		--interactive \
		--rm \
		--tty \
		--publish "4567:4567" \
		--publish "35729:35729" \
		--volume "$(shell pwd):/website" \
		hashicorp/middleman-hashicorp:${VERSION}

test:
	@echo "==> Running website tests..."
	./scripts/test.sh ${VERSION}

.PHONY: build website
