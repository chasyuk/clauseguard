build-ClauseGuardFunction:
	npm ci
	npm run build
	npm prune --omit=dev
	cp -R dist assets package.json node_modules "$(ARTIFACTS_DIR)/"
	cp -R ../samples "$(ARTIFACTS_DIR)/samples"
